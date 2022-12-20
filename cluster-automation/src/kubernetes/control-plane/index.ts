import { ComponentResource } from "@pulumi/pulumi";
import * as google from "@pulumi/google-native";
import * as pulumi from "@pulumi/pulumi";
import * as metal from "@pulumi/equinix-metal";

import { PREFIX } from "../meta";
import { Cluster } from "../cluster";
import { CertificateAuthority, KeyAndCert } from "./certificates";
import { JoinToken } from "./join-token";
import { cloudConfig } from "./cloud-config";
import { Teleport } from "../../teleport";

export interface Config {
  plan: metal.Plan;
  highAvailability: boolean;
  teleport: Teleport;
}

interface ControlPlaneNode {
  device: metal.Device;
  bgpSession: metal.BgpSession;
}

export class ControlPlane extends ComponentResource {
  readonly cluster: Cluster;
  readonly config: Config;
  readonly certificateAuthority: CertificateAuthority;
  readonly serviceAccountCertificate: KeyAndCert;
  readonly frontProxyCertificate: KeyAndCert;
  readonly etcdCertificate: KeyAndCert;
  readonly joinToken: JoinToken;
  readonly controlPlaneDevices: ControlPlaneNode[] = [];

  constructor(cluster: Cluster, config: Config) {
    super(`${PREFIX}:kubernetes:ControlPlane`, cluster.name, config, {
      parent: cluster,
    });

    this.cluster = cluster;
    this.config = config;

    this.certificateAuthority = new CertificateAuthority(this);

    this.serviceAccountCertificate = new KeyAndCert(
      this.createName("service-accounts"),
      false,
      this.certificateAuthority
    );

    this.frontProxyCertificate = new KeyAndCert(
      this.createName("front-proxy"),
      true,
      this.certificateAuthority
    );

    this.etcdCertificate = new KeyAndCert(
      this.createName("etcd"),
      true,
      this.certificateAuthority
    );

    this.joinToken = new JoinToken(this);

    const controlPlane1 = this.createDevice(1);
    this.controlPlaneDevices.push(controlPlane1);

    this.cluster.dnsName = new google.dns.v1.ResourceRecordSet(
      `${cluster.name}-cluster-dns`,
      {
        managedZone: "klustered-live-65ef9b5",
        ttl: 360,
        type: "A",
        rrdatas: [controlPlane1.device.accessPublicIpv4],
        name: `${cluster.name}.klustered.live.`,
      },
      {
        deleteBeforeReplace: true,
      }
    ).name;

    if (config.highAvailability) {
      const controlPlane2 = this.createDevice(2, [controlPlane1.device]);
      this.controlPlaneDevices.push(controlPlane2);

      const controlPlane3 = this.createDevice(3, [controlPlane2.device]);
      this.controlPlaneDevices.push(controlPlane3);
    }
  }

  createName(name: string) {
    return `${this.cluster.name}-${name}`;
  }

  getPublicIP(): pulumi.Output<string> {
    if (this.controlPlaneDevices.length === 0) {
      throw new Error(
        "Can't request public IP until a control plane device has been created"
      );
    }

    return this.controlPlaneDevices[0].device.accessPublicIpv4;
  }

  createDevice(i: number, dependsOn: metal.Device[] = []): ControlPlaneNode {
    const hostname = `${this.cluster.name}-control-plane-${i}`;

    const device = new metal.Device(
      hostname,
      {
        hostname,
        projectId: this.cluster.config.project,
        metro: this.cluster.config.metro,
        plan: this.config.plan,

        // Not configurable, yet.
        billingCycle: metal.BillingCycle.Hourly,
        operatingSystem: metal.OperatingSystem.Ubuntu2004,
        customData: pulumi
          .all([
            this.cluster.name,
            this.joinToken.token,
            this.cluster.ingressIp,
            this.certificateAuthority.privateKey.privateKeyPem,
            this.certificateAuthority.certificate.certPem,
            this.serviceAccountCertificate.privateKey.privateKeyPem,
            this.serviceAccountCertificate.privateKey.publicKeyPem,
            this.frontProxyCertificate.privateKey.privateKeyPem,
            this.frontProxyCertificate.certificate.certPem,
            this.etcdCertificate.privateKey.privateKeyPem,
            this.etcdCertificate.certificate.certPem,
            this.config.teleport.secret,
            this.config.teleport.url,
          ])
          .apply(
            ([
              clusterName,
              joinToken,
              ingressIp,
              certificateAuthorityKey,
              certificateAuthorityCert,
              serviceAccountKey,
              serviceAccountPublicKey,
              frontProxyKey,
              frontProxyCert,
              etcdKey,
              etcdCert,
              teleportSecret,
              teleportUrl,
            ]) =>
              JSON.stringify({
                clusterName,
                kubernetesVersion: this.cluster.config.kubernetesVersion,
                joinToken,
                ingressIp,
                certificateAuthorityKey,
                certificateAuthorityCert,
                serviceAccountKey,
                serviceAccountPublicKey,
                frontProxyKey,
                frontProxyCert,
                etcdKey,
                etcdCert,
                teleportSecret,
                teleportUrl,
                guests: this.cluster.config.guests.join(","),
              })
          ),
        userData: cloudConfig.then((c) => c.rendered),
      },
      {
        parent: this,
        dependsOn,
      }
    );

    const bgpSession = new metal.BgpSession(
      hostname,
      {
        deviceId: device.id,
        addressFamily: "ipv4",
      },
      {
        parent: this,
        dependsOn: [device],
      }
    );

    return {
      device,
      bgpSession,
    };
  }
}
