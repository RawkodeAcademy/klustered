# Klustered Episode 19 - Borko Djurkovic (@borkod)

## Hack 1 - kubectl AppArmor

I created an AppArmor profile for `kubectl`.

To do this:

1. Install `apparmor-utils` (as root):

```
apt-get install apparmor-utils
```
2. Generate a profile:
```
aa-genprof kubectl
```
Select `(F)inish` option.

### Fix

There are a few options for fixing this hack. 

1. One option is to generate a profile using `aa-logprof`
2. Put the profile into complain mode using `aa-complain`
3. Audit the profile using `aa-audit`
4. Disable the profile using `aa-disable`
5. Copy the kubectl binary to a different location and use that binary to access the cluster

## Hack 2 - kube-apiserver restart

I updated kube-apiserver manifest with `--anonymous-auth=false` option. By preventing anonymous authorization, the kube api server healthprobes are unable to access their endpoints and work correctly. As a consequence, it causes the kube api server to restart frequently.

### Fix

Remove the `--anonymous-auth=false` option from the kube-apiserver manifest file.

## Hack 3 - PostgreSQL StatefulSet startupProbe

I created a [startupProbe](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) in the definition of the PostgreSQL statefulSet. The startupProbe used `psql` command to execute an `ALTER` SQL statement to change the password for the postgres user. 

```
startupProbe:
    exec:
    command:
    - /bin/sh
    - -c
    - psql -U postgres -c "ALTER USER postgres PASSWORD 'klustered';"
    failureThreshold: 3
    periodSeconds: 10
    successThreshold: 1
    timeoutSeconds: 1
```
### Fix

To fix this hack, simply remove the startupProbe and restart the pod.

## Hack 4 - ETCD Encryption

For this hack, I configured [etcd encryption](https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/) using the configuration:

```
kind: EncryptionConfiguration
resources:
  - resources:
    - configmaps
    providers:
    - aescbc:
        keys:
        - name: key1
          secret: a2x1c3RlcmVkMDEyMzQ1Ng==
```

I purposefully did not include the identity provider in the configuration. This makes any un-encrypted configmaps unaccessible.

To do this, add `--encryption-provider-config=/tmp/ec/ec.yaml` to the kube-apiserver manifest file (where `/tmp/ec/ec.yaml` is the location of the encryption configuration).

It is also necessary to add a volume and volume mount to the manifest file:

volume:
```
- hostPath:
    path: /tmp/ec
    type: DirectoryOrCreate
name: ec-config
```

volumeMount:
```
- mountPath: /tmp/ec
    name: ec-config
    readOnly: true
```

Then I recreated configmaps in all namespaces *except* the default namespace (where the application pods are located):
```
kubectl get cm -n ambassador -o json | kubectl replace -f -
kubectl get cm -n kube-node-lease -o json | kubectl replace -f -
kubectl get cm -n kube-public -o json | kubectl replace -f -
kubectl get cm -n kube-system -o json | kubectl replace -f -
kubectl get cm -n teleport -o json | kubectl replace -f -
```

The rationale here was:
- When Hack 3 is fixed, it will require recreation of the postgresql-0 pod. This pod uses a configmap which is *not encrypted* since it is in the default namespace.  However, since the identity provider is missing in the encryption configuration, api server will not be able to retrieve the config map contents and pod creation will fail.
- If the encryption configuration was removed from the kube-apiserver manifest file, then the control plane components in kube-system will fail since their configmaps are encrypted

### Fix
Simplest fix is to add identity provider in the encryption configuration:
```
kind: EncryptionConfiguration
resources:
  - resources:
    - configmaps
    providers:
    - aescbc:
        keys:
        - name: key1
          secret: a2x1c3RlcmVkMDEyMzQ1Ng==
    - identity: {}
```

Another option is to recreate the two un-encrypted configmaps in the default namespace. As they are being recreated, they would be encrypted using the encryption configuration.