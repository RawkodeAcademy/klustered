#!/usr/bin/env bash
INGRESS_IP=$(jq -r ".ingressIp" /tmp/customdata.json)

kubectl --kubeconfig /etc/kubernetes/admin.conf create namespace emissary || true
kubectl --kubeconfig /etc/kubernetes/admin.conf apply -f https://app.getambassador.io/yaml/emissary/2.2.0/emissary-crds.yaml && \
kubectl --kubeconfig /etc/kubernetes/admin.conf apply -f https://app.getambassador.io/yaml/emissary/2.2.0/emissary-emissaryns.yaml

sleep 5

kubectl --kubeconfig /etc/kubernetes/admin.conf -n emissary patch svc emissary-ingress -p "{\"spec\": {\"type\": \"LoadBalancer\", \"loadBalancerIP\":\"${INGRESS_IP}\"}}"

