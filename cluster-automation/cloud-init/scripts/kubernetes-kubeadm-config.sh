#!/usr/bin/env bash
set -e

KUBERNETES_VERSION=$(jq -r ".kubernetesVersion" /tmp/customdata.json)
JOIN_TOKEN=$(jq -r ".joinToken" /tmp/customdata.json)
CONTROL_PLANE_IP=$(jq -r ".controlPlaneIp" /tmp/customdata.json)
PRIVATE_IPv4=$(curl -s https://metadata.platformequinix.com/metadata | jq -r '.network.addresses | map(select(.public==false and .management==true)) | first | .address')

echo "KUBELET_EXTRA_ARGS=--node-ip=${PRIVATE_IPv4} --address=${PRIVATE_IPv4}" > /etc/default/kubelet

cat > /etc/kubernetes/init.yaml <<EOF
apiVersion: kubeadm.k8s.io/v1beta2
kind: ClusterConfiguration
controlPlaneEndpoint: ${CONTROL_PLANE_IP}:6443
kubernetesVersion: ${KUBERNETES_VERSION}
apiServer:
  extraArgs:
    bind-address: 0.0.0.0
  timeoutForControlPlane: 4m0s
controllerManager:
  extraArgs:
    bind-address: ${PRIVATE_IPv4}
scheduler:
  extraArgs:
    bind-address: ${PRIVATE_IPv4}
certificatesDir: /etc/kubernetes/pki
---
apiVersion: kubeadm.k8s.io/v1beta2
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: ${PRIVATE_IPv4}
  bindPort: 6443
bootstrapTokens:
- groups:
  - system:bootstrappers:kubeadm:default-node-token
  token: ${JOIN_TOKEN}
  ttl: "0"
  usages:
  - signing
  - authentication
nodeRegistration:
  kubeletExtraArgs:
    cgroup-driver: "systemd"
    cloud-provider: "external"
  taints: null
EOF

cat > /etc/kubernetes/join.yaml <<EOF
apiVersion: kubeadm.k8s.io/v1beta2
kind: ClusterConfiguration
controlPlaneEndpoint: ${CONTROL_PLANE_IP}:6443
kubernetesVersion: ${KUBERNETES_VERSION}
apiServer:
  extraArgs:
    bind-address: 0.0.0.0
  timeoutForControlPlane: 4m0s
controllerManager:
  extraArgs:
    bind-address: ${PRIVATE_IPv4}
scheduler:
  extraArgs:
    bind-address: ${PRIVATE_IPv4}
certificatesDir: /etc/kubernetes/pki
---
apiVersion: kubeadm.k8s.io/v1beta2
kind: JoinConfiguration
controlPlane:
  localAPIEndpoint:
    advertiseAddress: ${PRIVATE_IPv4}
    bindPort: 6443
discovery:
  bootstrapToken:
    apiServerEndpoint: ${CONTROL_PLANE_IP}:6443
    token: ${JOIN_TOKEN}
    unsafeSkipCAVerification: true
  timeout: 5m0s
nodeRegistration:
  kubeletExtraArgs:
    cloud-provider: "external"
  taints: null
EOF
