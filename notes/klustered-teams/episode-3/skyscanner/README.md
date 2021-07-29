# Kluster 000

## Discovered Symptoms


## Contributing Factors


## Notes from Kluster Breaker

### APIServer Break

We modified the core `v1.` [apiservice](https://kubernetes.io/docs/tasks/extend-kubernetes/configure-aggregation-layer/#register-apiservice-objects) object to point to the `kubernetes` service in the `default` namespace, resulting in the APIServer being unable to ever successfully talk to the API endpoints it was trying to send the requests to due to failing TLS validation when sending the requests to the public `kubernetes` service endpoint rather than serving them locally. Restarting the APIServer fixed the issue because the built-in aggregator server - which manages aggregation of APIs within Kubernetes - rebuilds this list on startup from the API resources defined within the Kube-APIServer.

Before breaking this, we had only changed `v1.apps` to point to a fake `kubrenetes` (with typo) service in the default namespace. In older versions of Kubernetes, we found that pointing to the real `kubernetes` service worked. It goes to show that there are ways you can apply objects that break your cluster (sometimes beyond repair).

Here is the change that we made to the ApiService:

<details>
  <summary>APIService Diff</summary>

```diff
 apiVersion: apiregistration.k8s.io/v1
 kind: APIService
 metadata:
   labels:
     kube-aggregator.kubernetes.io/automanaged: onstart
   name: v1.
 spec:
   groupPriorityMinimum: 18000
+  service:
+    name: kubernetes
+    namespace: default
   version: v1
   versionPriority: 1
```

</details>

### Cilium/Networking Break

Cilium is able to replace [kube-proxy](https://kubernetes.io/docs/concepts/overview/components/#kube-proxy) when configured correctly, taking over the maintenance of `iptables` rules to allow services within the cluster to be successfully reached. Here we made two changes:

- we updated the Cilium config to use `kube-proxy` without installing it
- we removed the lifecycle related healthchecks from the Cilium Daemonset to enable the new pods to launch successfully and appear to be healthy.

One of the difficult things here is just how many options there are for configuring Cilium due to its power.

### ValidatingAdmissionWebhook

Nothing clever here, we just created a new [ValidatingAdmissionWebhook](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/) for the creation or update of pods which pointed at a random URL and by default its `failurePolicy` was set to fail. This would have blocked the creation of new pods as the klustered deployment was updated if it hadn't already been deleted. For extra potential confusion we pointed the URL to send the payload to `google.com` which returns a `413` error code, potentially leading debuggers to assume an error in etcd.

<details>
  <summary>Validating Webhook Yaml</summary>

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: default.k8s.io
webhooks:
- name: default.k8s.io
  rules:
  - apiGroups:   [""]
    apiVersions: ["v1"]
    operations:  ["CREATE", "UPDATE"]
    resources:   ["pods"]
    scope:       "Namespaced"
  clientConfig:
    url: https://www.google.com
  admissionReviewVersions: ["v1", "v1beta1"]
  sideEffects: None
  timeoutSeconds: 5
```

</details>

### Red Herrings

As one of our hints mentioned, we left a few [red herrings](https://en.wikipedia.org/wiki/Red_herring) lying around to make the experience as realistic as possible.

The first of these was installing [kube-monkey](https://github.com/asobti/kube-monkey) into the cluster, but not configuring it to perform any actions against the cluster.

We also enabled a deprecated (and now removed as of 1.22) kubelet flag called [chaos-chance](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/) documented as "introduce random client errors and latency". The real joy here being that no code has made use of it since [k8s 1.13](https://github.com/kubernetes/kubernetes/pull/68409), and thus it has no effect, but it certainly sounds suspicious.

Finally we created a dummy service and endpoint in the default namespace for `kubrenetes`, but didn't point anything at it, so it had no effect beyond polluting listing of resources.
