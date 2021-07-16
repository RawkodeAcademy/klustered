# Kluster 012

## Discovered Symptoms


## Contributing Factors


## Notes from Kluster Breaker

A range of issues here, mostly inspired by things I've seen in production though modified slightly.

### etcd

etcd's default max request bytes is 1.5MiB, lowering it to 512 bytes caused etcd to reject most requests to create or update items sent to it by the API server. The 512 bytes is obviously ludicrously low, causing very obvious failures like on editing deployments however it is entirely possible, especially with custom resources to cause an object passing through the APIServer to reach the default 1.5MiB limit, and thus be rejected by etcd in the same way as we saw here. In addition this helped mask some of the other problems I'd introduced into the cluster until after you'd resolved the problem and components could resume updating the status of objects.

### kubelet

Modified a flag on a node's [kubelet](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet) which explicitly requires an associated feature gate to be enabled without enabling the feature gate, in this case cpu-cfs-quota-period. This causes the kubelet to immediately crash out with very verbose logs that aren't the most obvious to parse. Worth noting here that the [documentation for the kubelet's config](https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/) doesn't call out which flags require feature gates to be enabled to work without crashing the kubelet.

### kube-controller-manager

Disabled the replicaset controller, this means replicasets won't be reconciled between their desired and current state. This may look familiar as the same tactic was taken back in [cluster 006](../006/README.md), however this time I listed all of the available controllers, other than the replicaset one rather than negating it by prefixing it with a `-`. This adds confusion as generally people will look at the deployments and pods before looking at the replicaset in between the other two.

### kube-scheduler

Configured the only [kube-scheduler](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-scheduler/) in the cluster to only perform scheduling for pods looking for `special-scheduler` in their spec, thus ignoring the scheduling of any pods without their spec updated appropriately, which they weren't. Takes advantage of the possibility to [run multiple schedulers in a single cluster](https://kubernetes.io/docs/tasks/extend-kubernetes/configure-multiple-schedulers/), this is really flexible, but can also lead to confusion when the selection of the pods doesn't match with the schedulers running in a cluster.

### DNS

A mea-culpa, I was overly cruel here and could have got the same points across without using a [confusable character](https://www.unicode.org/Public/security/latest/confusables.txt) to break the [coreDNS](https://coredns.io) configuration for cluster local DNS resolution in a non-obvious way.

I broke the in cluster *.cluster.local DNS resolution whilst resolution of DNS entries outside of the cluster still worked by modifying the coreDNS config map which configures the pods and restarting the pods. In this case I only modified the [kubernetes plugin's config](https://coredns.io/plugins/kubernetes/) to make it authoratitive for a domain which would never be queried or resolve to anything, meaning that actual queries for in cluster services, like the kubernetes APIServer service at `kubernetes.default.svc.cluster.local` as well as other in cluster services would be passed by coreDNS to the upstream and return an `NXDOMAIN`. As shown by the range of guesses in the live stream chat about what could have caused DNS to break, there's a range of conditions in cluster, that could have caused the same results, e.g. if I hadn't modified the coreDNS configmap and had instead prevented coreDNS from talking to the APIServer, whether through a network policy, RBAC changes, etc.
