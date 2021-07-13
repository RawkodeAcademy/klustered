#!/usr/bin/env bash
INGRESS_IP=$(jq -r ".ingressIp" /tmp/customdata.json)

kubectl --kubeconfig /etc/kubernetes/admin.conf apply -f https://www.getambassador.io/yaml/aes-crds.yaml
kubectl --kubeconfig /etc/kubernetes/admin.conf wait --for condition=established --timeout=90s crd -lproduct=aes
kubectl --kubeconfig /etc/kubernetes/admin.conf apply -f https://www.getambassador.io/yaml/aes.yaml
kubectl --kubeconfig /etc/kubernetes/admin.conf -n ambassador patch svc ambassador -p '{"spec": {"type": "LoadBalancer", "loadBalancerIP":"${INGRESS_IP}"}}'
