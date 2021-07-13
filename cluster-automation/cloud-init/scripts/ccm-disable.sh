#!/usr/bin/env bash
set -e

kubectl --kubeconfig=/etc/kubernetes/admin.conf taint node --all node.cloudprovider.kubernetes.io/uninitialized- || true
