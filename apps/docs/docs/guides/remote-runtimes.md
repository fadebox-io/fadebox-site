---
title: Remote runtimes
---

Fadebox itself is a small workload — a Quarkus app and a PostgreSQL database, comfortable on the
smallest VM your provider offers. What needs power is the environments it deploys. So don't size
one machine for both: run Fadebox on a small **control-plane VM**, put Docker on a powerful
**worker VM**, and connect the two as a [remote runtime](../concepts/runtimes.md#remote-daemons)
over mutual TLS.

```
users ──▶ control plane (small VM): Fadebox app + PostgreSQL
              │
              │  tcp://worker:2376, mutual TLS
              ▼
          worker (big VM): Docker daemon
              ├── Traefik ingress ◀── *.envs.example.com, ports 80/443
              └── deployed instances
```

Beyond sizing, the split contains blast radius: deploy rights on a runtime are effectively root on
that host, so with this topology that means root on the worker — not on the machine holding the
database, the encryption keys and every stored credential. And it grows sideways: a second worker
is the same recipe again under its own runtime slug and ingress domain.

For the control plane, 1 vCPU and 1 GB of RAM work, 2 GB is comfortable; its disk holds only the
database and the git cache. Size the worker for the environments you intend to run — images,
containers and their volumes all live there.

On Google Cloud, the whole recipe below is a single `terraform apply` — see
[Deploying on Google Cloud](deploy-gcp.md). The steps here are the provider-agnostic version.

## 1. Install Fadebox on the control plane

Follow [Installation](../getting-started/installation.md) as written. The small VM still needs
Docker — Fadebox itself runs as containers on it — but no environments will be deployed there:
step 5 below takes it out of the deploy pool.

## 2. Secure the worker's Docker daemon

Install Docker Engine on the worker, then make the daemon listen on `tcp://` **with TLS client
authentication**.

:::caution

Never expose a Docker daemon on `tcp://` without `tlsverify`. An unauthenticated daemon port is a
root shell on that host for anyone who can reach it — Fadebox will happily connect to one, but you
must not run one.

:::

Generate a CA, a server certificate for the daemon and a client certificate for Fadebox. Run this
anywhere you can keep `ca-key.pem` safe — it can sign new client certificates for this daemon:

```bash
HOST=worker.example.com   # exactly the host you will put in the runtime URI

# CA
openssl genrsa -out ca-key.pem 4096
openssl req -new -x509 -days 3650 -sha256 -subj "/CN=fadebox-docker-ca" \
  -key ca-key.pem -out ca.pem

# Server certificate — the SAN must match the host in the runtime URI
openssl genrsa -out server-key.pem 4096
openssl req -new -subj "/CN=$HOST" -key server-key.pem -out server.csr
printf 'subjectAltName = DNS:%s\nextendedKeyUsage = serverAuth\n' "$HOST" > server-ext.cnf
openssl x509 -req -days 825 -sha256 -in server.csr -CA ca.pem -CAkey ca-key.pem \
  -CAcreateserial -out server-cert.pem -extfile server-ext.cnf

# Client certificate — what Fadebox presents
openssl genrsa -out client-key.pem 4096
openssl req -new -subj "/CN=fadebox" -key client-key.pem -out client.csr
printf 'extendedKeyUsage = clientAuth\n' > client-ext.cnf
openssl x509 -req -days 825 -sha256 -in client.csr -CA ca.pem -CAkey ca-key.pem \
  -CAcreateserial -out client-cert.pem -extfile client-ext.cnf
```

If you will connect by IP instead of a DNS name, put the IP in the SAN:
`subjectAltName = IP:203.0.113.10`.

On the worker, install the server-side material and point the daemon at it:

```bash
sudo mkdir -p /etc/docker/tls
sudo cp ca.pem server-cert.pem server-key.pem /etc/docker/tls/
sudo chmod 600 /etc/docker/tls/server-key.pem
```

`/etc/docker/daemon.json`:

```json
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2376"],
  "tlsverify": true,
  "tlscacert": "/etc/docker/tls/ca.pem",
  "tlscert": "/etc/docker/tls/server-cert.pem",
  "tlskey": "/etc/docker/tls/server-key.pem"
}
```

On systemd distributions the stock unit passes `-H fd://` on the command line, which conflicts
with `hosts` in `daemon.json` and stops the daemon from starting. Drop the flag with an override —
`sudo systemctl edit docker`, then:

```ini
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd
```

Restart with `sudo systemctl restart docker`, then verify the round trip from the control-plane VM
(its Docker CLI is fine for this):

```bash
docker --tlsverify --tlscacert=ca.pem --tlscert=client-cert.pem \
  --tlskey=client-key.pem -H "tcp://$HOST:2376" version
```

Finally the firewall: allow **2376 only from the control-plane VM's address**, open **80 and 443**
to wherever instance URLs should be reachable from, and keep everything else closed. The client
certificate already keeps strangers out of the daemon; the firewall rule is the second, cheaper
layer.

## 3. Register the runtime

In Fadebox, under *Settings → Runtimes*, add a runtime:

- **Docker host** — `tcp://worker.example.com:2376`, the same host the server certificate names.
- **CA certificate** — the contents of `ca.pem`.
- **Client certificate** — `client-cert.pem`.
- **Client key** — `client-key.pem`. Write-only: the API accepts it and never returns it, and it is
  [encrypted at rest](../reference/configuration.md#secrets-at-rest) like every stored credential.

Supply all three PEMs — they are only meaningful together. Then use **Test connection**: it does a
real round trip to the daemon and reports what it found, not merely whether the socket opened.

## 4. Ingress on the worker

Instance URLs on this runtime route through an ingress **on the worker**, so the wildcard DNS
record points at the worker's public IP — not at the control plane:

```
*.envs.example.com → the worker VM
```

Set the **ingress domain** (and HTTPS plus ACME settings, if you want TLS) on the new runtime under
*Settings → Runtimes*, and install the managed ingress stack from the same screen. The full story —
URL shape, wildcard certificates, custom ports — is in
[Ingress and instance URLs](ingress.md).

One thing the split topology adds: if you turn on **Require fadebox sign-in**, Traefik on the
worker calls Fadebox to authorize each request, so the worker must be able to reach Fadebox's URL.
If the address Traefik should use differs from the one in a browser, set
[`FADEBOX_PUBLIC_URL`](../reference/configuration.md#general) on the app container.

## 5. Take the control plane out of the deploy pool

The seeded `local` runtime points at the control-plane VM's own Docker daemon. Disable it under
*Settings → Runtimes* so no environment can land next to the database — a disabled runtime accepts
no new deploys. New deploys then default to the worker, and the small VM stays exactly as small as
you planned.

## Certificates expire

The commands above issue the server and client certificates for 825 days. When they lapse, sign
new ones with the same CA, replace the server material under `/etc/docker/tls/` and restart the
daemon, and paste the new client certificate and key into the runtime. **Test connection** is the
quick way to confirm the renewal took.

## More workers

Repeat steps 2–4 per machine. The same CA can sign every daemon's server certificate — one CA
paste per runtime, no re-generation — but give each worker its own server key pair, and each
runtime its own ingress domain (`eu.envs.example.com`, `us.envs.example.com`) so the wildcard DNS
record of each domain points at the right host. To dedicate a worker to one team, mark its runtime
**Restricted** and list the projects allowed to use it — see
[who may deploy where](../concepts/runtimes.md#who-may-deploy-where).
