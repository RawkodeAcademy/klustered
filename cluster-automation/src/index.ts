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

interface Teams {
  teams: Team[];
}

const teams: Teams = config.requireObject("teams");

teams.teams.map((team) => {
  const cluster = new Cluster(team.name, {
    kubernetesVersion: config.require("kubernetesVersion"),
    metro: config.require("metalMetro"),
    project: project.id,
    guests: team.guests,
  });

  cluster.createControlPlane({
    highAvailability: false,
    plan: metal.Plan.C3MediumX86,
    teleportSecret: teleportSecret.result,
  });

  cluster.createWorkerPool("worker", {
    kubernetesVersion: config.require("kubernetesVersion"),
    plan: metal.Plan.C3MediumX86,
    replicas: 2,
    teleportSecret: teleportSecret.result,
  });
});
