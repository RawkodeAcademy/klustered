# Klustered Episode 17 - Adam Szucs-Matyas (@szucsitg)

## Preqrequisites - "ghcr.io" clone

Generate keys for fake GitHub Container Registry:

```bash
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -sha512 -days 3650 -subj "/C=CN/ST=Beijing/L=Beijing/O=example/OU=Personal/CN=yourdomain.com" -key ca.key -out ca.crt
openssl genrsa -out ghcr.io.key 4096
openssl req -sha512 -new -subj "/C=CN/ST=Budapest/L=Budapest/O=Fake/OU=Klustered Gold CA/CN=ghcr.io" -key ghcr.io.key -out ghcr.io.csr
cat > v3.ext <<-EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
[alt_names]
DNS.1=ghcr.io
DNS.2=klustered.fake.com
DNS.3=harbor-klustered
EOF
openssl x509 -req -sha512 -days 3650     -extfile v3.ext     -CA ca.crt -CAkey ca.key -CAcreateserial     -in ghcr.io.csr     -out ghcr.io.crt
```

Copy certificates to Harbor's default location:

```bash
cp ghcr.io.crt /data/cert/
sudo mkdir -p /data/cert
sudo cp ghcr.io.crt /data/cert/
sudo cp ghcr.io.key /data/cert/
```

Setup docker to trust the fake cert

```bash
openssl x509 -inform PEM -in ghcr.io.crt -out ghcr.io.cert
sudo mkdir -p /etc/docker/certs.d/ghcr.io
sudo cp ghcr.io.cert /etc/docker/certs.d/ghcr.io/
sudo cp ghcr.io.key /etc/docker/certs.d/ghcr.io/
sudo cp ca.crt /etc/docker/certs.d/ghcr.io/
sudo systemctl restart docker
```

Install Harbor

```bash
sudo ./install.sh
```

Pull klustered:v1 image

```bash
docker pull ghcr.io/rawkode/klustered:v1
```

Create fake v2 image in my registry

```bash
sudo echo "127.0.1.1 ghcr.io" >> /etc/hosts
sudo systemctl restart docker
docker login ghcr.io
docker push ghcr.io/rawkode/klustered:v1
docker tag ghcr.io/rawkode/klustered:v1 ghcr.io/rawkode/klustered:v2
docker push ghcr.io/rawkode/klustered:v2
```

Create a small decoy image that mimics teleport response for unavaible web app

```Dockerfile
#Dockerfile
FROM nginx:1.21-alpine
COPY fail.conf /etc/nginx/conf.d/default.conf
```

```nginx
#fail.conf
server {
    listen       8080;:
    server_name  localhost;
    location /health {
        return 200 `healthy`;
    }
    error_page 403 404 500 502 503 =500 @500;
```

```bash
docker build . -t ghcr.io/szucsitg/klustered:v1
docker push ghcr.io/szucsitg/klustered:v1
```

## Klustered nodes

Make workers pull from fake registry

```bash
sudo echo "111.222.333.444 ghcr.io" >> /etc/hosts
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml
modify config.toml with:
```

Add to containerd's config

```toml
        [plugins."io.containerd.grpc.v1.cri".registry.configs."ghcr.io".tls]
          insecure_skip_verify = true
```

```bash
sudo systemctl restart containerd
```

## Kubernetes related changes

* changed deployed image to my failing image `ghcr.io/szucsitg/klustered:v1`
* change ImagePullPolicy to IfNotPresent
  * should have not done :) it pulled a cached v2 image from worker 2 :(
* changed klustered service selector to `app: clustered`
  * i forgot to set it back after testing it...

## Some red herrings

```bash
kubectl taint nodes szucsitg-worker-1 klustered=app:NoSchedule
kubectl taint nodes szucsitg-worker-2 klustered=db:NoSchedule
```

App and Posgtgres recieved a toleration:

```yaml
tolerations:
- key: "klustered"
  operator: "Equal"
  value: "app"
  effect: "NoSchedule"
  
tolerations:
- key: "klustered"
  operator: "Equal"
  value: "db"
  effect: "NoSchedule"
```

* Cordon both nodes
* Change postgres svc to `internalTrafficPolicy: Local`
  * unfortunately this did not work due to not yet supported on Cilium v1.10.2 and the cluster run without kube-proxy

Modify coredns configmap

```cfg
...
ready
hosts custom.hosts postgres.default.svc.cluster.local {
   1.2.3.4 postgres.default.svc.cluster.local
   fallthrough
}
kubernetes cluster.local in-addr.arpa ip6.arpa {
...
```
