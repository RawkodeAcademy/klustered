#!/usr/bin/env bash
curl https://deb.releases.teleport.dev/teleport-pubkey.asc | apt-key add -
add-apt-repository 'deb https://deb.releases.teleport.dev/ stable main'
DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y teleport
