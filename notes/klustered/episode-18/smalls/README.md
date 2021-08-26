# Eric's Klustered breakages:

## Hack 1 - VXLAN nuetering
In a effort to destablize the Cilium VXLAN overlay, I've added an `iptables` entry to dropping all UDP packets from the underlay network on all 3 nodes

```
iptables -A INPUT -p udp -j DROP
```

_Once removed, it still won't work because of a 2nd networking issue..._

---

## Hack 2 - VXLAN still unhappy
In order to keep that VXLAN unstable, I am dumping all of the traffic on the `cilium_vxlan` adapters via `tc` on all 3 nodes

```
tc qdisc add dev cilium_vxlan root netem loss 100%
```

*NOTE: this hack did not persist between the setup and when the episode was recorded.  Need to research `tc` a little more and figure out how what made it go away.*

---

## Hack 3 - Silly website replacement
As a silly annoyance, I've scaled the real `klustered` app to 0 and am running a static pod of my own on each of the worker nodes via the follwoing in `/etc/kubernetes/manifests`.  Since it uses the same `app` label, the `klustered` service will pull it into its endpoints list so even if they scale the real app back up, it will randomly get balanced in.  (I don't expect this be hard to find since I cannot stop the kubelet from suffixing it's name with the node names)

``` yaml
apiVersion: v1
kind: Pod
metadata:
  labels:
    app: klustered
  name: klustered-5fdbdb6478-0bm0z
  namespace: default
spec:
  containers:
  - image: ericsmalling/zombocom:welcome
    imagePullPolicy: Always
    name: klustered-5fdbdb6478-0bm0z
```

Container image content is availabe in this repo under the `zombocom` subdirectory.