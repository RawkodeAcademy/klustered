# Part 1

Create a broken config and backup old one

```sh
cp /etc/kubernetes/admin.conf /etc/kubernetes/.admin.conf
# create fake admin.conf
kubectl create sa cluster-admin
# install krew
(
  set -x; cd "$(mktemp -d)" &&
  OS="$(uname | tr '[:upper:]' '[:lower:]')" &&
  ARCH="$(uname -m | sed -e 's/x86_64/amd64/' -e 's/\(arm\)\(64\)\?.*/\1\2/' -e 's/aarch64$/arm64/')" &&
  curl -fsSLO "https://github.com/kubernetes-sigs/krew/releases/latest/download/krew.tar.gz" &&
  tar zxvf krew.tar.gz &&
  KREW=./krew-"${OS}_${ARCH}" &&
  "$KREW" install krew
)
export PATH="${KREW_ROOT:-$HOME/.krew}/bin:$PATH"
# install krew plugin
kubectl krew install view-serviceaccount-kubeconfig
# create service account
kubectl view-serviceaccount-kubeconfig cluster-admin > /etc/kubernetes/admin.conf
```

# Part 2

Add `-replicaset,-deployment,-statefulset` to --controllers= in controller manager

# Part 3

Add the `--enable-admission-plugins=PodSecurityPolicy` flag to kube-apiserver

```sh
kubectl delete pod --all -n default
```

# Part 4

```sh
kubectl taint nodes carta-worker-1 klustered=klustered:NoSchedule
kubectl taint nodes carta-worker-2 klustered=klustered:NoSchedule
```

# Part 5

Add `nodeSelector: {app: klustered}` to klustered deployment

# Part 6

Add network policy to block ingress from outside world (breaks NodePorts and Teleport tunnel)

```sh
cat <<EOF | kubectl apply -f -
apiVersion: "cilium.io/v2"
kind: CiliumClusterwideNetworkPolicy
metadata:
  name: "external-lockdown"
spec:
  endpointSelector:
    matchLabels:
      app: klustered
  ingressDeny:
  - fromEntities:
    - "world"
EOF
```

# Part 7

Add misspelled scheduler to postgres statefulset
