#!/usr/bin/env bash
DNS_NAME=$(jq -r ".dnsName" /tmp/customdata.json)
JOIN_TOKEN=$(jq -r ".joinToken" /tmp/customdata.json)

kubeadm join --token ${JOIN_TOKEN} --discovery-token-unsafe-skip-ca-verification ${DNS_NAME}:6443
