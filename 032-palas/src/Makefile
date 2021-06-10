TAG?=0.0.3

build:
	docker build -t sidpalas/klustered:$(TAG) .

push:
	docker push sidpalas/klustered:$(TAG)

create-namespace:
	-kubectl create namespace $(UUID)

create-docker-secret:
	-kubectl apply -f dockerhub-secret.yaml -n $(UUID)

create-job:
	-kubectl apply -f job.yaml -n $(UUID)

scale-klustered-deployment:
	-kubectl scale deployment klustered --replicas=0
