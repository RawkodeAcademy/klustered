#!/usr/bin/env bash
GUESTS=$(jq -r ".guests" /tmp/customdata.json)

for username in $(echo ${GUESTS} | tr ',' '\n')
do
  curl -fsSL https://github.com/${username}.keys >> /root/.ssh/authorized_keys
done
