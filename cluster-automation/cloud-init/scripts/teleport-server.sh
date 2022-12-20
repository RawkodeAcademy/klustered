#!/usr/bin/env bash
set -e

DNS_NAME=$(jq -r ".dnsName" /tmp/customdata.json)
TELEPORT_SECRET=$(jq -r ".teleportSecret" /tmp/customdata.json)
GITHUB_CLIENT_ID=$(jq -r ".githubClientId" /tmp/customdata.json)
GITHUB_CLIENT_SECRET=$(jq -r ".githubClientSecret" /tmp/customdata.json)
TEAMS=$(jq -r ".teams" /tmp/customdata.json)

IFS=,
teams=( ${TEAMS} )

cat > /etc/teleport.yaml <<EOCAT
teleport:
  data_dir: /var/lib/teleport

auth_service:
  enabled: true
  proxy_listener_mode: multiplex
  authentication:
    type: github
  listen_addr: 0.0.0.0:3025
  cluster_name: ${DNS_NAME}
  tokens:
    - proxy,node,app:${TELEPORT_SECRET}

ssh_service:
  enabled: true

proxy_service:
  enabled: true
  web_listen_addr: ":443"
  public_addr: ${DNS_NAME}:443
  acme:
    enabled: "yes"
    email: david@rawkode.academy
EOCAT

cat >> /etc/teleport.github.yaml <<EOCAT
kind: role
version: v5
metadata:
  name: rawkode
spec:
  allow:
    join_sessions:
    - name: join
      roles: ['*']
      kinds: ['*']
      modes: ['moderator', 'peer', 'observer']
    app_labels:
      '*': '*'
    db_labels:
      '*': '*'
    kubernetes_labels:
      '*': '*'
    logins:
    - root
    node_labels:
      '*': '*'
EOCAT

for team in "${teams[@]}"; do
cat >> /etc/teleport.github.yaml <<EOCAT
---
kind: role
version: v3
metadata:
  name: ${team}
spec:
  allow:
    logins: ['root']
    node_labels:
      'team': '${team}'
    app_labels:
      'team': '${team}'
    join_sessions:
    - name: join
      roles: ['*']
      kinds: ['*']
      modes: ['observer', 'peer']
EOCAT
done

cat >> /etc/teleport.github.yaml <<EOCAT
---
kind: github
version: v3
metadata:
  name: github
spec:
  client_id: ${GITHUB_CLIENT_ID}
  client_secret: ${GITHUB_CLIENT_SECRET}
  display: Github
  redirect_url: https://${DNS_NAME}/v1/webapi/github/callback
  teams_to_roles:
  - organization: RawkodeAcademy
    team: klustered
    roles:
    - access
    - editor
    - auditor
    - rawkode
EOCAT

for team in "${teams[@]}"; do
cat >> /etc/teleport.github.yaml <<EOCAT
  - organization: RawkodeAcademy
    team: klustered-${team}
    roles:
    - ${team}
EOCAT

done

systemctl enable teleport && systemctl start teleport

sleep 10

tctl create /etc/teleport.github.yaml
