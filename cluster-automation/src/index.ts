import * as pulumi from "@pulumi/pulumi";
import * as metal from "@pulumi/equinix-metal";
import * as random from "@pulumi/random";
import { Cluster } from "./kubernetes";

const stackName = pulumi.getStack();
const config = new pulumi.Config();

const project = new metal.Project("klustered", {
  name: "Klustered",
  organizationId: config.requireSecret("metalOrg"),
  bgpConfig: {
    deploymentType: "local",
    asn: 65000,
  },
});

const teleportSecret = new random.RandomString("teleport-secret", {
  length: 32,
  lower: true,
  upper: false,
  special: false,
  number: true,
});

interface Team {
  name: string;
  guests: string[];
}

const teamOne: Team = config.requireObject("teamOne");
const teamTwo: Team = config.requireObject("teamTwo");

const clusterOne = new Cluster(teamOne.name, {
  kubernetesVersion: config.require("kubernetesVersion"),
  metro: config.require("metalMetro"),
  project: project.id,
  guests: teamOne.guests,
});

clusterOne.createControlPlane({
  highAvailability: false,
  plan: metal.Plan.C1SmallX86,
  teleportSecret: teleportSecret.result,
});

clusterOne.createWorkerPool("worker", {
  kubernetesVersion: "1.22.0",
  plan: metal.Plan.C1SmallX86,
  replicas: 2,
  teleportSecret: teleportSecret.result,
});

const clusterTwo = new Cluster(teamTwo.name, {
  kubernetesVersion: config.require("kubernetesVersion"),
  metro: config.require("metalMetro"),
  project: project.id,
  guests: teamTwo.guests,
});

clusterTwo.createControlPlane({
  highAvailability: false,
  plan: metal.Plan.C1SmallX86,
  teleportSecret: teleportSecret.result,
});

clusterTwo.createWorkerPool("worker", {
  kubernetesVersion: "1.22.0",
  plan: metal.Plan.C1SmallX86,
  replicas: 2,
  teleportSecret: teleportSecret.result,
});
