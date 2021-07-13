#!/usr/bin/env bash
CONTROL_PLANE_IP=$(jq -r ".controlPlaneIp" /tmp/customdata.json)
DNS_NAME=$(jq -r ".dnsName" /tmp/customdata.json)
TELEPORT_SECRET=$(jq -r ".teleportSecret" /tmp/customdata.json)

cat > /etc/teleport.yaml <<EOCAT
teleport:
  data_dir: /var/lib/teleport
auth_service:
  enabled: true
  listen_addr: 0.0.0.0:3025
  cluster_name: ${DNS_NAME}
  tokens:
    - proxy,node,app:${TELEPORT_SECRET}
ssh_service:
  enabled: true
app_service:
  enabled: true
  debug_app: true
proxy_service:
  enabled: true
  public_addr: ${DNS_NAME}:443
  web_listen_addr: 443
  listen_addr: 0.0.0.0:3023
  kube_listen_addr: 0.0.0.0:3026
  tunnel_listen_addr: 0.0.0.0:3024
  acme:
    enabled: "yes"
    email: david@rawkode.com
EOCAT
