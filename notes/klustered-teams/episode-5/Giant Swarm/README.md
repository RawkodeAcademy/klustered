# Giant Swarm

0. Disable bash history to cover our tracks

    ```bash
    unset HISTFILE
    ```

1. Replace kubectl with MacOS binary

   ```bash
   curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/amd64/kubectl"
   chmod +x ./kubectl
   mv ./kubectl /usr/local/sbin/kubectl
   ```
   
2. Modify coredns config with ACL blocking A requests and an invalid `namespace all` (all isn’t a keyword, it’s the name of the namespace to serve requests for)

   ```bash
   echo 'apiVersion: v1
   kind: ConfigMap
   metadata:
     name: coredns
     namespace: kube-system
   data:
     Corefile: |
       .:53 {
           errors
           health {
              lameduck 5s
           }
           ready
           kubernetes cluster.local in-addr.arpa ip6.arpa {
              namespaces all
              pods insecure
              fallthrough in-addr.arpa ip6.arpa
              ttl 30
           }
           prometheus :9153
           forward . /etc/resolv.conf {
              max_concurrent 1000
           }
           acl {
              block type A net *
           }
           cache 30
           loop
           reload
           loadbalance
       }' | kubectl apply -f -
   ```
   
3. Modify hosts file to block pulling from common registries (all nodes)

   ```bash
   echo "127.0.0.1                                                                                      registry-1.docker.io docker.io k8s.gcr.io ghcr.io" >> /etc/hosts
   ```
   
4. Disable etcd hostNetwork

   ```bash
   sed -i 's/hostNetwork: true/hostNetwork: false/' /etc/kubernetes/manifests/etcd.yaml
   ```
   
5. Change API server port

   ```bash
   sed -i 's/--secure-port=6443/--secure-port=8443/' /etc/kubernetes/manifests/kube-apiserver.yaml
   ```
   
6. Reduce service IP range so there’s not enough IPs to launch all services

   ```bash
   sed -i 's|--service-cluster-ip-range=10.96.0.0/12|--service-cluster-ip-range=10.96.0.0/30|' /etc/kubernetes/manifests/kube-apiserver.yaml
   ```
   
7. Ensure all images are always pulled

   ```bash
   sed -i 's/imagePullPolicy: IfNotPresent/imagePullPolicy: Always/' /etc/kubernetes/manifests/*.yaml
   ```
   
8. Block access to API server

   ```bash
   ufw deny 6443
   ufw deny 8443
   ufw deny 2379
   ufw allow 3022 # Don't break teleport
   ufw enable
   iptables  -I INPUT -p tcp -i lo --dport 6443 -j DROP
   iptables  -I INPUT -p tcp -i lo --dport 8443 -j DROP
   iptables  -I INPUT -p tcp -i lo --dport 2379 -j DROP
   ```
   
9. Cover our tracks

   ```bash
   echo "Nothing to see here, sorry" > ~/.bash_history
   find / -exec touch {} +
   ```


## Hints

**HINTS-1.md**

```
BYOB - Bring Your Own Binary
```

**HINTS-2.md**

```
We're all here to network
```

**HINTS-3.md**

```
Are the doors open? Or is there a (fire)wall in the way?
```

**HINTS-4.md**

```
It's always DNS 🤦 
```


