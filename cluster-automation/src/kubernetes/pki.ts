import * as tls from "@pulumi/tls";

export interface CertificateAuthority {
  privateKey: tls.PrivateKey;
  certificate: tls.SelfSignedCert;
}

interface CreateKeyAndCertArgs {
  name: string;
  certificateAuthority: CertificateAuthority;
  isCertificateAuthority: boolean;
}

export interface KeyAndCert {
  privateKey: tls.PrivateKey;
  certificate: tls.LocallySignedCert;
}

const allowedUses = [
  "cert_signing",
  "key_encipherment",
  "server_auth",
  "client_auth",
];

export const createCertificateAuthority = (
  name: string
): CertificateAuthority => {
  const privateKey = new tls.PrivateKey(name, {
    algorithm: "RSA",
    rsaBits: 2048,
  });

  const certificate = new tls.SelfSignedCert(name, {
    validityPeriodHours: 87600,
    earlyRenewalHours: 168,
    isCaCertificate: true,
    privateKeyPem: privateKey.privateKeyPem,
    allowedUses,
    subject: {
      commonName: name,
    },
  });

  return { privateKey, certificate };
};

export const createKeyAndCert = (args: CreateKeyAndCertArgs): KeyAndCert => {
  const privateKey = new tls.PrivateKey(args.name, {
    algorithm: "RSA",
    rsaBits: 2048,
  });

  const certificateRequest = new tls.CertRequest(args.name, {
    privateKeyPem: privateKey.privateKeyPem,
    subject: {
      commonName: args.name,
    },
  });

  const certificate = new tls.LocallySignedCert(args.name, {
    certRequestPem: certificateRequest.certRequestPem,
    caPrivateKeyPem: args.certificateAuthority.privateKey.privateKeyPem,
    caCertPem: args.certificateAuthority.certificate.certPem,
    isCaCertificate: args.isCertificateAuthority,
    validityPeriodHours: 87600,
    earlyRenewalHours: 168,
    allowedUses,
  });

  return {
    privateKey: privateKey,
    certificate: certificate,
  };
};
