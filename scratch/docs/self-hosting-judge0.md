# Self-hosting Judge0 (the follow-up to Paiza)

Robinhood grades submissions through Paiza today because it is free, hosted, and
needs no key. This document is the migration path for when that stops being good
enough. Nothing here is required to run the platform now.

**Run this when one of these is true:**

- Paiza's 1.00-second CPU cap starts failing correct solutions. It is not
  configurable on the guest key, and it is the limit you will hit first.
- Paiza closes, rate-limits, or starts refusing traffic. It is an undocumented
  free endpoint with no published terms; the public Piston API closed to the
  public on 2026-02-15 with no notice.
- You need per-problem time or memory limits, or Java/C# with runtimes you
  control.

Until then, self-hosting costs money and attention for no user-visible gain.

## What self-hosting does and does not mean

It means a Linux cloud VM you rent, not your laptop. Judge0 needs privileged
Docker and kernel cgroup settings, and it must stay running for the platform to
grade anything.

If the app goes public, you need a host for the app itself regardless — a laptop
cannot serve a public web app either. So "cloud VM" is a decision you have already
made by going public; this only adds a second machine (or a second service on the
same one) for execution.

## Requirements

- **Linux.** Not WSL, not Docker Desktop on Windows or macOS. Judge0's sandbox
  (`isolate`) needs direct access to host kernel features.
- **Privileged Docker containers.** Many managed container platforms (Cloud Run,
  App Runner, Heroku, most PaaS free tiers) forbid this, so they cannot host
  Judge0. You need a plain VM.
- **cgroup v1.** Boot the kernel with `systemd.unified_cgroup_hierarchy=0`.
  Modern distributions default to v2, and Judge0 fails on v2.
- **Judge0 >= 1.13.1.** Versions up to and including 1.13.0 had three sandbox
  escape CVEs disclosed in 2024. Do not deploy 1.13.0 or earlier on a host that
  runs untrusted code, which is the entire point of the service.
- Roughly 2 vCPU / 4 GB for a small instance. Compilation is the expensive part.

**Piston cannot share the host.** Piston requires cgroup **v2** and Judge0
requires **v1**, and that is a boot-time kernel setting. One host, one of them.

## Deployment sketch

```bash
# On a fresh Ubuntu VM, as root:
#  1. switch to cgroup v1 and reboot
sed -i 's/GRUB_CMDLINE_LINUX_DEFAULT="/&systemd.unified_cgroup_hierarchy=0 /' /etc/default/grub
update-grub && reboot

#  2. install Docker + Compose, then fetch Judge0 (pin the version)
wget https://github.com/judge0/judge0/releases/download/v1.13.1/judge0-v1.13.1.zip
unzip judge0-v1.13.1.zip && cd judge0-v1.13.1

#  3. edit judge0.conf: set REDIS_PASSWORD and POSTGRES_PASSWORD to real values,
#     and set AUTHN_HEADER / AUTHZ_HEADER tokens so the API is not open to the
#     internet. An unauthenticated Judge0 is a free compute service for whoever
#     finds it.
docker compose up -d db redis
sleep 10
docker compose up -d
```

Then point Robinhood at it in `scratch/.env.local`:

```ini
EXECUTION_PROVIDER=judge0
JUDGE0_URL=http://your-judge0-host:2358
JUDGE0_API_KEY=the-token-you-set-in-judge0.conf
JUDGE0_API_HOST=
```

`JUDGE0_API_HOST` only matters for RapidAPI; leave it empty for a self-hosted
instance. The engine sends the key as `X-RapidAPI-Key`, which a self-hosted Judge0
configured with `AUTHN_HEADER=X-RapidAPI-Key` will accept — set that header name in
`judge0.conf` rather than changing the client.

## Verify before trusting it

```bash
node server/scripts/check-judge0.js
```

This is the same script used for the hosted service and it is the whole
verification step. It confirms the key authenticates, checks every language ID the
engine hardcodes against what the instance actually reports (a wrong ID means
submissions get compiled by the wrong compiler and fail for reasons that look like
user error), and drives one real batch create-then-poll end to end. It costs about
four requests and never prints the key.

Do not flip `EXECUTION_PROVIDER` until it exits zero.

## What changes in behaviour

| | Paiza (now) | Self-hosted Judge0 |
| --- | --- | --- |
| CPU limit | fixed 1.00s | yours to set (`cpu_time_limit`) |
| Batching | none — 2 requests per case | one batch create + polls per submission |
| Wall time, 12-case JS problem | ~3s | ~1s |
| Wall time, 12-case C++ problem | ~17s (recompiles per case) | ~2s (compiles once per batch) |
| Node / Python | 16.17.1 / 3.11.13 | 12.14.0 / 3.8.1 on CE 1.13.x |
| Cost | free | VM rent + your time |
| Runs when your laptop is off | yes | yes (it is a VM) |

Note the runtime regression: Judge0 CE 1.13.x ships Node 12 and Python 3.8, older
than Paiza. Optional-chaining (`?.`), nullish coalescing (`??`) and `match` are
compile errors there. If starter code or curated solutions use them, they must be
rewritten or the language images upgraded. `check-judge0.js` prints the runtime
names the live instance reports — believe that over this table.

## Cheaper intermediate option

Before renting a VM, consider the hosted RapidAPI Judge0: EUR 27/month for 2000
submissions/day, no operations work, and the transport in
`server/learning-engine/execution-engine.js` already speaks to it. Steps 1-6 in the
Judge0 block of `scratch/.env.local` cover it. Self-hosting only wins once traffic
makes that price worse than a VM plus maintenance.
