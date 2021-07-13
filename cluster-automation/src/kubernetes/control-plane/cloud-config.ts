import * as cloudinit from "@pulumi/cloudinit";
import * as fs from "fs";

export const cloudConfig = cloudinit.getConfig({
  gzip: false,
  base64Encode: false,
  parts: [
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/wait-for-bgp-enabled.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/download-metadata.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/add-bgp-routes.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/base-packages.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync("../cloud-init/scripts/containerd.sh", "utf8"),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/kubernetes-prerequisites.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/kubernetes-packages.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/kubernetes-kubeadm-config.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/kubernetes-kubeadm-certs.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync("../cloud-init/scripts/kube-vip.sh", "utf8"),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/kubernetes-kubeadm-exec.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync("../cloud-init/scripts/helm.sh", "utf8"),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync("../cloud-init/scripts/cni-cilium.sh", "utf8"),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync("../cloud-init/scripts/ccm-disable.sh", "utf8"),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/kube-vip-daemonset.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/net-deny-metadata.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync("../cloud-init/scripts/ingress.sh", "utf8"),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/teleport-install.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/teleport-server.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/teleport-restart.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/klustered-workload.sh",
        "utf8"
      ),
    },
  ],
});

// import { ComponentResource, ComponentResourceOptions } from "@pulumi/pulumi";
// import * as cloudinit from "@pulumi/cloudinit";
// import * as metal from "@pulumi/equinix-metal";
// import * as fs from "fs";

// import { Cluster } from "./cluster";

// // let counter = 1;

// // const createWorkerPoolNode = (
// //   workerPool: WorkerPool,
// //   name: string,
// //   workerPoolConfig: WorkerPoolConfig,
// //   num: number
// // ): WorkerNode => {
// //   const device = new metal.Device(
// //     `worker-${name}-${counter++}`,
// //     {
// //       hostname: `worker-${name}-${counter}`,
// //       metro: workerPoolConfig.metro,
// //       billingCycle: metal.BillingCycle.Hourly,
// //       plan: workerPoolConfig.plan,
// //       operatingSystem: metal.OperatingSystem.Ubuntu2004,
// //       projectId: workerPoolConfig.project,
// //       customData: pulumi
// //         .all([
// //           workerPoolConfig.controlPlane.joinToken,
// //           workerPoolConfig.controlPlane.ipAddress,
// //         ])
// //         .apply(([joinToken, ipAddress]) =>
// //           JSON.stringify({
// //             kubernetesVersion: workerPoolConfig.kubernetesVersion,
// //             joinToken: joinToken,
// //             controlPlaneIp: ipAddress,
// //           })
// //         ),
// //       userData: cloudConfig.then((c) => c.rendered),
// //     },
// //     {
// //       parent: workerPool,
// //     }
// //   );

// //   return device;
// // };
