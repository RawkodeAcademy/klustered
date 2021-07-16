# Kluster 000

## Discovered Symptoms


## Contributing Factors


## Notes from Kluster Breaker

### CNI Break

On each worker node:

- `cp -p /opt/cni/bin/bridge{,.bak}`
- `cp -p /opt/cni/bin/loopback{,.bak}`
- `cp -p /opt/cni/bin/loopback.bak /opt/cni/bin/bridge`
- `cp -p /opt/cni/bin/bridge.bak /opt/cni/bin/loopback`

### Hostname Break

On one worker node:

- hostname $OTHER_WORKER_NODE_HOSTNAME
- systemctl restart kubelet
- hostname $THIS_WORKER_NODE_HOSTNAME

### Etcd Break

Add the following to `~/.profile`:
```bash
export ETCDCTL_CACERT=/etc/kubernetes/pki/etcd/ca.crt
export ETCDCTL_CERT=/etc/kubernetes/pki/etcd/peer.crt
export ETCDCTL_KEY=/etc/kubernetes/pki/etcd/peer.key
export ETCDCTL_ENDPOINTS=127.0.0.1:2379
```

- `etcdctl snapshot save /var/etcd.db`
- `etcdctl member add bogus --peer-urls=https://172.16.21.1:2380`

