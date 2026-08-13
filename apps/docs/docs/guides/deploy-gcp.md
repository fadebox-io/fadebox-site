---
title: Deploying on Google Cloud
---

This is the [remote runtimes](remote-runtimes.md) topology as one `terraform apply` on Google
Cloud: a small control-plane VM running Fadebox, a powerful worker VM running only Docker, and the
two connected over mutual TLS — with a GCP-specific improvement over the generic guide: **the
daemon port never faces the internet**. Fadebox reaches it on the worker's VPC-internal address,
and the firewall rule for 2376 matches the control plane's network tag, not an IP you have to keep
in sync.

```
you ──▶ fadebox-control (e2-small): Fadebox app + PostgreSQL, port 8080
              │
              │  tcp://10.10.0.x:2376 — VPC-internal only, mutual TLS
              ▼
        fadebox-worker (e2-standard-8): Docker daemon
              ├── Traefik ingress ◀── *.envs.example.com → static external IP
              └── deployed instances
```

Terraform creates the network, firewall rules, both VMs, static IPs, and the whole TLS story —
CA, server and client certificates — and prints the three PEMs you paste into Fadebox at the end.
Machine types, disk size, region and a Spot worker are all variables.

You need [Terraform](https://developer.hashicorp.com/terraform/install), the `gcloud` CLI
authenticated with application default credentials (`gcloud auth application-default login`), a
project with the Compute Engine API enabled, and — for instance URLs — a domain.

## The files

Put these four files in one directory, plus the compose file from the
[installation page](../getting-started/installation.md) saved as `docker-compose.yml` next to them
— Terraform ships it to the control plane via instance metadata:

```
fadebox-gcp/
├── main.tf
├── variables.tf
├── control-plane-startup.sh
├── worker-startup.sh
└── docker-compose.yml        # verbatim from the installation page
```

### variables.tf

```hcl
variable "project" {
  description = "GCP project id"
  type        = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "zone" {
  description = "Must lie in var.region"
  type        = string
  default     = "us-central1-a"
}

variable "control_machine_type" {
  description = "Fadebox itself is light — 2 GB of RAM is comfortable"
  type        = string
  default     = "e2-small"
}

variable "worker_machine_type" {
  description = "Size this for the environments you intend to run"
  type        = string
  default     = "e2-standard-8"
}

variable "worker_disk_gb" {
  description = "Images, containers and volumes all live here"
  type        = number
  default     = 100
}

variable "worker_spot" {
  description = "Run the worker as a Spot VM — a fraction of the price, but instances die on preemption"
  type        = bool
  default     = false
}

variable "admin_cidr" {
  description = "Who may reach the Fadebox UI on 8080. Narrow this to your own address"
  type        = string
  default     = "0.0.0.0/0"
}

variable "ingress_domain" {
  description = "Wildcard domain for instance URLs, e.g. envs.example.com. Empty skips the DNS record"
  type        = string
  default     = ""
}

variable "dns_managed_zone" {
  description = "Cloud DNS managed zone holding ingress_domain. Empty if DNS lives elsewhere"
  type        = string
  default     = ""
}
```

### main.tf

```hcl
terraform {
  required_providers {
    google = { source = "hashicorp/google" }
    tls    = { source = "hashicorp/tls" }
  }
}

provider "google" {
  project = var.project
  region  = var.region
  zone    = var.zone
}

# ── Network and firewall ────────────────────────────────────────────────────

resource "google_compute_network" "fadebox" {
  name                    = "fadebox"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "fadebox" {
  name          = "fadebox"
  network       = google_compute_network.fadebox.id
  region        = var.region
  ip_cidr_range = "10.10.0.0/24"
}

# SSH via IAP tunnels only — no public port 22.
resource "google_compute_firewall" "ssh_iap" {
  name          = "fadebox-ssh-iap"
  network       = google_compute_network.fadebox.name
  source_ranges = ["35.235.240.0/20"]
  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
}

# The Fadebox UI.
resource "google_compute_firewall" "fadebox_ui" {
  name          = "fadebox-ui"
  network       = google_compute_network.fadebox.name
  source_ranges = [var.admin_cidr]
  target_tags   = ["fadebox-control"]
  allow {
    protocol = "tcp"
    ports    = ["8080"]
  }
}

# Instance URLs on the worker.
resource "google_compute_firewall" "ingress" {
  name          = "fadebox-ingress"
  network       = google_compute_network.fadebox.name
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["fadebox-worker"]
  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }
}

# The Docker daemon — only from the control plane, only VPC-internally.
resource "google_compute_firewall" "docker_tls" {
  name        = "fadebox-docker-tls"
  network     = google_compute_network.fadebox.name
  source_tags = ["fadebox-control"]
  target_tags = ["fadebox-worker"]
  allow {
    protocol = "tcp"
    ports    = ["2376"]
  }
}

# Lets Traefik on the worker call Fadebox — needed for "Require fadebox sign-in".
resource "google_compute_firewall" "worker_to_fadebox" {
  name        = "fadebox-worker-to-control"
  network     = google_compute_network.fadebox.name
  source_tags = ["fadebox-worker"]
  target_tags = ["fadebox-control"]
  allow {
    protocol = "tcp"
    ports    = ["8080"]
  }
}

# ── Addresses ───────────────────────────────────────────────────────────────

resource "google_compute_address" "control" {
  name = "fadebox-control"
}

resource "google_compute_address" "worker" {
  name = "fadebox-worker"
}

# Reserved up front so the server certificate can name it before the VM exists.
resource "google_compute_address" "worker_internal" {
  name         = "fadebox-worker-internal"
  address_type = "INTERNAL"
  subnetwork   = google_compute_subnetwork.fadebox.id
}

# ── TLS material for the Docker daemon ──────────────────────────────────────

resource "tls_private_key" "ca" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "tls_self_signed_cert" "ca" {
  private_key_pem       = tls_private_key.ca.private_key_pem
  is_ca_certificate     = true
  validity_period_hours = 87600 # 10 years
  allowed_uses          = ["cert_signing", "crl_signing"]
  subject {
    common_name = "fadebox-docker-ca"
  }
}

resource "tls_private_key" "server" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "tls_cert_request" "server" {
  private_key_pem = tls_private_key.server.private_key_pem
  ip_addresses    = [google_compute_address.worker_internal.address]
  subject {
    common_name = "fadebox-worker"
  }
}

resource "tls_locally_signed_cert" "server" {
  cert_request_pem      = tls_cert_request.server.cert_request_pem
  ca_private_key_pem    = tls_private_key.ca.private_key_pem
  ca_cert_pem           = tls_self_signed_cert.ca.cert_pem
  validity_period_hours = 26280 # 3 years
  allowed_uses          = ["server_auth", "digital_signature", "key_encipherment"]
}

resource "tls_private_key" "client" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "tls_cert_request" "client" {
  private_key_pem = tls_private_key.client.private_key_pem
  subject {
    common_name = "fadebox"
  }
}

resource "tls_locally_signed_cert" "client" {
  cert_request_pem      = tls_cert_request.client.cert_request_pem
  ca_private_key_pem    = tls_private_key.ca.private_key_pem
  ca_cert_pem           = tls_self_signed_cert.ca.cert_pem
  validity_period_hours = 26280
  allowed_uses          = ["client_auth", "digital_signature"]
}

# ── The two VMs ─────────────────────────────────────────────────────────────

resource "google_compute_instance" "control" {
  name         = "fadebox-control"
  machine_type = var.control_machine_type
  zone         = var.zone
  tags         = ["fadebox-control"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 20
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.fadebox.id
    access_config {
      nat_ip = google_compute_address.control.address
    }
  }

  metadata = {
    startup-script  = file("${path.module}/control-plane-startup.sh")
    fadebox-compose = file("${path.module}/docker-compose.yml")
  }
}

resource "google_compute_instance" "worker" {
  name         = "fadebox-worker"
  machine_type = var.worker_machine_type
  zone         = var.zone
  tags         = ["fadebox-worker"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = var.worker_disk_gb
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.fadebox.id
    network_ip = google_compute_address.worker_internal.address
    access_config {
      nat_ip = google_compute_address.worker.address
    }
  }

  scheduling {
    provisioning_model          = var.worker_spot ? "SPOT" : "STANDARD"
    preemptible                 = var.worker_spot
    automatic_restart           = var.worker_spot ? false : true
    instance_termination_action = var.worker_spot ? "STOP" : null
  }

  metadata = {
    startup-script  = file("${path.module}/worker-startup.sh")
    tls-ca          = tls_self_signed_cert.ca.cert_pem
    tls-server-cert = tls_locally_signed_cert.server.cert_pem
    tls-server-key  = tls_private_key.server.private_key_pem
  }
}

# ── Wildcard DNS, if Cloud DNS hosts the domain ─────────────────────────────

resource "google_dns_record_set" "wildcard" {
  count        = var.dns_managed_zone == "" ? 0 : 1
  managed_zone = var.dns_managed_zone
  name         = "*.${var.ingress_domain}."
  type         = "A"
  ttl          = 300
  rrdatas      = [google_compute_address.worker.address]
}

# ── What you need afterwards ────────────────────────────────────────────────

output "fadebox_url" {
  value = "http://${google_compute_address.control.address}:8080"
}

output "worker_external_ip" {
  description = "Point *.your-ingress-domain here if DNS lives outside Cloud DNS"
  value       = google_compute_address.worker.address
}

output "runtime_docker_host" {
  description = "The Docker host URI for the new runtime"
  value       = "tcp://${google_compute_address.worker_internal.address}:2376"
}

output "runtime_ca_cert" {
  value = tls_self_signed_cert.ca.cert_pem
}

output "runtime_client_cert" {
  value = tls_locally_signed_cert.client.cert_pem
}

output "runtime_client_key" {
  value     = tls_private_key.client.private_key_pem
  sensitive = true
}
```

### control-plane-startup.sh

Runs on every boot; everything in it is guarded, so re-boots are no-ops. It installs Docker, pulls
the compose file out of instance metadata, generates the secrets `.env` once, and starts Fadebox:

```bash
#!/bin/bash
set -euo pipefail

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

mkdir -p /opt/fadebox
cd /opt/fadebox

curl -fsSL -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/instance/attributes/fadebox-compose" \
  -o docker-compose.yml

if [ ! -f .env ]; then
  {
    echo "DOCKER_GID=$(stat -c '%g' /var/run/docker.sock)"
    echo "FADEBOX_SESSION_KEY=$(openssl rand -base64 32)"
    echo "FADEBOX_ENCRYPTION_KEY=$(openssl rand -base64 32)"
    echo "DB_PASSWORD=$(openssl rand -base64 24)"
  } > .env
  chmod 600 .env
fi

docker compose up -d
```

The secrets are generated **on the VM**, not in Terraform, so they never enter the state file.
`FADEBOX_ENCRYPTION_KEY` lives only in `/opt/fadebox/.env` — back it up along with the database
(see [Secrets at rest](../reference/configuration.md#secrets-at-rest)).

### worker-startup.sh

Installs Docker, fetches the TLS material from instance metadata, and puts the daemon on 2376 with
`tlsverify` — including the systemd override that drops the stock `-H fd://` flag, which otherwise
conflicts with `hosts` in `daemon.json`:

```bash
#!/bin/bash
set -euo pipefail

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

md() {
  curl -fsSL -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/instance/attributes/$1"
}

mkdir -p /etc/docker/tls
md tls-ca          > /etc/docker/tls/ca.pem
md tls-server-cert > /etc/docker/tls/server-cert.pem
md tls-server-key  > /etc/docker/tls/server-key.pem
chmod 600 /etc/docker/tls/server-key.pem

cat > /etc/docker/daemon.json <<'EOF'
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2376"],
  "tlsverify": true,
  "tlscacert": "/etc/docker/tls/ca.pem",
  "tlscert": "/etc/docker/tls/server-cert.pem",
  "tlskey": "/etc/docker/tls/server-key.pem"
}
EOF

mkdir -p /etc/systemd/system/docker.service.d
cat > /etc/systemd/system/docker.service.d/override.conf <<'EOF'
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd
EOF

systemctl daemon-reload
systemctl restart docker
```

## Apply

```bash
terraform init
terraform apply -var project=my-project
```

Give the startup scripts two or three minutes after the apply finishes — they still have Docker to
install and images to pull. Then open the URL from the output and fetch the initial `admin`
password from the app log:

```bash
terraform output -raw fadebox_url

gcloud compute ssh fadebox-control --zone us-central1-a --tunnel-through-iap \
  --command 'sudo docker compose --project-directory /opt/fadebox logs app | grep "generated password"'
```

Sign in and change it.

## Register the worker runtime

Under *Settings → Runtimes*, add a runtime and fill it from the Terraform outputs:

```bash
terraform output -raw runtime_docker_host    # → Docker host
terraform output -raw runtime_ca_cert        # → CA certificate
terraform output -raw runtime_client_cert    # → Client certificate
terraform output -raw runtime_client_key     # → Client key
```

Use **Test connection** — it does a real round trip to the daemon. Then disable the seeded `local`
runtime so nothing deploys onto the small VM — see
[the remote runtimes guide](remote-runtimes.md#5-take-the-control-plane-out-of-the-deploy-pool)
for why.

## Ingress and HTTPS

If you set `dns_managed_zone`, the wildcard record already points at the worker; otherwise create
`*.envs.example.com → worker_external_ip` wherever the domain lives. Then, on the worker runtime
under *Settings → Runtimes*, set the **ingress domain** and install the managed ingress stack —
the full story is in [Ingress and instance URLs](ingress.md).

For HTTPS with the wildcard certificate issued through Cloud DNS, create a service account that
may edit the zone and give the runtime its key as ACME settings:

```bash
gcloud iam service-accounts create fadebox-acme
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:fadebox-acme@my-project.iam.gserviceaccount.com" \
  --role=roles/dns.admin
gcloud iam service-accounts keys create acme-key.json \
  --iam-account=fadebox-acme@my-project.iam.gserviceaccount.com
jq -c . acme-key.json    # the single-line form you paste below
```

ACME DNS provider is `gcloud`, and the credentials are two `VAR=value` lines — the key JSON must
be on **one line** (that is what the `jq -c` above produces), because each line is parsed
separately:

```
GCE_PROJECT=my-project
GCE_SERVICE_ACCOUNT={"type":"service_account","project_id":"my-project",...}
```

If you turn on **Require fadebox sign-in**, set
[`FADEBOX_PUBLIC_URL`](../reference/configuration.md#general) on the app container to the URL you
open Fadebox at — Traefik on the worker sends visitors there to sign in, and the
`fadebox-worker-to-control` firewall rule already lets it verify sessions over the VPC.

## What to know about this setup

- **The Terraform state contains private keys** — the Docker CA, server and client keys. Keep it
  where you would keep a password: a remote backend with restricted access, not a public repo.
  The worker's server key also sits in its instance metadata, readable by anyone with compute
  viewer on the project — project IAM is the trust boundary here.
- **The UI is plain HTTP on 8080.** Narrow `admin_cidr` to your own address, and put a
  TLS-terminating proxy in front before letting a team use it.
- **A Spot worker** (`-var worker_spot=true`) is a fine fit for disposable dev environments and a
  poor fit for anything that must stay up: preemption stops the VM and every instance on it.
  Deploys after the restart work unchanged — the reserved internal IP and the TLS material both
  survive.
- **Certificates expire** — the ones above after 3 years. `terraform taint` the cert resources (or
  shorten `validity_period_hours` and let a plan rotate them), re-apply, reboot the worker to
  re-run its startup script, and paste the new client material into the runtime.
- **`terraform destroy` deletes everything**, disks and database included. The only state worth
  backing up first is on the control plane: the PostgreSQL volume and `/opt/fadebox/.env`.
