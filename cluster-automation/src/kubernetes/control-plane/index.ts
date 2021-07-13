import { ComponentResource } from "@pulumi/pulumi";
import * as pulumi from "@pulumi/pulumi";
import * as metal from "@pulumi/equinix-metal";

import { PREFIX } from "../meta";
import { Cluster } from "../cluster";
import { CertificateAuthority, KeyAndCert } from "./certificates";
import { JoinToken } from "./join-token";
import { cloudConfig } from "./cloud-config";

const pulumiConfig = new pulumi.Config();
const guests: string[] = pulumiConfig.requireObject("guests");

export interface Config {
  plan: metal.Plan;
  highAvailability: boolean;
  teleportSecret: pulumi.Output<string>;
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
            this.joinToken.token,
            this.cluster.controlPlaneIp,
            this.cluster.ingressIp,
            this.certificateAuthority.privateKey.privateKeyPem,
            this.certificateAuthority.certificate.certPem,
            this.serviceAccountCertificate.privateKey.privateKeyPem,
            this.serviceAccountCertificate.privateKey.publicKeyPem,
            this.frontProxyCertificate.privateKey.privateKeyPem,
            this.frontProxyCertificate.certificate.certPem,
            this.etcdCertificate.privateKey.privateKeyPem,
            this.etcdCertificate.certificate.certPem,
            this.config.teleportSecret,
            this.cluster.dnsName,
          ])
          .apply(
            ([
              joinToken,
              controlPlaneIp,
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
              dnsName,
            ]) =>
              JSON.stringify({
                kubernetesVersion: this.cluster.config.kubernetesVersion,
                joinToken,
                controlPlaneIp,
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
                dnsName,
                guests: guests.join(","),
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
