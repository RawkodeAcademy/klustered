import { ComponentResource, output, Output } from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";
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

    this.dnsWildcard = new cloudflare.Record(`${name}-cluster-dns-wildcard`, {
      name: `*.${name}`,
      zoneId: "00c9cdb838d5b14d0a4d1fd926335eee",
      type: "A",
      value: this.ingressIp,
      ttl: 360,
    }).hostname;
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
