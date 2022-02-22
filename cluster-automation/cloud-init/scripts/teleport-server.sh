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
  public_addr: ${DNS_NAME}:443
  web_listen_addr: ":443"
  listen_addr: 0.0.0.0:3023
  kube_listen_addr: 0.0.0.0:3026
  tunnel_listen_addr: 0.0.0.0:3024
  acme:
    enabled: "yes"
    email: david@rawkode.com
EOCAT

cat >> /etc/teleport.github.yaml <<EOCAT
kind: role
version: v3
metadata:
  name: rawkode
spec:
  allow:
    logins: ['root']
    node_labels:
      '*': '*'
    app_labels:
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
  teams_to_logins:
  - organization: rawkode-academy
    team: klustered
    logins:
    - rawkode
EOCAT

for team in "${teams[@]}"; do
cat >> /etc/teleport.github.yaml <<EOCAT
  - organization: rawkode-academy
    team: klustered-${team}
    logins:
    - ${team}
EOCAT

done


tctl create /etc/teleport.github.yaml
