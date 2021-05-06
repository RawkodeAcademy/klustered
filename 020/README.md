# Kluster 020 - honk' n' rick roll

## Issues

* `kubectl` commands returns api server was unavailable or was it really?
* The `klustered` deployment was unable to talk to the database
* The `klustered` deployment was running with a `nevergonnagiveyouup` container image and all updates to the deployment to use the right image were getting modified
* `UPDATE` operations to deployments in the `default` namespace was getting denied
* `crictl --runtime-endpoint unix:///var/run/containerd/containerd.sock ps` shows a honk pod, that doesn't show when `kubectl get pods --all-namespaces` is run
* The nodes fail to pull `ghcr.io/rawkode/klustered` container images
* `kubectl` *exec/port-forward* commands was timing out

## Breaker notes

*It was always about misdirections*

Scenarios One to Five were done on the control-plane nodes. Scenario Two, Six and Seven were applied on all worker nodes.

### Scenario One

What fun is it without having some rick-roll and misdirection when running `kubectl`, so the `kubectl` binary was replaced with a fun script and the original binary renamed to `honkctl`

What fun is there without some honk?

The below command/script was run to achieve this effect:

```bash
mv /usr/bin/kubectl /usr/bin/honkctl

mkdir -p /.honk
echo "0" > /.honk/counter

cat <<EOF > /usr/bin/kubectl
#!/bin/bash

COUNT=\$(cat /.honk/counter)

if [[ "\${COUNT}" -eq 3 ]]; then
    curl -SL "http://keroserene.net/lol/astley80.full.bz2" | bunzip2 -d
    echo "0" > /.honk/counter
else
    API_SERVER=\$(awk '/server: /{print $2; exit}' /etc/kubernetes/admin.conf)

    echo -ne "The connection to the server \${API_SERVER} was refused - did you specify the right host or port?\n"

    COUNT=\$((COUNT+1))

    echo "\${COUNT}" > /.honk/counter
fi
EOF

chmod +x /usr/bin/kubectl
```

### Scenario Two

*IT WAS ALWAYS DNS*, it's mandatory to have a DNS issue in the CNCF ecosystem :P
 
The CoreDNS depoyment was patched to use a hostpath file for DNS config. The `coredns` configmap was not updated to provide some misdirection as it was the obvious place to look.

The below command/script was run to achieve this effect:

```bash
mkdir -p /etc/dns/.goose

cat <<EOF > /etc/dns/.goose/Corefile
.:53 {
    errors
    health {
        lameduck 5s
    }
    ready
    template IN ANY postgres.default.svc.cluster.local {
        rcode NXDOMAIN
    }
    kubernetes cluster.local in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
        ttl 30
    }
    prometheus :9153
    forward . /etc/resolv.conf {
        max_concurrent 1000
    }
    cache 30
    loop
    reload
    loadbalance
}
EOF

export KUBECONFIG=/etc/kubernetes/admin.conf

honkctl --namespace kube-system get deployments.apps coredns --output yaml > /etc/dns/coredns.yaml

honkctl --namespace kube-system \
    patch deployments.apps coredns \
    --type json \
    --patch '[{"op": "replace", "path":"/spec/template/spec/containers/0/args/1", "value":"/etc/dns/.goose/Corefile"}, {"op": "add", "path": "/spec/template/spec/containers/0/volumeMounts/1", "value": {"mountPath": "/etc/dns/.goose", "name": "coredns-honk"}}, {"op": "add", "path": "/spec/template/spec/volumes/1", "value": {hostPath: {"path": "/etc/dns/.goose"}, "name": "coredns-honk"}}]'
```

### Scenario Three

Mutating and Validating webhooks were enabled on the API server, to update the image set for a Kubernetes deployment when the container name matched `klustered` to a rick-roll image. The code for the mutating webhook is in the [klustered-h0nk](klustered-h0nk) folder

In order to throw the fixers off the hook, the original file time stamps were restored using `touch -d` :evil

The below command/script was run to achieve this effect:

