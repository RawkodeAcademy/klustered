# Kluster 000

## Discovered Symptoms

- SSH was a decoy service that was actually in a container or pod
- Unable to delete ReplicaSets
- Pods not being created

## Contributing Factors

- Original SSH daemon was runnning on a new port, 2222
- Teleport SSH disabled for Control Plane nodes
- Kube Controller Manager was configured to run limited controllers
  - Also attempted to "hide" that the replicaset controller was disabled by not omitting it, but negating it `-replicaset`

## Notes from Kluster Breaker

<Please replace this with an explanation of what you broke>
