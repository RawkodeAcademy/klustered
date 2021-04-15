# Kluster 000

## Discovered Symptoms


## Contributing Factors


## Notes from Kluster Breaker

The cluster was broken in three ways. My goal was to break the cluster from different perspectives: workloads, workload management commands (e.g. deploying, deleting, etc.), and fundamental health and operations.

To break it from the workload perspective, I added a template to the CoreDNS Corefile that caused all DNS requests to respond with an NXDOMAIN answer. I added a second template that would answer all DNS requests with a CNAME to google.com.

To break it from the workload management perspective, I added a  misconfigured mutating admission webhook that was configured to apply to all pod creates and deletes _except_ for the etcd pods and with a failure policy of `Fail`. The webhook endpoint did not exist, though, so all pod deletions or creates to anything other than the etcd pod would be denied.

Finally, to break it for the fundamental health and operations, etcd's liveness probe was changed by modifying the path from `/health` to `/healthz`. This would cause the pod to be restarted every 8 failures since `/healthz` doesn't exist and returns a 404. At each restart of etcd, kube-apiserver would be unable to reach etcd until it's startup probe succeeded, so `kubectl` command would fail. After the etcd pod's startup probe succeeded, kube-apiserver would be able to talk to etcd again, and `kubectl` command would work until the etcd pod was restarted due to the liveness probe failures. Rinse and repeat.
