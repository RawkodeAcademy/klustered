# Kluster 005
## User story
A cloud janitor studying CKS working with a traditional auditor in securing a kubernets cluster gets a user call saying her application service discovery stopped working and can prove this is global across the cluster by testing againtst kubernetes.default.svc from any pod.

```
Hi David,
Thank you for giving me and the auditor a chance to audit kluster5, auditors said:
"Things are not always as they seem, The first appearances devices many"
Also,  a user passed by and reported  pods can not access the API server, she was  testing with curl from inside a pod to verify by using "curl -k https://kubernetes.default.svc/api"

Best,
Walid

```
## Discovered Symptoms
- kubectl get nodes returns nothing at first
  Fixer team impatience wait at least 20-30 seconds for any network timeout connectivity
- 2nd time kubectl get node returns an error regarding etcd error

## Contributing Factors

- as this was a POC/test cluster, it seems that the janitor was deploying, deleting, and scaling several deployments while he set the etcd quota too short 400Mbyte which caused etcd stop writing to its database. Janitor is clueless, he remove the configuration thinking it should be fine, but it wasn't, it made things worst to team fix as ceph and cluster have many events by the time, fix team used the cluster it was wrecked.

- Auditor being traditional stopped network traffic forwarding, not knowing that container runtime create virtual interfaces for each container, or kubernetes creating virtual interfaces for its pods, this could attribute back to service traffic was blocked, context and cloud-native mindset could have helped. this was achived by using sysctl, in first episode iptables was used mistakenly by a security engineer, so this was a continution on that line of thought.

- Janitor studing for CKS started a network policy, however did not finish it causing all ingress traffic to be blocked.
- Janitor used PodSecurityPolicy thinking to stop priviliged containers from running, raising the security bar, however, this will hide static pods if there were recreated, and will block special pods that required priviliged access such as CNI daemonsets and coredns if restarted from Running


## Notes from Kluster Breaker
- First for all appologies to Dan and David, etcd by itself was more than enough, did not imagine it would cause that much havoc, it is based on realistic use case we faced in 1.13 K8s POC cluster with large pods deployments and updates across 6 months (350+ pods, and atl least 1-2 updates monthly if not many due to user interactions)
- Second, even though this was the second episode, crictl is an important tool for containerd "runtime" troubleshooting, it would have saved sometime
- 
<Please replace this with an explanation of what you broke>
