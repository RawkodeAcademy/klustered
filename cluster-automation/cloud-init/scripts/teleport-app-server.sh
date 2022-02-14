#!/usr/bin/env bash
TELEPORT_SECRET=$(jq -r ".teleportSecret" /tmp/customdata.json)
TELEPORT_URL=$(jq -r ".teleportUrl" /tmp/customdata.json)

cat >> /etc/teleport.yaml <<EOCAT
app_service:
  enabled: true
  debug_app: true
  apps:
  - name: "klustered"
    uri: "http://localhost:30000"
EOCAT

systemctl restart teleport
