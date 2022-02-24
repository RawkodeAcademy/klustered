# Klustered Episode 18 - [Carlos Santana](https://twitter.com/csantanapr) Notes

## Hack 1 - NotReady worker nodes

Go to each worker node and stop kubelet
```bash
systemctl stop kubelet
```

- Hints:
    - _Sometimes we start with not being Ready in our nodes_
    - _Kube let it down, it should look up_

## Hack 2 - Remove kube-scheduler

Copy all the static manifest except the kube-scheduler to a new directory, then update the kubelet config to poin to the new location.
```bash
mkdir -p /etc/cubernetes/manifests
cp /etc/kubernetes/manifests/* /etc/cubernetes/manifests/
rm /etc/cubernetes/manifests/kube-scheduler.yaml
sed -i 's#staticPodPath: /etc/kubernetes/manifests#staticPodPath: /etc/cubernetes/manifests#' /var/lib/kubelet/config.yaml
systemctl restart kubelet
```

- Hints:
    - _Missing in action this poor static pod_

## Hack 3 - Taint worker nodes

Taint worker nodes and make them look like something that should be there.
```bash
kubectl taint node csantanapr-worker-1 node-role.kubernetes.io/master='':NoSchedule
kubectl taint node csantanapr-worker-2 node-role.kubernetes.io/master='':NoSchedule
```

- Hints:
    - _Can't land on a node, it might be painted_

## Hack 4 - Network Policy

Create a deny all all network policy, name allow all

```bash
kubectl apply -n default -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-all-ingress
  namespace: default
spec:
  podSelector: {}
  policyTypes:
  - Ingress
EOF
```

- Hints:
    - _Please allow all, do not deny policy_

## Hack 5 - Mutation WebHook


Create an dynamic admission control via mutation webhook, that replaces the `v2` application image with a custom one, instead of David is Carlos dancing.

Prevent from finding out the mutatingwebhookconfiguration exists:

1. Have the webhook call an external URL instead of running a pod or process on the cluster. I used a [knative.dev](https://knative.dev) serverless function in [IBM Cloud Code Engine](https://www.ibm.com/cloud/code-engine). Name it something that looks legit `k8s.io.config`. You can find the code to the mutation webhook here [@csantanapr/image-replacer](https://github.com/csantanapr/image-replacer)

    ```yaml
    apiVersion: admissionregistration.k8s.io/v1
    kind: MutatingWebhookConfiguration
    metadata:
    name: k8s.io.config
    webhooks:
    - name: dev.cloudnativetoolkit
    namespaceSelector:
    rules:
    - apiGroups:   [""]
        apiVersions: ["v1"]
        operations:  ["CREATE"]
        resources:   ["pods"]
        scope:       "Namespaced"
    clientConfig:
        url: https://mutating.<project-id>.eu-gb.codeengine.appdomain.cloud
    ```

2. Replace the `kubectl` with an alias that points to a script `/bin/hmwc` that greps for `mutating` and returns `No resources found` to make look like it came from `kubectl get mutatingwebhooconfiguration` not finding any webhooks.
    ```bash
    #!/usr/bin/env bash

    echo $@ | grep -i -q mutating; if [[ $? -eq 0 ]]; then echo "No resources found"; else command kubectl $@; fi
    ```
3. Store the alias in `/etc/profile` instead of `~/.bashrc`
    ```
    echo "alias kubectl=hmwc" >> /etc/profile
    ```

- Hints:
    - _Oh, I see someone is dancing, the mutants changed the music?_
    - _Those mutants are hard to spot; maybe check under kubectl or bash profile_


Here is [the dance](https://twitter.com/csantanapr/status/1430965933590384640?s=20) when replacing `v2` image
