#!/usr/bin/env sh
set -e
PUBLIC_IPv4=$(curl -s https://metadata.platformequinix.com/metadata | jq -r '.network.addresses | map(select(.public==true and .management==true)) | first | .address')

mkdir -p /etc/kubernetes/manifests

  # DaemonSet uses 2112 as HostPort, so control plane needs different number
ctr image pull ghcr.io/kube-vip/kube-vip:v0.4.0
ctr run \
    --rm \
    --net-host \
    ghcr.io/kube-vip/kube-vip:v0.4.0 \
    vip /kube-vip manifest pod \
      --interface lo \
      --address ${PUBLIC_IPv4}} \
      --controlplane \
      --promethuesHTTPServer ":2113" \
      --bgp \
      --peerAS $(jq -r '.bgp_neighbors[0].peer_as' /tmp/metadata.json) \
      --peerAddress $(jq -r '.bgp_neighbors[0].peer_ips[0]' /tmp/metadata.json) \
      --localAS $(jq '.bgp_neighbors[0].customer_as' /tmp/metadata.json) \
      --bgpRouterID $(jq -r '.bgp_neighbors[0].customer_ip' /tmp/metadata.json) | tee /etc/kubernetes/manifests/kube-vip.yaml
