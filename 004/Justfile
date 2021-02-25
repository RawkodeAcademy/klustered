KLUSTERNUM := `basename $(pwd)`

init:
	#!/usr/bin/env sh
	read -p "API Key: " -s PACKET_API_KEY && export PACKET_API_KEY=${PACKET_API_KEY}
	clusterctl init --infrastructure packet

config:
	#!/usr/bin/env sh
	set -e
	source .env
	if [[ -z $PROJECT_ID ]]; then
		echo "Project ID not configured in .env"
		exit -1
	fi

	clusterctl config cluster kluster-{{ KLUSTERNUM }} \
		--kubernetes-version v1.19.4 \
		--control-plane-machine-count=3 \
		--worker-machine-count=3 \
		> cluster.yaml
	sed -i '' -e 's/socat jq/socat jq lvm2/g' cluster.yaml

kubeconfig:
	clusterctl get kubeconfig kluster-{{ KLUSTERNUM }} > kubeconfig

cluster-create: config
	kubectl apply -f cluster.yaml

cluster-prepare: kubeconfig cilium rook metallb workload

cilium:
	kubectl --kubeconfig=./kubeconfig create ns cilium
	helm template cilium/cilium  \
		--version 1.8.5 \
		--namespace cilium \
		--set image.repository=docker.io/cilium/cilium \
		--set global.ipam.mode=cluster-pool \
		--set global.ipam.operator.clusterPoolIPv4PodCIDR=192.168.0.0/16 \
		--set global.ipam.operator.clusterPoolIPv4MaskSize=23 \
		--set global.nativeRoutingCIDR=192.168.0.0/16 \
		--set global.endpointRoutes.enabled=true \
		--set global.hubble.relay.enabled=true \
		--set global.hubble.enabled=true \
		--set global.hubble.listenAddress=":4244" \
		--set global.hubble.ui.enabled=true \
		> cilium.yaml
	kubectl --kubeconfig=./kubeconfig apply --wait -f ./cilium.yaml

rook:
	kubectl --kubeconfig=./kubeconfig apply --wait -f https://raw.githubusercontent.com/rook/rook/master/cluster/examples/kubernetes/ceph/crds.yaml
	kubectl --kubeconfig=./kubeconfig apply --wait -f https://raw.githubusercontent.com/rook/rook/master/cluster/examples/kubernetes/ceph/common.yaml
	kubectl --kubeconfig=./kubeconfig apply --wait -f https://raw.githubusercontent.com/rook/rook/master/cluster/examples/kubernetes/ceph/operator.yaml
	kubectl --kubeconfig=./kubeconfig apply --wait -f https://raw.githubusercontent.com/rook/rook/master/cluster/examples/kubernetes/ceph/cluster.yaml
	kubectl --kubeconfig=./kubeconfig apply --wait -f https://raw.githubusercontent.com/rook/rook/master/cluster/examples/kubernetes/ceph/toolbox.yaml
	kubectl --kubeconfig=./kubeconfig apply --wait -f ./ceph-blockpool.yaml

metallb:
	kubectl --kubeconfig=./kubeconfig patch clusterroles system:cloud-controller-manager --patch-file=./ccm-patch.yaml
	kubectl --kubeconfig=./kubeconfig apply --wait -f https://raw.githubusercontent.com/equinix/cloud-provider-equinix-metal/v1.1.0/lb/manifests.yaml

workload:
	#!/usr/bin/env bash
	mkdir -p workload
	curl -L https://k8s.io/examples/application/wordpress/mysql-deployment.yaml -o workload/mysql.yaml
	curl -L https://k8s.io/examples/application/wordpress/wordpress-deployment.yaml -o workload/wordpress.yaml

	cat <<EOF >./workload/kustomization.yaml
	secretGenerator:
	- name: mysql-pass
	  literals:
	  - password=kluster-{{ KLUSTERNUM }}

	resources:
	- ./mysql.yaml
	- ./wordpress.yaml
	EOF
	kubectl --kubeconfig=./kubeconfig apply -k ./workload
