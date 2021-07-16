# Kluster 003

## Discovered Symptoms

- APIServer certificates expired
- CCM not provisioning EIPs for LB services

## Contributing Factors

- APIServer certs modified to expire LESS THAN AN HOUR before the show. Harsh
- Token deleted from CCM secret and it was unable to communicate with Equinix Metal API

## Notes from Kluster Breaker

Justin has posted the Ansible playbook, and notes, for his break [here](https://gitlab.com/jgarr/klustered).
