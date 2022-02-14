#!/usr/bin/env bash
CONTROL_PLANE_IP=$(jq -r ".controlPlaneIp" /tmp/customdata.json)

if [[ -z ${CONTROL_PLANE_IP} || ${CONTROL_PLANE_IP} == "null" ]];
then
  kubeadm init --ignore-preflight-errors=DirAvailable--etc-kubernetes-manifests,FileAvailable--etc-kubernetes-pki-ca.crt \
    --skip-phases=addon/kube-proxy --config=/etc/kubernetes/init.yaml
else
  kubeadm join --ignore-preflight-errors=DirAvailable--etc-kubernetes-manifests,FileAvailable--etc-kubernetes-pki-ca.crt \
    --config=/etc/kubernetes/join.yaml
fi

rm /etc/kubernetes/{init,join}.yaml
