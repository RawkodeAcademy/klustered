#!/usr/bin/env sh
set -e

curl -o /tmp/metadata.json -fsSL https://metadata.platformequinix.com/metadata
jq -r ".customdata" /tmp/metadata.json > /tmp/customdata.json
