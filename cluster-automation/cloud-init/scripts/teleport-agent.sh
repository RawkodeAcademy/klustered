#!/usr/bin/env bash
CONTROL_PLANE_IP=$(jq -r ".controlPlaneIp" /tmp/customdata.json)
TELEPORT_SECRET=$(jq -r ".teleportSecret" /tmp/customdata.json)

cat > /etc/teleport.yaml <<EOCAT
auth_service:
  enabled: false

proxy_service:
  enabled: false

ssh_service:
  enabled: true

teleport:
  auth_token: "${TELEPORT_SECRET}"
  auth_servers:
    - "${CONTROL_PLANE_IP}:3025"
EOCAT
