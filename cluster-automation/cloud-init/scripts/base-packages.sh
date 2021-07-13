#!/usr/bin/env bash
set -e

curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -
echo "deb https://apt.kubernetes.io/ kubernetes-xenial main" > /etc/apt/sources.list.d/kubernetes.list

apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y apt-transport-https
