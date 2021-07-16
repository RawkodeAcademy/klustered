FROM bitnami/kubectl:1.21

USER root

RUN apt-get update && apt-get -y install uuid-runtime wget make

WORKDIR /blah

ENV KUBECONFIG=/blah/kubeconfig

COPY . .

RUN chmod +x setup-and-run.sh

ENTRYPOINT [ "/bin/bash" ]

CMD ["./setup-and-run.sh"]