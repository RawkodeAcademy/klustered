# Break 1 - IPTables

I blocked incoming traffic to the API server using IPTables rules.

Additionally, I created a lock on IPTables by using `flock` command.

Both were achieved using a simple script located in `/tmp/klusteriptables.sh`:

```
#!/bin/bash

lock="/run/xtables.lock"
exec 200>$lock
flock -x 200
sleep 86400
exec 200>&-

/sbin/iptables -F
/sbin/iptables  -I INPUT -p tcp -i lo --dport 6443 -j DROP
iptables  -I INPUT -p tcp -i lo --dport 8443 -j DROP
iptables  -I INPUT -p tcp -i lo --dport 2379 -j DROP
```

The script was executed as a cronjob by editing `crontab` with:

```
*/1 * * * * /tmp/klusteriptables.sh
```

# Break 2 - Klustered Deployment

I edited the Klustered Deployment and added a startup probe. The startup probe edited `/etc/resolv.conf` file on the Klustered pods so that they would incorrectly resolve the database domain and fail to connect to the backend database.

```
startupProbe:
  exec:
    command:
      - /bin/sh
      - -c
      - echo "domain klustered.com" >> /etc/resolv.conf
```
