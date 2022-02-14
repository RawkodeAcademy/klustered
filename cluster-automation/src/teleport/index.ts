import * as pulumi from "@pulumi/pulumi";
import * as metal from "@pulumi/equinix-metal";
import * as github from "@pulumi/github";
import * as cloudflare from "@pulumi/cloudflare";
import * as random from "@pulumi/random";

import { cloudConfig } from "./cloud-config";
import { Teams } from "../";

export interface Teleport {
  secret: pulumi.Output<string>;
  url: pulumi.Output<string>;
}

const config = new pulumi.Config();

const githubClientId = config.require("githubClientID");
const githubClientSecret = config.require("githubClientSecret");

export const installTeleport = (dnsName: string, teams: Teams) => {
  teams.teams.forEach((team) => {
    const githubTeam = new github.Team(team.name, {
      name: team.name, // should be `klustered-${team.name}
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

  const teleportServer = new metal.Device(
    "teleport-server",
    {
      hostname: "klustered-teleport",
      projectId: config.require("metalProject"),
      metro: config.require("metalMetro"),
      plan: "c3.small.x86",
      billingCycle: metal.BillingCycle.Hourly,
      operatingSystem: metal.OperatingSystem.Ubuntu2004,
      customData: pulumi
        .all([teleportSecret.result])
        .apply(([teleportSecret]) =>
          JSON.stringify({
            teleportSecret,
            dnsName,
            githubClientId,
            githubClientSecret,
            teams: teams.teams.map((team) => team.name).join(","),
          })
        ),
      userData: cloudConfig.then((c) => c.rendered),
    },
    {
      ignoreChanges: ["userData"],
    }
  );

  const teleportDns = new cloudflare.Record("teleport-dns", {
    name: "join",
    zoneId: "00c9cdb838d5b14d0a4d1fd926335eee",
    type: "A",
    value: teleportServer.accessPublicIpv4,
    ttl: 360,
  });

  return {
    url: teleportDns.hostname,
    secret: teleportSecret.result,
  };
};