```bash
export KUBECONFIG=/etc/kubernetes/admin.conf

ORIGINAL_FILE_DATE=$(ls -l /etc/kubernetes/manifests/kube-apiserver.yaml | awk '{ print $6,$7,$8 }')

sed -i 's/--enable-admission-plugins=NodeRestriction/--enable-admission-plugins=NodeRestriction,MutatingAdmissionWebhook,ValidatingAdmissionWebhook/g' /etc/kubernetes/manifests/kube-apiserver.yaml

cat <<EOF | honkctl apply -f -
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: honk
  labels:
    app: honk
webhooks:
  - name: klustered.frezbo.dev
    clientConfig:
      url: https://klustered.frezbo.dev/mutate
      caBundle: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUVaVENDQTAyZ0F3SUJBZ0lRUUFGMUJJTVVwTWdoaklTcERCYk4zekFOQmdrcWhraUc5dzBCQVFzRkFEQS8KTVNRd0lnWURWUVFLRXh0RWFXZHBkR0ZzSUZOcFoyNWhkSFZ5WlNCVWNuVnpkQ0JEYnk0eEZ6QVZCZ05WQkFNVApEa1JUVkNCU2IyOTBJRU5CSUZnek1CNFhEVEl3TVRBd056RTVNakUwTUZvWERUSXhNRGt5T1RFNU1qRTBNRm93Ck1qRUxNQWtHQTFVRUJoTUNWVk14RmpBVUJnTlZCQW9URFV4bGRDZHpJRVZ1WTNKNWNIUXhDekFKQmdOVkJBTVQKQWxJek1JSUJJakFOQmdrcWhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0NBUUVBdXdJVktNejJvSlRURHhMcwpqVldTdy9pQzhabW1la0tJcDEwbXFyVXJ1Y1ZNc2ErT2EvbDF5S1BYRDBlVUZGVTFWNHllcUtJNUdmV0NQRUtwClRtNzFPOE11MjQzQXNGenpXVGpuN2M5cDhGb0xHNzdBbENRbGgvbzNjYk1UNXh5czRadnYyK1E3UlZKRmxxbkIKVTg0MHlGTHV0YTd0ajk1Z2NPS2xWS3UyYlE2WHBVQTBheXZUdkdiclpqUjgrbXVMajFjcG1mZ3dGMTI2Y20vNwpnY1d0MG9aWVBSZkg1d203OFN2M2h0ekIybkZkMUVianpLMGx3WWk4WUdkMVpyUHhHUGVpWE9aVC96cUl0a2VsCi94TVk2cGdKZHorZFUvblBBZVgxcG5BWEZLOWpwUCtaczVPZDNGT25CdjVJaFIyaGFhNGxkYnNUekZJRDllMVIKb1l2YkZRSURBUUFCbzRJQmFEQ0NBV1F3RWdZRFZSMFRBUUgvQkFnd0JnRUIvd0lCQURBT0JnTlZIUThCQWY4RQpCQU1DQVlZd1N3WUlLd1lCQlFVSEFRRUVQekE5TURzR0NDc0dBUVVGQnpBQ2hpOW9kSFJ3T2k4dllYQndjeTVwClpHVnVkSEoxYzNRdVkyOXRMM0p2YjNSekwyUnpkSEp2YjNSallYZ3pMbkEzWXpBZkJnTlZIU01FR0RBV2dCVEUKcDdHa2V5eHgrdHZoUzVCMS84UVZZSVdKRURCVUJnTlZIU0FFVFRCTE1BZ0dCbWVCREFFQ0FUQS9CZ3NyQmdFRQpBWUxmRXdFQkFUQXdNQzRHQ0NzR0FRVUZCd0lCRmlKb2RIUndPaTh2WTNCekxuSnZiM1F0ZURFdWJHVjBjMlZ1ClkzSjVjSFF1YjNKbk1Ed0dBMVVkSHdRMU1ETXdNYUF2b0MyR0syaDBkSEE2THk5amNtd3VhV1JsYm5SeWRYTjAKTG1OdmJTOUVVMVJTVDA5VVEwRllNME5TVEM1amNtd3dIUVlEVlIwT0JCWUVGQlF1c3hlM1dGYkxybEFKUU9ZZgpyNTJMRk1MR01CMEdBMVVkSlFRV01CUUdDQ3NHQVFVRkJ3TUJCZ2dyQmdFRkJRY0RBakFOQmdrcWhraUc5dzBCCkFRc0ZBQU9DQVFFQTJVemd5ZldFaURjeDI3c1Q0clA4aTJ0aUVteFl0MGwrUEFLM3FCOG9ZZXZPNEM1ejcwa0gKZWpXRUh4MnRhUERZL2xhQkwyMS9XS1p1TlRZUUhIUEQ1YjF0WGdIWGJuTDdLcUM0MDFkazVWdkNhZFRRc3ZkOApTOE1Yam9oeWM5ejkvRzI5NDhrTGptRTZGbGg5ZERZclZZQTl4Mk8raEVQR09hRU9hMWVlUHluQmdQYXl2VWZMCnFqQnN0ekxoV1ZRTEdBa1hYbU5zKzVablBCeHpESk9MeGhGMkpJYmVRQWNINUgwdFpyVWxvNVpZeU9xQTdzOXAKTzViODVvM0FNL09KK0NrdEZCUXRmdkJoY0pWZDl3dmx3UHNrK3V5T3kySEk3bU54S0tnc0JUdDM3NXRlQTJUdwpVZEhraFZOY3NBS1gxSDdHTk5MT0VBRGtzZDg2d3VvWHZnPT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQ==
    rules:
      - operations: ["CREATE", "UPDATE"]
        apiGroups: ["apps"]
        apiVersions: ["v1"]
        resources: ["deployments"]
    admissionReviewVersions: ["v1", "v1beta1"]
    sideEffects: None
    timeoutSeconds: 5
    reinvocationPolicy: Never
    failurePolicy: Fail
    namespaceSelector:
      matchLabels:
        honk: enabled
EOF

honkctl label namespace default honk=enabled
honkctl set image \
    deployments klustered \
    klustered=ghcr.io/rawkode/klustered:v2

ORIGINAL_FILE_DATE=$(ls -l /var/lib/kubelet/config.yaml | awk '{ print $6,$7,$8 }')
```

