# Wildlide studios

0. Modified pause image with a script that killed the klustered app:

Since the pause container lives in the same network namespace as the other
processes, the only way we found out to kill the pause container only for the
klustered pod was to perfom the following script:

```
#!/bin/sh
while true; do
  sleep 20
  nc -w 1 127.0.0.1 8080
  if [ $? == 0 ]; then
    kill -15 1
    kill -9 1
    exit
  fi
done
```

After `pid 1` was killed, the klustered pod restarted as the sandbox was gone


1. Disabled cilium

For this break we scaled down the cilium DaemonSet and we renamed the
`cilium-operator` deployment to `cilium` to confuse the user. In order
to make the nodes appear as `READY` even though cilium was down, we created
the following file on /etc/cni/net.d/05-cilium.conflist


```
{
        "cniVersion": "0.3.1",
        "name": "cilium",
        "plugins": [
        {
                "type": "ptp",
                "ipMasq": false,
                "ipam": {
                        "type": "host-local",
                        "dataDir": "/run/cni-ipam-state",
                        "routes": [


                                { "dst": "0.0.0.0/0" }
                        ],
                        "ranges": [


                                [ { "subnet": "10.244.0.0/24" } ]
                        ]
                }
                ,
                "mtu": 1500

        },
        {
                "type": "portmap",
                "capabilities": {
                        "portMappings": true
                }
        }
        ]
}
```


2. Change a cilium configuration that disabled services

Added the `--k8s-service-proxy-name cilium` to the cilium agent which makes
cilium only create eBPF programs for services with the label `service.kubernetes.io/service-proxy-name: cilium`.

The solution for this was to remove that option from the cilium config map or
to add that label to the klustered and postgres services.
