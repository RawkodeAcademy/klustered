# Kluster 001

## Discovered Symptoms

- Cilium agents were unable to start and in CrashLoopBackoff

## Contributing Factors

- Misconfiguration of Cilium
  - Typo in parameter `install-iptables-rule` which should have been `install-iptables-rules`
  - Cilium doesn't necessarily need `iptables`, this was because it wasn't using eBPF.
  - eBPF not being enabled could have been a contributing factor, but we got the cluster running with the iptables fix.

## Notes from Kluster Breaker

<Please replace this with an explanation of what you broke>
