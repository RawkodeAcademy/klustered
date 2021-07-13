#!/usr/bin/env bash
CONTROL_PLANE_IP=$(jq -r ".controlPlaneIp" /tmp/customdata.json)
JOIN_TOKEN=$(jq -r ".joinToken" /tmp/customdata.json)

kubeadm join --token $JOIN_TOKEN --discovery-token-unsafe-skip-ca-verification $CONTROL_PLANE_IP:6443
