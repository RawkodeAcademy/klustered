#!/usr/bin/env bash
set -e

cat <<EOF > /etc/modules-load.d/containerd.conf
overlay
br_netfilter
EOF

modprobe overlay
modprobe br_netfilter

apt-get install -y ca-certificates socat ebtables apt-transport-https cloud-utils prips containerd

systemctl daemon-reload
systemctl enable containerd
systemctl start containerd
