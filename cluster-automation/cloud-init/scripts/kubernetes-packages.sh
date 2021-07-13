#!/usr/bin/env bash
set -e

KUBERNETES_VERSION=$(jq -r ".kubernetesVersion" /tmp/customdata.json)

TRIMMED_KUBERNETES_VERSION=$(echo ${KUBERNETES_VERSION} | sed 's/\./\\./g' | sed 's/^v//')
RESOLVED_KUBERNETES_VERSION=$(apt-cache policy kubelet | awk -v VERSION=${TRIMMED_KUBERNETES_VERSION} '$1~ VERSION { print $1 }' | head -n1)

apt-get install -y kubelet=${RESOLVED_KUBERNETES_VERSION} kubeadm=${RESOLVED_KUBERNETES_VERSION} kubectl=${RESOLVED_KUBERNETES_VERSION}
apt-mark hold kubelet kubeadm kubectl
