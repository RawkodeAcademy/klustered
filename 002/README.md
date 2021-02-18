# Kluster 002

## Discovered Symptoms

- SSH running on non-standard port
- Unresponsive API Server
- API Server in CrashloopBackoff

## Contributing Factors

- SSH was configured to run on 2222
- Kubernetes nodes couldn't communicate with each other due to excessive `ufw` configuration
- API Server was restarting due to misconfiguration of kubelet, notably with an eviction hard limit if the node had less than 62G RAM

## Notes from Kluster Breaker

### Swap enabled
Swap partition was re-added in `/etc/fstab`

**Result** - `kubelet` will exit fatally

### UFW (Ubuntu firewall) installed

`apt-get install ufw; ufw default deny incoming; ufw allow 2222; ufw enable`

**Result** - Node-to-Node communication (kubelet etc.) is denied

### Move SSH to non-standard port

edit `/etc/ssh/sshd_config` and set port to 2222.

### Add eviction rules to kubelet

echo KUBELET_EXTRA_ARGS=\"--evict-hard=memory.available<62Gi \" > /etc/default/kubelet

**Result** - No memory left to actually run any pods. Resulting in restarting control plane components.

### Remove `priorityClassName` from control plane manifests

This will allow the `kubelet` to kill the apiserver due to memory usage

### Modified the cidr range in the `kube-controller-manager.yaml`

`    - --cluster-cidr=127.0.0.0/16`

**Result** not sure but presumed it would be amusing

### Created a number of fake large files in root directory

`truncate --size 15T /test`

**Result** kubernetes complaining about being able to create a new image.

### Disable multi-core on the box

maxcpus=1 on grub commandline

**Result** nothing, assumed it may have caused etcd to error.
