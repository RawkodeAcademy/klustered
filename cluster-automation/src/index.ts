import * as pulumi from "@pulumi/pulumi";
import * as metal from "@pulumi/equinix-metal";

import { Cluster } from "./kubernetes";
import { installTeleport } from "./teleport";

const config = new pulumi.Config();

interface Team {
  name: string;
  guests: string[];
}

export interface Teams {
  teams: Team[];
}

const teams: Teams = config.requireObject("teams");

const teleport = installTeleport("join.klustered.live", teams);

teams.teams.map((team) => {
  const cluster = new Cluster(team.name, {
    kubernetesVersion: config.require("kubernetesVersion"),
    metro: config.require("metalMetro"),
    project: config.require("metalProject"),
    guests: team.guests,
  });

  const controlPlane = cluster.createControlPlane({
    highAvailability: false,
    plan: metal.Plan.C3MediumX86,
    teleport,
  });

  cluster.createWorkerPool("worker", {
    controlPlaneIp: controlPlane.getPublicIP(),
    kubernetesVersion: config.require("kubernetesVersion"),
    plan: metal.Plan.C3MediumX86,
    replicas: 1,
    teleport,
  });
});
