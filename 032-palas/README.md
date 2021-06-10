# Kluster 032

## Discovered Symptoms

- Klustered deployment had 0 replicas
- After scaling to 1, lots of UUID named namespaces started appearing
- Noticed some nonstandard processes running on the worker node
- Found rogue container running directly on worker node (outside of k8s)

## Fix
1) Cordon the worker node to stop the spread of the malicious workload
2) Find and stop the container running on the worker node directly to prevent the workload from being launched again
3) Delete all the randomly added namespaces
4) Uncordon the worker node

## Contributing Factors


## Notes from Kluster Breaker

I didn't modify anything about the k8s system components.

I did two things:
1) Launch a privileged container directly on the worker node using containerd. This container polls to check for the klustered test workload pod. If detected it starts launching `not-a-virus` jobs in random namespaces.
2) The `not-a-virus` job launches a container which launches 3 copies of itself into new workspaces before completing.

The source for the malicious workload is in `/032-palas/src/`