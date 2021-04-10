# Kluster 000

## Discovered Symptoms


## Contributing Factors


## Notes from Kluster Breaker

Cilium offers a really awesome capability for performing host firewall management, called `CiliumClusterwideNetworkPolicy` - these policies have `entities` defined in them, which, if not configured properly, can have destructive results on a Kubernetes cluster. I employed the use of these policies for my first layer of breakage. Here is the policy I used:

```yaml

apiVersion: cilium.io/v2
kind: CiliumClusterwideNetworkPolicy
metadata:
  name: klustered-egress
spec:
  nodeSelector: {}
  egress:
    - toEntities:
      - world
---
apiVersion: cilium.io/v2
kind: CiliumClusterwideNetworkPolicy
metadata:
  name: klustered-ingress
spec:
  nodeSelector: {}
  ingress:
    - fromEntities:
      - world
```
These policies are in effect saying:
- policy applies to all nodes in the cluster (empty selector defined)
- only allow ingress transit from the world to the host
- only allow egress traffic to the world

The issue this policy creates is that there is a specific entity definition for `hosts` and `cluster`, which are not included in `world`. This means that transit can't effectively hit the Kubernetes API server. Within the Cilium ConfigMap, I disabled hubble (can't give them a traffic visualization tool!) as well as changing a few other CIDR mappings to trip up the debugging.

For some extra fun, I added a network policy to each Kubernetes namespace, so the network fun-times were at both the pod network and host network layer.

```yaml
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: ""
spec:
  endpointSelector:
    matchLabels:
      role: restricted
  egress:
  - {}
  ingress:
  - fromEndpoints:
    - matchLabels:
        role: lulz
```

The intent of this policy was to basically make it so from each namespace traffic might appear "normal" but that it couldn't egress to other namespaces (not sure if it had the desired effect as by the time they got to these policies, they were in "burn everything we're finding Matt may have made").

Last but not least, I decided to change the port mappings of the Kubernetes service, coreDNS service, and the klustered application deployment service. The hope being... even after the policies may have been discovered or removed, I'd create symptoms of "network problems" to keep them hunting in the wrong direction :)

Cheers!