### Scenario Four

After the scenario three is created, in-order to create some misdirection and weird error messages the `admissionregistration.k8s.io/v1` API was disabled. The Mutating and Validating API's are part of `admissionregistration.k8s.io/v1`, so even though the API is enabled, it's also disabled at the same time, so update operations to the Kubernetes API would time out and throw an error.

The below command/script was run to achieve this effect:

```bash
ORIGINAL_FILE_DATE=$(ls -l /etc/kubernetes/manifests/kube-apiserver.yaml | awk '{ print $6,$7,$8 }')

sed -i '/--tls-private-key-file/a\    - --runtime-config=admissionregistration.k8s.io/v1=false' /etc/kubernetes/manifests/kube-apiserver.yaml

touch -d "${ORIGINAL_FILE_DATE}" /etc/kubernetes/manifests/kube-apiserver.yaml
```

### Scenario Five

A static pod named `honk` was created by updating the `kubelet` configuration to use a `staticPodURL`. A static pod manifest was not used for little debugging and misdirection

```bash
ORIGINAL_FILE_DATE=$(ls -l /var/lib/kubelet/config.yaml | awk '{ print $6,$7,$8 }')

sed -i '/volumeStatsAggPeriod: 0s/astaticPodURL: https://gist.githubusercontent.com/frezbo/d9240d48b9f7cb6ba1aca5a21f9fc79d/raw/b679abc1efcddf2cd20f5fab09d29234829916eb/klustered' /var/lib/kubelet/config.yaml

systemctl restart kubelet

touch -d "${ORIGINAL_FILE_DATE}" /var/lib/kubelet/config.yaml
```

### Scenario Six

Containerd v1.5 came out with a feature to set per registry permissions. The registries could be blocked or only partial permissions could be applied. Check out the v1.5 [release notes](https://github.com/containerd/containerd/releases/tag/v1.5.0)

The below command/script was run to achieve this effect:

```bash
ORIGINAL_FILE_DATE=$(ls -l /usr/bin/containerd | awk '{ print $6,$7,$8 }')

curl -fsSL "https://github.com/containerd/containerd/releases/download/v1.5.0/containerd-1.5.0-linux-amd64.tar.gz" | tar xzf - --strip-components=1 -C /usr/bin/

containerd --version

mkdir -p /etc/containerd/certs.d/ghcr.io/

cat <<EOF > /etc/containerd/certs.d/ghcr.io/hosts.toml
server = "https://ghcr.io/rawkode"

[host."https://ghcr.io/v2"]
  capabilities = ["resolve"]

EOF

cat <<EOF > /etc/containerd/config.toml
version = 2

[plugins."io.containerd.grpc.v1.cri".registry]
    config_path = "/etc/containerd/certs.d"

EOF

systemctl restart containerd

touch -d "${ORIGINAL_FILE_DATE}" /usr/bin/containerd
touch -d "${ORIGINAL_FILE_DATE}" /usr/bin/containerd-shim
touch -d "${ORIGINAL_FILE_DATE}" /usr/bin/containerd-shim-runc-v1
touch -d "${ORIGINAL_FILE_DATE}" /usr/bin/containerd-shim-runc-v2
touch -d "${ORIGINAL_FILE_DATE}" /usr/bin/ctr

crictl --runtime-endpoint unix:///var/run/containerd/containerd.sock ps
```

### Scenario Seven

Kubectl `exec/port-forward` commands were timing out. Kubelet requires port `10250` to be open to for these commands to work. Watch out [Darren Shepherd](https://www.youtube.com/watch?v=8u7KFlte1vQ)'s talk here to learn more

The below command/script was run to achieve this effect:

```bash
iptables -I INPUT \
    -m state \
    --state new \
    -p tcp \
    --dport 10250 \
    \! -s 127.0.0.1 \
    -j DROP

systemctl restart kubelet
```
