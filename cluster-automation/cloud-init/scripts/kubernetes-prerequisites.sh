#!/usr/bin/env bash
set -e

sed -ri '/\sswap\s/s/^#?/#/' /etc/fstab
swapoff -a
mount -a

cat <<EOF > /etc/sysctl.d/99-kubernetes-cri.conf
net.bridge.bridge-nf-call-iptables  = 1
net.ipv4.ip_forward                 = 1
net.bridge.bridge-nf-call-ip6tables = 1
EOF
sysctl --system
