import { ComponentResource, output, Output } from "@pulumi/pulumi";
import * as google from "@pulumi/google-native";
import * as metal from "@pulumi/equinix-metal";

import { PREFIX } from "./meta";
import { WorkerPool, Config as WorkerPoolConfig } from "./worker-pool";
import { ControlPlane, Config as ControlPlaneConfig } from "./control-plane";

interface Config {
  project: string;
  metro: string;
  kubernetesVersion: string;
  guests: string[];
}

export class Cluster extends ComponentResource {
  readonly name: string;
  readonly config: Config;
  readonly dnsWildcard: Output<string>;
  readonly ingressIp: Output<string>;
  public dnsName?: Output<string>;
  public controlPlane?: ControlPlane;
  private workerPools: { [name: string]: WorkerPool } = {};

  constructor(name: string, config: Config) {
    super(`${PREFIX}:kubernetes:Cluster`, name, config, {});

    this.name = name;
    this.config = config;

    this.ingressIp = new metal.ReservedIpBlock(
      `${name}-ingress`,
      {
        projectId: config.project,
        metro: config.metro,
        type: "public_ipv4",
        quantity: 1,
      },
      {
        parent: this,
      }
    ).address;

    this.dnsWildcard = new google.dns.v1.ResourceRecordSet(
      `${name}-cluster-dns-wildcard`,
      {
        managedZone: "klustered-live-65ef9b5",
        ttl: 360,
        type: "A",
        rrdatas: [this.ingressIp],
        name: `*.${name}.klustered.live.`,
      },
      {
        deleteBeforeReplace: true,
      }
    ).name;
  }

  public createControlPlane(config: ControlPlaneConfig): ControlPlane {
    if (this.controlPlane) {
      throw new Error(
        `Control plane for cluster ${this.name} already specified`
      );
    }

    this.controlPlane = new ControlPlane(this, {
      highAvailability: config.highAvailability,
      plan: config.plan,
      teleport: config.teleport,
    });

    return this.controlPlane;
  }

  public joinToken(): Output<string> | undefined {
    return this.controlPlane?.joinToken.token.apply((t) => t);
  }

  public createWorkerPool(name: string, config: WorkerPoolConfig) {
    this.workerPools[name] = new WorkerPool(this, name, config);
  }
}
