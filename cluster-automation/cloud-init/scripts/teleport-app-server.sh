#!/usr/bin/env bash
CLUSTER_NAME=$(jq -r ".clusterName" /tmp/customdata.json)
TELEPORT_SECRET=$(jq -r ".teleportSecret" /tmp/customdata.json)
TELEPORT_URL=$(jq -r ".teleportUrl" /tmp/customdata.json)

cat >> /etc/systemd/system/teleport-apps.service <<EOF
[Unit]
Description=Teleport Klustered App Service
After=network.target

[Service]
Type=simple
Restart=on-failure
ExecStart=/usr/local/bin/teleport app start --pid-file=/run/teleport-klustered.pid --auth-server=join.klustered.live --token ${TELEPORT_SECRET} --name=klustered-${CLUSTER_NAME} --uri=http://localhost:30000
ExecReload=/bin/kill -HUP $MAINPID
PIDFile=/run/teleport.pid

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable teleport-apps
systemctl start teleport-apps
