#!/usr/bin/env sh
set -e
CONTROL_PLANE_IP=$(jq -r ".controlPlaneIp" /tmp/customdata.json)

mkdir -p /etc/kubernetes/manifests

ctr image pull ghcr.io/kube-vip/kube-vip:latest
ctr run \
    --rm \
    --net-host \
    ghcr.io/kube-vip/kube-vip:latest \
    vip /kube-vip manifest pod \
      --interface lo \
      --address $CONTROL_PLANE_IP \
      --controlplane \
      --bgp \
      --peerAS $(jq -r '.bgp_neighbors[0].peer_as' /tmp/metadata.json) \
      --peerAddress $(jq -r '.bgp_neighbors[0].peer_ips[0]' /tmp/metadata.json) \
      --localAS $(jq '.bgp_neighbors[0].customer_as' /tmp/metadata.json) \
      --bgpRouterID $(jq -r '.bgp_neighbors[0].customer_ip' /tmp/metadata.json) | tee /etc/kubernetes/manifests/kube-vip.yaml
