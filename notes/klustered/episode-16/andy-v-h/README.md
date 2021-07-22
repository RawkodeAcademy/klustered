# klustered  0017

## Goals

* Simulate a readonly filesystem.
* Break the DNS chain from host to pod

### Steps to break

#### Workers

1. Mess up kubelet DNS settings, this makes pod DNS useless. Change `clusterDNS[0]` in `/var/lib/kubelet/config.yaml`

#### Control plane

1. Replace `kubectl` for the lolz and confusion.
1. Break the cni by enabling BGP without configs ready ( conflicting with kube-vip). Enabled via ConfigMap
1. Inject a malicious kube-apiserver via DNS injection into /etc/hosts. This `kube-apiserver` has code to delete any key you insert. Run `echo 127.0.0.1 k8s.gcr.io >> /etc/hosts`
1. Delete the `.` from the `coreDNS` `forward` plugin, this breaks `coreDNS`. It is a syntax error that break DNS resolution and the Poc won't start
1. Edit the `kube-apiserver.yaml` to pull from my repository. 

## Results

1. Realized the `kubectl` wasn't `kubectl` because output was very much wrong.
1. Found `kubelet` couldn't "find node 'control-plane-01'"
1. `containerd` was complaining about tls errors to `k8s.cro.io`
1. Networking stopped working
1. The `kube-apiserver` wouldn't start
1. restart required
1. networking restored
1. host DNS restored
1. Once `kube-apiserver` was up the entire DNS chain for pod -> host -> world was broken and needed fixing
1. Compare cilium configs to known good.
1. Restore coreDNS configs
1. Fix pod DNS via kubelet config.
