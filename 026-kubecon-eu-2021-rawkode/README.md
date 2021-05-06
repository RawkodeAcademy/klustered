# Kluster 000

## Discovered Symptoms


## Contributing Factors


## Notes from Kluster Breaker

### Remove Logs

I disabled all container logs by `chmod -w /var/log/containers`

### Block API Server modifications with AlwaysDeny

I took advantage of Cobras "merge" semantics for multiple `--admission-control` arguments to the API server, allowing me to "hide" one near the bottom of the args.

### Intermittent `kubectl` Latency with TCP Proxy

Run `toxiproxy` as `"selinux"` systemd service

```shell
wget -O toxiproxy-2.1.4.deb https://github.com/Shopify/toxiproxy/releases/download/v2.1.4/toxiproxy_2.1.4_amd64.deb
dpkg -i toxiproxy-2.1.4.deb
mv /usr/local/bin/toxiproxy-server /sbin/selinux
```

```shell
[Unit]
Description=SELinux
After=network.target

[Service]
Type=simple
Restart=on-failure
ExecStart=/sbin/selinux start
ExecReload=/bin/kill -HUP $MAINPID
LimitNOFILE=8192

[Install]
WantedBy=multi-user.target
```

```shell
# change port in /etc/kubernetes/admin.conf to 6334
toxiproxy-cli create kubectl -l 0.0.0.0:6334 -u 127.0.0.1:6443

# add 40% chance of 5s latency
toxiproxy-cli toxic add --toxicName latency --type latency --toxicity 0.4 --attribute latency=5000 --upstream kubectl
```


## 1m/1Mi limits on all pods with LimitRange

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: chaos
spec:
  limits:
  - max:
      cpu: "2m"
      memory: 1Mi
    min:
      cpu: "2m"
      memory: 1Mi
    type: Container
```
