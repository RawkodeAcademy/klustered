# Kluster 002

## Discovered Symptoms

- SSH running on non-standard port
- Unresponsive API Server
- API Server in CrashloopBackoff

## Contributing Factors

- SSH was configured to run on 2222
- Kubernetes nodes couldn't communicate with each other due to excessive `ufw` configuration
- API Server was restarting due to misconfiguration of kubelet, notably with an eviction hard limit if the node had less than 62G RAM

## Notes from Kluster Breaker

<Please replace this with an explanation of what you broke>
