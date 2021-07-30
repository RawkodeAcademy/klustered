# Kluster 000

## Discovered Symptoms

## Contributing Factors

## Notes from Kluster Breaker

- We added a mutating admission webhook that changes all image name tags from v2 to v1. Everytime a user would goes to upgrade an image from version 1 to version 2, the update would be reverted. One way to have fixed this is to delete mutatingwebhookconfigurations with `kubectl delete mutatingwebhookconfigurations`.

- Changed "-----END RSA PRIVATE KEY-----" to "-----END R5A PRIVATE KEY-----" at the bottom of the kube-apiserver.key file. This will cause an issue with the certificate and prevent the api server from running properly. Renewing the certs will fix this: `kubeadm certs renew all`.

- Etcd's liveness probe was changed by modifying the path from `/health` to `/healthz`. This would cause the pod to be restarted every 8 failures since `/healthz` doesn't exist and returns a 404. At each restart of etcd, kube-apiserver would be unable to reach etcd until it's startup probe succeeded, so `kubectl` command would fail. After the etcd pod's startup probe succeeded, kube-apiserver would be able to talk to etcd again, and `kubectl` command would work until the etcd pod was restarted due to the liveness probe failures. Rinse and repeat. 
