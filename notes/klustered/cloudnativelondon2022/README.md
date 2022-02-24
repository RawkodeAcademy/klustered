# Cloud Native London - January 2022 meetup

There were 4 parts to the break, the scheduler, the distraction, the resource limits and the rickroll (I'm most proud of this final one).

## The scheduler

This one was quite simple, just alter the image. I did however alter it in 3 ways to see if it would catch Rawkode out.

```bash
sed -i -e 's/k8s.gcr.io\/kube-scheduler:v1.22.5/k8s.ghcr.io\/kube-apiserver:v2.22.0/g' /etc/kubernetes/manifests/kube-scheduler.yaml
```

I'm using `sed` to prevent any shenanigans with using `vim` to find any edits it's previously made to files.

## The distraction

On the second worker node, I added a bunch of manifests that pointed to a docker image that did nothing of note. Here is the dockerfile, it just outputs song lyrics to the logs every minute:

```Dockerfile
FROM ubuntu:20.04
RUN mkdir /app
WORKDIR /app
RUN echo "#!/bin/bash\n" \
         "while [ true ]; do\n" \
         "	echo \"Never gonna give you up\"\n" \
         "	echo \"Never gonna let you down\"\n" \
         "	echo \"Never gonna run around and desert you\"\n" \
         "	echo \"Never gonna make you cry\"\n" \
         "	echo \"Never gonna say goodbye\"\n" \
         "	echo \"Never gonna tell a lie and hurt you\"\n" \
         "	echo \"...\"\n" \
         "	sleep 60\n" \
         "done\n" > script.sh
RUN chmod +x script.sh
CMD ./script.sh
```

The thing I learned here was that static manifests can be created on any instance of the kubelet, I guess also that the naming of pods will show you how they were created. Pods created by static manifests have the node that created the pod appended to the name (and will truncate the name to show the node name if your pod name is too long). 

## The resource limits

I had a quick search through the kubelet docs (https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/) to see if there was anything there that would prevent Rawkode from scheduling pods (as I know he can get around issues in the scheduler).

You can stop Kubernetes taking up all the resources on the box it's running on by configuring the kubelet to limit some resources so they can be used for other tasks. For this, I just looked at how much memory and CPU each worker node had and reserved all of it, thus preventing any more pods from being scheduled. Anything that is already running, stays running though, so that is why the distraction pods were still running. 

```bash
echo "KUBELET_KUBEADM_ARGS=\"--container-runtime=remote --container-runtime-endpoint=/run/containerd/containerd.sock  --system-reserved=cpu=48000m,memory=64000Mi --pod-infra-container-image=k8s.gcr.io/pause:3.5\"" > /var/lib/kubelet/kubeadm-flags.env 

systemctl daemon-reload

systemctl restart kubelet
```

## The rickroll

I wanted to trick Rawkode into thinking he'd fix it, only to see a different video when he loaded up the web app. I was going to try to change the image, but he's seen this before so I knew it wouldn't fool him.

I mulled over trying to alter the container image on disk but wasn't sure I'd get away with it as they are stored against a hash and I don't know enough about `containerd` to tell if it checks those hashes when loading from disk.

I opted for altering the container at runtime with `kubectl cp`. Then `PROMPT_COMMAND` helped me ensure the `kubectl cp` command would be run when needed (in this case, every time Rawkode did anything, potentially wasteful but funny nonetheless)

Copy files over onto each node (so no matter which node Rawkode was on, he would be caught by this):

``` bash
scp ./video.webm root@<server address>:/media/video.webm
scp ./admin.conf root@<server address>:/media/admin.conf
scp ./prompt.sh root@<server address>:/media/prompt.sh

```

Run commands on each node to activate the rickroll break

``` bash
sed -i -e 's/unset color_prompt force_color_prompt/unset color_prompt force_color_prompt\nexport PROMPT_COMMAND="\/media\/prompt.sh"/g' ~/.bashrc
chmod a+x /media/prompt.sh
touch -r ~/.profile ~/.bashrc
```

The `sed` command is adding the `PROMPT_COMMAND` environment variable to the .bashrc file, which is subsequently altered by touch to have the date reset to try to hide the fact it's change.

Contents of `prompt.sh`:

```bash
#!/bin/sh
kubectl --kubeconfig /media/admin.conf cp /media/video.webm default/$(kubectl --kubeconfig /media/admin.conf get pod -l app=klustered -o jsonpath="{.items[0].metadata.name}"):/workload/assets/video.webm 1>/dev/null 2>/dev/null
```

This just runs `kubectl cp` to get the rickroll video onto the pod that is tagged as klustered (so this can withstand restarts which use new dynamically generated pod names) using the `jsonpath` argument. It also shows another way to specify which config to use to connect to a cluster with the `kubeconfig` argument.

Finally, alter the database to provide new quotes 

```bash
kubectl exec -it -n default postgresql-0 -- /bin/bash

psql -v ON_ERROR_STOP=1 --username postgres --dbname klustered <<-EOSQL                                                     
        DELETE FROM quotes;
EOSQL

psql -v ON_ERROR_STOP=1 --username postgres --dbname klustered <<-EOSQL   
        INSERT INTO quotes (quote, author, link)
            VALUES
            ('Never gonna give you up', 'Rick Astley', 'https://twitter.com/rickastley/status/1453678394583945219'),
            ('Never gonna let you down', 'Rick Astley', 'https://twitter.com/rickastley/status/1422160484216750082'),
            ('Never gonna run around and desert you', 'Rick Astley', 'https://twitter.com/rickastley/status/1417065272222101507'),
            ('Never gonna make you cry', 'Rick Astley', 'https://twitter.com/rickastley/status/1453678394583945219'),
            ('Never gonna say goodbye', 'Rick Astley', 'https://twitter.com/rickastley/status/1422160484216750082'),
            ('Never gonna tell a lie and hurt you', 'Rick Astley', 'https://twitter.com/rickastley/status/1417065272222101507');
EOSQL
```

This relies on the database not being re-created (i.e. this didn't go to plan for the meetup as postgres was restarted due to the break being a bit too harsh).
