#!/usr/bin/env bash
#!/usr/bin/env sh
set -e
INGRESS_IP=$(jq -r ".ingressIp" /tmp/customdata.json)

ctr image pull ghcr.io/kube-vip/kube-vip:latest
ctr run \
    --rm \
    --net-host \
    ghcr.io/kube-vip/kube-vip:latest \
    vip /kube-vip manifest daemonset \
      --interface lo\
      --services \
      --taint \
      --bgp \
      --peerAS $(jq -r '.bgp_neighbors[0].peer_as' /tmp/metadata.json) \
      --peerAddress $(jq -r '.bgp_neighbors[0].peer_ips[0]' /tmp/metadata.json) \
      --localAS $(jq '.bgp_neighbors[0].customer_as' /tmp/metadata.json) \
      --bgpRouterID $(jq -r '.bgp_neighbors[0].customer_ip' /tmp/metadata.json) | kubectl --kubeconfig=/etc/kubernetes/admin.conf apply -f -
