# Kluster 014

## Discovered Symptoms


## Contributing Factors

### Kube-System Daemonsets
- change nodeselector from CNI
  - `kubectl -n cilium edit daemonsets cilium`
    ```yaml
    nodeSelector:
      kubernetes.io/hostname: kluster-014-control-plane-wprkz
    ```

- removed privileged from kube-proxy daemonset
  - `kubectl -n kube-system edit daemonsets kube-proxy`

### Kyverno - distraction

- installed kyverno
  - `kubectl replace -f https://raw.githubusercontent.com/kyverno/kyverno/main/definitions/release/install.yaml`
- added cluster policy `kubectl apply -f kyverno/policy.yaml`

### PSPs last shine

- apply PSP
    ```bash
    kubectl apply -f psp/psp.yaml
    kubectl apply -f psp/psp-cr.yaml
    kubectl apply -f psp/psp-rb.yaml
    ```
- added Addmissionplugin `podSecurityPolicy` to the API Server

### Scheduler & Controller Manager fake Pods

- added `- --allow-privileged=false` to API & restart API Server
- restarted scheduler as the static pods get blocked from our PSP and from the API server
- add privileged true to controller manger & restart controller manager
    ```yaml
    securityContext:
      privileged: true
    ```
- deployed fake scheduler & controller pods with nodeSelector & Tolerations
    ```bash
    kubectl apply -f pods/scheduler.yaml
    kubectl apply -f pods/controller.yaml
    ```
### RBAC

- edited RBAC for the Scheduler `kubectl edit clusterrole system:kube-scheduler -oyaml`
  - removed `list` `get` `watch` verbs from pods & nodes

### Kubelet MaxPods

- edited /var/lib/kubelet/config.yaml or vim /etc/kubernetes/kubelet.conf (depends if controlplane or node)
  ```bash
  # i got 99 problems but more pods aint 1
  maxPods: 15
  # restart kubelet
  systemctl daemon-reload
  service kubelet restart
  ```

## Notes from Kluster Breaker

- as a nice side effect to API server was responding but there was no pod running :)
