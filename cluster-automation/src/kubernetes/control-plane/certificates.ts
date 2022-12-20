import { ComponentResource } from "@pulumi/pulumi";
import * as tls from "@pulumi/tls";

import { PREFIX } from "../meta";
import { ControlPlane } from "./";

export class CertificateAuthority extends ComponentResource {
  readonly privateKey: tls.PrivateKey;
  readonly certificate: tls.SelfSignedCert;

  constructor(controlPlane: ControlPlane) {
    super(
      `${PREFIX}:kubernetes:CertificateAuthority`,
      controlPlane.cluster.name,
      {},
      { parent: controlPlane }
    );

    this.privateKey = new tls.PrivateKey(
      controlPlane.cluster.name,
      {
        algorithm: "RSA",
        rsaBits: 2048,
      },
      { parent: this }
    );

    this.certificate = new tls.SelfSignedCert(
      controlPlane.cluster.name,
      {
        validityPeriodHours: 87600,
        earlyRenewalHours: 168,
        isCaCertificate: true,
        privateKeyPem: this.privateKey.privateKeyPem,
        allowedUses: [
          "cert_signing",
          "key_encipherment",
          "server_auth",
          "client_auth",
        ],
        subject: {
          commonName: controlPlane.cluster.name,
        },
      },
      { parent: this }
    );
  }
}

export class KeyAndCert extends ComponentResource {
  readonly privateKey: tls.PrivateKey;
  readonly certificateSigningRequest: tls.CertRequest;
  readonly certificate: tls.LocallySignedCert;

  constructor(
    name: string,
    isCertificateAuthority: boolean,
    certificateAuthority: CertificateAuthority
  ) {
    super(
      `${PREFIX}:kubernetes:KeyAndCert`,
      name,
      {},
      { parent: certificateAuthority }
    );

    this.privateKey = new tls.PrivateKey(
      name,
      {
        algorithm: "RSA",
        rsaBits: 2048,
      },
      { parent: this }
    );

    this.certificateSigningRequest = new tls.CertRequest(
      name,
      {
        privateKeyPem: this.privateKey.privateKeyPem,
        subject: {
          commonName: name,
        },
      },
      { parent: this }
    );

    this.certificate = new tls.LocallySignedCert(
      name,
      {
        certRequestPem: this.certificateSigningRequest.certRequestPem,
        caPrivateKeyPem: certificateAuthority.privateKey.privateKeyPem,
        caCertPem: certificateAuthority.certificate.certPem,
        isCaCertificate: isCertificateAuthority,
        validityPeriodHours: 87600,
        earlyRenewalHours: 168,
        allowedUses: [
          "cert_signing",
          "key_encipherment",
          "server_auth",
          "client_auth",
        ],
      },
      { parent: this }
    );
  }
}
