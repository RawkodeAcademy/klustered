import * as metal from "@pulumi/equinix-metal";
export { Cluster } from "./cluster";

// export const Cluster = cluster.Cluster;
// export const WorkerPool = workerPools.WorkerPool;

// type ControlPlaneNode = metal.Device;

// export interface ControlPlaneConfig {
//   name: string;
//   kubernetesVersion: string;
//   highlyAvailable: boolean;
//   metro: string;
//   plan: metal.Plan;
//   project: string;
// }

// export interface ControlPlane {
//   ipAddress: pulumi.Output<string>;
//   joinToken: pulumi.Output<string>;
//   certificateAuthorityKey: pulumi.Output<string>;
//   certificateAuthorityCert: pulumi.Output<string>;
//   serviceAccountsPrivateKey: pulumi.Output<string>;
//   serviceAccountsPublicKey: pulumi.Output<string>;
//   serviceAccountsCert: pulumi.Output<string>;
//   frontProxyPrivateKey: pulumi.Output<string>;
//   frontProxyCert: pulumi.Output<string>;
//   etcdPrivateKey: pulumi.Output<string>;
//   etcdCert: pulumi.Output<string>;
// }

// export const createControlPlane = (
//   config: ControlPlaneConfig
// ): ControlPlane => {
//   const controlPlane: ControlPlane = {
//     ipAddress: ip.address,
//     joinToken: pulumi.interpolate`${joinTokenLeft.result}.${joinTokenRight.result}`,
//     certificateAuthorityKey: certificateAuthority.privateKey.privateKeyPem,
//     certificateAuthorityCert: certificateAuthority.certificate.certPem,
//     serviceAccountsPrivateKey:
//       certificates.serviceAccount.privateKey.privateKeyPem,
//     serviceAccountsPublicKey:
//       certificates.serviceAccount.privateKey.publicKeyPem,
//     serviceAccountsCert: certificates.serviceAccount.certificate.certPem,
//     frontProxyPrivateKey: certificates.frontProxy.privateKey.privateKeyPem,
//     frontProxyCert: certificates.frontProxy.certificate.certPem,
//     etcdPrivateKey: certificates.etcd.privateKey.privateKeyPem,
//     etcdCert: certificates.etcd.certificate.certPem,
//   };

//   const controlPlane1: ControlPlaneNode = createControlPlaneNode(
//     1,
//     config,
//     controlPlane,
//     []
//   );

//   if (config.highlyAvailable) {
//     const controlPlane2: ControlPlaneNode = createControlPlaneNode(
//       2,
//       config,
//       controlPlane,
//       [controlPlane1]
//     );
//     const controlPlane3: ControlPlaneNode = createControlPlaneNode(
//       3,
//       config,
//       controlPlane,
//       [controlPlane2]
//     );
//   }

//   return controlPlane;
// };

// const createControlPlaneNode = (
//   number: Number,
//   config: ControlPlaneConfig,
//   controlPlane: ControlPlane,
//   dependsOn: ControlPlaneNode[]
// ): ControlPlaneNode => {
//   const device = new metal.Device(
//     `${config.name}-control-plane-${number}`,
//     {
//       hostname: `${config.name}-control-plane-${number}`,
//       metro: config.metro,
//       billingCycle: metal.BillingCycle.Hourly,
//       plan: config.plan,
//       operatingSystem: metal.OperatingSystem.Ubuntu2004,
//       projectId: config.project,
//       customData: pulumi
//         .all([
//           controlPlane.joinToken,
//           controlPlane.ipAddress,
//           controlPlane.certificateAuthorityKey,
//           controlPlane.certificateAuthorityCert,
//           controlPlane.serviceAccountsPrivateKey,
//           controlPlane.serviceAccountsPublicKey,
//           controlPlane.serviceAccountsCert,
//           controlPlane.frontProxyPrivateKey,
//           controlPlane.frontProxyCert,
//           controlPlane.etcdPrivateKey,
//           controlPlane.etcdCert,
//         ])
//         .apply(
//           ([
//             joinToken,
//             ipAddress,
//             certificateAuthorityKey,
//             certificateAuthorityCert,
//             serviceAccountKey,
//             serviceAccountPublicKey,
//             serviceAccountCert,
//             frontProxyKey,
//             frontProxyCert,
//             etcdKey,
//             etcdCert,
//           ]) =>
//             JSON.stringify({
//               kubernetesVersion: config.kubernetesVersion,
//               joinToken: joinToken,
//               controlPlaneIp: ipAddress,
//               certificateAuthorityKey,
//               certificateAuthorityCert,
//               serviceAccountKey,
//               serviceAccountPublicKey,
//               serviceAccountCert,
//               frontProxyKey,
//               frontProxyCert,
//               etcdKey,
//               etcdCert,
//             })
//         ),
//       userData: cloudConfig.then((c) => c.rendered),
//     },
//     {
//       dependsOn,
//     }
//   );

//   new metal.BgpSession(`${config.name}-${number}`, {
//     deviceId: device.id,
//     addressFamily: "ipv4",
//   });

//   return device;
// };
