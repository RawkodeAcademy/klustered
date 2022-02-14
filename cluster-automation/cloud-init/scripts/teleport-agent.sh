#!/usr/bin/env bash
CLUSTER_NAME=$(jq -r ".clusterName" /tmp/customdata.json)
TELEPORT_SECRET=$(jq -r ".teleportSecret" /tmp/customdata.json)
TELEPORT_URL=$(jq -r ".teleportUrl" /tmp/customdata.json)

cat > /etc/teleport.yaml <<EOCAT
auth_service:
  enabled: false

proxy_service:
  enabled: false

ssh_service:
  enabled: true
  labels:
    team: ${CLUSTER_NAME}

teleport:
  auth_token: "${TELEPORT_SECRET}"
  auth_servers:
    - "${TELEPORT_URL}:3025"
EOCAT
