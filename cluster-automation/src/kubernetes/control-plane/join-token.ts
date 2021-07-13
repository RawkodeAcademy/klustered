import { all, ComponentResource, Output } from "@pulumi/pulumi";
import * as random from "@pulumi/random";

import { PREFIX } from "../meta";
import { ControlPlane } from "./";

export class JoinToken extends ComponentResource {
  readonly token: Output<string>;

  constructor(controlPlane: ControlPlane) {
    super(
      `${PREFIX}:kubernetes:JoinToken`,
      controlPlane.cluster.name,
      {},
      {
        parent: controlPlane,
      }
    );

    const name = controlPlane.cluster.name;

    const left = new random.RandomString(
      `${name}-left`,
      {
        length: 6,
        special: false,
        lower: true,
        number: true,
        upper: false,
      },
      { parent: this }
    );

    const right = new random.RandomString(
      `${name}-right`,
      {
        length: 16,
        special: false,
        lower: true,
        number: true,
        upper: false,
      },
      { parent: this }
    );

    this.token = all([left.result, right.result]).apply(
      ([left, right]) => `${left}.${right}`
    );
  }
}
