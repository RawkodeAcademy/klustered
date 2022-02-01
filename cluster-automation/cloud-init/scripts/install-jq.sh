#!/usr/bin/env sh
set -e

DEBIAN_FRONTEND=noninteractive apt update && apt install -y jq
