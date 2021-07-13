import * as pulumi from "@pulumi/pulumi";
import * as metal from "@pulumi/equinix-metal";
import * as random from "@pulumi/random";
import { Cluster } from "./kubernetes";

const stackName = pulumi.getStack();

const cluster = new Cluster(stackName, {
  kubernetesVersion: "1.21.2",
  metro: "am",
  project: "7158c8a9-a55e-454e-a1aa-ce5f8937ed10",
});

const teleportSecret = new random.RandomString("teleport-secret", {
  length: 32,
  lower: true,
  upper: false,
  special: false,
  number: true,
});

cluster.createControlPlane({
  highAvailability: false,
  plan: metal.Plan.C1SmallX86,
  teleportSecret: teleportSecret.result,
});

cluster.createWorkerPool("worker", {
  kubernetesVersion: "1.21.2",
  plan: metal.Plan.C1SmallX86,
  replicas: 2,
  teleportSecret: teleportSecret.result,
});
