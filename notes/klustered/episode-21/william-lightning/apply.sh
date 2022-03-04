#!/bin/bash
source klustered.env

#### Patch klustered deployment, so that it doesn't "Always" fetch. ####
kubectl $KUBECONFIGSWITCH patch deployment klustered -p "$(cat deployPatch.yaml)"
kubectl $KUBECONFIGSWITCH rollout status deploy klustered

#### Put in place admission webhook, preventing further pod changes, until it's removed. ####
kubectl $KUBECONFIGSWITCH apply -f admission-pod.yaml

#### Create fake ghcr.io/rawkode/klustered:v2 ####
cd nginx
./build.sh
cd ..

#### Upload fake ghcr.io/rawkode/klustered:v2 ####
ssh -l root -i ~/.ssh/id_rsa $CPIP 'ctr -n k8s.io image rm ghcr.io/rawkode/klustered:v2'
ssh -l root -i ~/.ssh/id_rsa $WORKER1IP 'ctr -n k8s.io image rm ghcr.io/rawkode/klustered:v2'
ssh -l root -i ~/.ssh/id_rsa $WORKER2IP 'ctr -n k8s.io image rm ghcr.io/rawkode/klustered:v2'
scp -i ~/.ssh/id_rsa klustered.tar root@$CPIP:klustered.tar
scp -i ~/.ssh/id_rsa klustered.tar root@$WORKER1IP:klustered.tar
scp -i ~/.ssh/id_rsa klustered.tar root@$WORKER1IP:klustered.tar
ssh -l root -i ~/.ssh/id_rsa $CPIP 'ctr -n=k8s.io images import klustered.tar'
ssh -l root -i ~/.ssh/id_rsa $WORKER1IP 'ctr -n=k8s.io images import klustered.tar'
ssh -l root -i ~/.ssh/id_rsa $WORKER2IP 'ctr -n=k8s.io images import klustered.tar'
ssh -l root -i ~/.ssh/id_rsa $CPIP 'rm klustered.tar'
ssh -l root -i ~/.ssh/id_rsa $WORKER1IP 'rm klustered.tar'
ssh -l root -i ~/.ssh/id_rsa $WORKER2IP 'rm klustered.tar'

#### Prevent fetching of actual ghcr.io/rawkode/klustered:v2 ####
ssh -l root -i ~/.ssh/id_rsa $CPIP 'echo "10.0.0.1    ghcr.io" >> /etc/hosts'
ssh -l root -i ~/.ssh/id_rsa $WORKER1IP 'echo "10.0.0.1    ghcr.io" >> /etc/hosts'
ssh -l root -i ~/.ssh/id_rsa $WORKER2IP 'echo "10.0.0.1    ghcr.io" >> /etc/hosts'

#### Install etcdctl 3.5.1-0 into /tmp/tmp89u9u43/etcdctl ####
ssh -l root -i ~/.ssh/id_rsa $CPIP 'curl -o /tmp/etcd.tgz https://storage.googleapis.com/etcd/v3.5.1/etcd-v3.5.1-linux-amd64.tar.gz'
ssh -l root -i ~/.ssh/id_rsa $CPIP 'tar -zxvf /tmp/etcd.tgz'
ssh -l root -i ~/.ssh/id_rsa $CPIP 'mv etcd-v3.5.1-linux-amd64 /tmp/tmp89u9u43'
ssh -l root -i ~/.ssh/id_rsa $CPIP 'rm /tmp/etcd.tgz'

#### EtcD hack, turn on authentication, and ensure api-server has read-only access so things look fine on first glance. ####
ETCDCTLCLI="/tmp/tmp89u9u43/etcdctl --endpoints=https://127.0.0.1:2379 --cacert=/etc/kubernetes/pki/etcd/ca.crt --cert=/etc/kubernetes/pki/etcd/server.crt --key=/etc/kubernetes/pki/etcd/server.key"
ssh -l root -i ~/.ssh/id_rsa $CPIP "${ETCDCTLCLI} role add root"
echo "Set password to 123456 when prompted."
ssh -l root -i ~/.ssh/id_rsa $CPIP "${ETCDCTLCLI} user add kassah-control-plane-1"
echo "Set password to 123456 when prompted."
ssh -l root -i ~/.ssh/id_rsa $CPIP "${ETCDCTLCLI} user add root"
ssh -l root -i ~/.ssh/id_rsa $CPIP "${ETCDCTLCLI} user grant-role kassah-control-plane-1 root"
ssh -l root -i ~/.ssh/id_rsa $CPIP "${ETCDCTLCLI} user grant-role root root"
echo "Set password to 123456 when prompted."
ssh -l root -i ~/.ssh/id_rsa $CPIP "${ETCDCTLCLI} user add kube-apiserver-etcd-client"
ssh -l root -i ~/.ssh/id_rsa $CPIP "${ETCDCTLCLI} role add apiserver"
ssh -l root -i ~/.ssh/id_rsa $CPIP "${ETCDCTLCLI} role grant-permission apiserver --prefix=true read /registry"
ssh -l root -i ~/.ssh/id_rsa $CPIP "${ETCDCTLCLI} user grant-role kube-apiserver-etcd-client apiserver"
ssh -l root -i ~/.ssh/id_rsa $CPIP "${ETCDCTLCLI} auth enable"

#### Just to be more annoying, remove the permissions we've been using to make updates. ####
ssh -l root -i ~/.ssh/id_rsa $CPIP "${ETCDCTLCLI} user revoke-role kassah-control-plane-1 root"

# further commands can be found at https://lzone.de/cheat-sheet/etcd

#### Pre-show cleanup #####
ssh -l root -i ~/.ssh/id_rsa.pub $CPIP 'rm ~/.bash_history'
ssh -l root -i ~/.ssh/id_rsa.pub $WORKER1IP 'rm ~/.bash_history'
ssh -l root -i ~/.ssh/id_rsa.pub $WORKER2IP 'rm ~/.bash_history'
ssh -l root -i ~/.ssh/id_rsa.pub $CPIP 'rm -rf /tmp/tmp89u9u43'