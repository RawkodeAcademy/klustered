# Marcus Noble

## Breaking

 1. Disable bash history

    ```bash
    unset HISTFILE
    ```

 2. Install a *bunch* of various helm charts, for fun. Including, but not limited to, Kyverno, OPA, ChaosMesh, ArgoCD, GoCD, Kubernetes Dashboard, etcd, Prometheus, Descheduler, Docker Registry, Artifactory, Harbor

 3. Limit memory in namespaces:

    ```yaml
    echo 'apiVersion: v1
    kind: LimitRange
    metadata:
      name: mem-min-max
      namespace: kube-system
    spec:
      limits:
      - max:
          memory: 1Ki
        min:
          memory: 1Ki
        type: Container
    ---
    apiVersion: v1
    kind: LimitRange
    metadata:
      name: mem-min-max
      namespace: default
    spec:
      limits:
      - max:
          memory: 1Ki
        min:
          memory: 1Ki
        type: Container' | kubectl apply --kubeconfig /etc/kubernetes/admin.conf -f -
    ```

 4. Validating webhook:

    ```yaml
    echo 'kind: ValidatingWebhookConfiguration
    apiVersion: admissionregistration.k8s.io/v1
    metadata:
      name: validatingwebhook
    webhooks:
      - name: validate.kubernetes.io
        clientConfig:
          url: "https://localhost:443/validate"
        rules:
          - apiGroups: ["*"]
            apiVersions: ["*"]
            resources: ["*"]
            operations: ["*"]
            scope: "*"
        sideEffects: None
        admissionReviewVersions: ["v1"]' | kubectl apply --kubeconfig /etc/kubernetes/admin.yaml -f -
    ```

    This actually points to nginx running on the host machine (see below)

 5. On each host, a binary running the following to block all requests to the API server:

    ```go
    package main

    import (
    	"encoding/json"
    	"fmt"
    	"io/ioutil"
    	"net/http"
    )

    type In struct {
    	Request struct {
    		UID string
    	}
    }

    func main() {
        http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
            buf, err := ioutil.ReadAll(r.Body)
            if err != nil {
              fmt.Fprintf(w, `{"apiVersion": "admission.k8s.io/v1","kind": "AdmissionReview","response": {"allowed": false}}`)
              return
            }
            req := In{}
            json.Unmarshal(buf, &req)
            fmt.Fprintf(w, `{"apiVersion": "admission.k8s.io/v1","kind": "AdmissionReview","response": {"uid": "%s","allowed": false}}`, req.Request.UID)
        })

    	http.ListenAndServe(":8090", nil)
    }
    ```

    ```text
    [Unit]
    Description=Validate Service
    After=network.target

    [Service]
    ExecStart=/usr/bin/validate
    Restart=always

    [Install]
    WantedBy=multi-user.target
    ```

    Save as `/usr/lib/systemd/system/validate.service`

 6. Nginx as reverse proxy:

    `apt install nginx -y`

    ```nginx
    server {
        listen              443 ssl;
        ssl_certificate     /etc/kubernetes/pki/apiserver.crt;
        ssl_certificate_key /etc/kubernetes/pki/apiserver.key;

        location /validate {
            proxy_pass http://localhost:8090;
        }

        location / {
          deny all
        }
    }
    ```

    > Unfortunately this didn't have the intended effect I wanted due to the certs not being valid for `localhost` but decided to leave it as it still broke things.

    If it had worked as intended, all requests to the API server would recieve a 403 error and requests triggered by the Validating Webhook (above) would be sent to the Go app which would return a rejection for all webhook calls.

 7. Update kubeconfig to point to nginx:

    ```bash
    sed -i 's|:6443|:443|' /etc/kubernetes/admin.conf
    ```

 8. Replace pause image:

    ```bash
    sed -i 's|$KUBELET_EXTRA_ARGS|$KUBELET_EXTRA_ARGS --pod-infra-container-image=k8s.gcr.io/pause:3_4_1|' /etc/systemd/system/kubelet.service.d/10-kubeadm.conf
    ```

    This was done in the `/etc/systemd/system/kubelet.service.d/10-kubeadm.conf` file rather than the expected `/var/lib/kubelet/kubeadm-flags.env` (which was left alone, with the correct pause image still present).

 9. Change path to static pods:

    ```bash
    sed -i 's|staticPodPath: /etc/kubernetes/manifests|staticPodPath: /etc/kubernetes/static-pods|' /var/lib/kubelet/config.yaml
    ```

    > (This ended up being easy to spot, in hindsight I should have just dropped the `s` off the end of `manifests`)

10. Reduce `maxPods`:

    ```bash
    echo "maxPods: 3" >>  /var/lib/kubelet/config.yaml
    ```

11. Reduce usefulness of logs

    ```bash
    echo "containerLogMaxSize: 1Ki" >>  /var/lib/kubelet/config.yaml
    echo "containerLogMaxFiles: 1" >>  /var/lib/kubelet/config.yaml
    ```

    > (Annoyingly, a typo here (the second line missing `Ki`) mean this was caught much earlier than I expected as it produced a very helpful error message.

12. Enable PSPs

    ```bash
    sed -i -E 's|--enable-admission-plugins=(.*)|--enable-admission-plugins=\1,PodSecurityPolicy|' /etc/kubernetes/manifests/kube-apiserver.yaml
    ```

    Without the PSPs themselves in place this will prevent several apps from being able to run.

13. Stop the Kubelet

    ```bash
    systemctl stop kubelet.service
    systemctl disable kubelet.service
    ```

14. Cover our tracks

    ```bash
    echo "Nothing to see here, sorry" > ~/.bash_history
    find / -exec touch {} +
    ```

## Hints

```bash
echo "🕸🪝" > ~/Hint-1.md
echo "There's something between us" > ~/Hint-2.md
echo "I can't remember, my memory isn't what it once was" > ~/Hint-3.md
echo "⏸" > ~/Hint-4.md
echo "I hope you backed up those config files" > ~/Hint-5.md
```
