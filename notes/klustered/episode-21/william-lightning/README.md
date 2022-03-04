# Klustered - Episode 21 - kassah

## Intro

Welcome to Klustered! Today's goal is to break a kubernetes cluster. After a bit of research, I settled upon utilizing
a ValidatingWebhookConfiguration secured by setting api-server's etcd account as read-only. I threw in an extra
annoyance by posting a fake klustered:v2 image on the nodes, secured by /etc/hosts modification to ensure no
accidental bypass of my fake container.

## Using Break

- Update klustered.env to point to a kubeconfig.conf locally that points to your test cluster.
- Update klustered.env to point to the public IP of your control plane and two worker nodes.
- Ensure you have ~/.ssh/id_rsa.pub installed so ssh is possible for the root user for the nodes.
- Run apply.sh, which will apply the breaks using the information in klustered.env
