import * as pulumi from "@pulumi/pulumi";
import * as metal from "@pulumi/equinix-metal";
import * as github from "@pulumi/github";
import * as google from "@pulumi/google-native";
import * as random from "@pulumi/random";

import { cloudConfig } from "./cloud-config";
import { Teams } from "../";

export interface Teleport {
  secret: pulumi.Output<string>;
  url: pulumi.Output<string>;
}

const config = new pulumi.Config();

const githubClientId = process.env.GITHUB_CLIENT_ID!;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET!;

export const installTeleport = (dnsName: string, teams: Teams) => {
  teams.teams.forEach((team) => {
    const githubTeam = new github.Team(team.name, {
      name: `klustered-${team.name}`,
    });

    team.guests.forEach((member) => {
      new github.TeamMembership(`${team.name}-${member}`, {
        teamId: githubTeam.id,
        username: member,
        role: "member",
      });
    });
  });

  const teleportSecret = new random.RandomString("teleport-secret", {
    length: 32,
    lower: true,
    upper: false,
    special: false,
    number: true,
  });

  const teleportServer = new metal.Device("teleport-server", {
    hostname: "klustered-teleport",
    projectId: config.require("metalProject"),
    metro: config.require("metalMetro"),
    plan: "c3.small.x86",
    billingCycle: metal.BillingCycle.Hourly,
    operatingSystem: metal.OperatingSystem.Ubuntu2004,
    customData: pulumi.all([teleportSecret.result]).apply(([teleportSecret]) =>
      JSON.stringify({
        teleportSecret,
        dnsName,
        githubClientId,
        githubClientSecret,
        teams: teams.teams.map((team) => team.name).join(","),
      })
    ),
    userData: cloudConfig.then((c) => c.rendered),
  });

  const teleportDns = new google.dns.v1.ResourceRecordSet(
    "teleport-dns",
    {
      managedZone: "klustered-live-65ef9b5",
      ttl: 360,
      type: "A",
      rrdatas: [teleportServer.accessPublicIpv4],
      name: "join.klustered.live.",
    },
    {
      deleteBeforeReplace: true,
    }
  );

  return {
    url: teleportDns.name,
    secret: teleportSecret.result,
  };
};
