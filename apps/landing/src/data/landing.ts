/**
 * Content for the Fadebox landing page, mirrored from the design handoff.
 * Copy is intentional; keep it in sync with product messaging.
 */

/**
 * Primary CTA destinations. The design ships these as anchors; wire them to the
 * real docs/install page and contact/scheduling link when those exist.
 */
const base = import.meta.env.BASE_URL; // "/fadebox-site/" — respects Astro's base path
export const links = {
  install: `${base}docs/install`, // "Install self-hosted"
  demo: `${base}contact`, // "Request a demo"
  docs: `${base}docs/`,
  // Points at the CI guide until a generated OpenAPI reference exists at docs/api.
  apiDocs: `${base}docs/guides/ci-api-keys`,
  github: "https://github.com/fadebox",
  contact: `${base}contact`,
};

/**
 * Flip this to `false` to remove the pricing section entirely (also drops the
 * "Pricing" nav link).
 */
export const showPricing = true;

export interface Feature {
  title: string;
  body: string;
  /** Key of the `icons` record in `Icon.astro`. */
  icon: string;
}

export const features: Feature[] = [
  {
    title: "Ephemeral by design",
    body: "Spin up an isolated copy of your whole stack per branch, dev, or demo — destroy it when done.",
    icon: "timer",
  },
  {
    title: "Preview URL per instance",
    body: "Every service gets {instance}-{service}.your-domain with wildcard TLS via built-in ingress.",
    icon: "globe",
  },
  {
    title: "Compose-native templates",
    body: "Service templates are the Compose YAML you already write. No new DSL to learn.",
    icon: "file-code",
  },
  {
    title: "Multi-runtime",
    body: "Target local or remote Docker daemons over mTLS. Spread instances across hosts.",
    icon: "server",
  },
  {
    title: "Template catalog",
    body: "Import ready-made services — Postgres, Redis, RabbitMQ, Keycloak, Mailpit and more.",
    icon: "grid",
  },
  {
    title: "Git value sources",
    body: "Pull config values straight from your repos, so environments track your branches.",
    icon: "git-branch",
  },
];

export interface Step {
  num: string;
  title: string;
  body: string;
}

export const steps: Step[] = [
  { num: "01", title: "Point at a runtime", body: "Register a Docker daemon and set your ingress domain." },
  { num: "02", title: "Import templates", body: "From the catalog or your own Compose files." },
  { num: "03", title: "Compose an environment", body: "Pick the services a branch of your app needs." },
  { num: "04", title: "Deploy an instance", body: "Get a URL. Tear it down when the branch merges." },
];

export interface Tier {
  name: string;
  price: string;
  /** Billing unit, shown next to the price. Empty on the free tier. */
  priceNote: string;
  body: string;
  /**
   * The tier in one spec line. Deliberately the only detail on the card —
   * features and support live in the comparison table below, so the cards
   * stay short and equal-height.
   */
  caps: string;
  cta: string;
  ctaHref: string;
  ctaVariant: "primary" | "secondary";
  /** Emphasized tier gets a 2px brand border. */
  emphasized: boolean;
}

/**
 * Tiers, caps and prices come from fadebox's business-model design note
 * (`fadebox/docs/design/business-model.md`, §Decision 1 and §Decision 2;
 * feature split revised 2026-08-08). Open core with an offline licence key,
 * and the billing unit is the installation — never the seat.
 *
 * Features are free, scale is paid, compliance is Enterprise: the Free tier is
 * the whole product — registries, git values, SSO, RBAC, nothing gated —
 * Team raises the caps, and only the Enterprise compliance set is feature-
 * gated. Runtimes carry the price — they track how large a customer is;
 * instances per runtime is a published second rung, set commercially.
 * Neither number is derived from a technical ceiling: licence limits express
 * what we sell, and host limits are an operations concern.
 */
export const tiers: Tier[] = [
  {
    name: "Free",
    price: "€0",
    priceNote: "",
    body: "The whole product with caps — not a crippled build. Every feature, offline, on your own hardware.",
    caps: "1 runtime · 5 instances · 5 users",
    cta: "Install",
    ctaHref: links.install,
    ctaVariant: "secondary",
    emphasized: false,
  },
  {
    name: "Team",
    price: "€990",
    priceNote: "per year, per installation",
    body: "The same product, more of it. Adding developers never changes the bill.",
    caps: "5 runtimes · 20 instances each · unlimited users",
    cta: "Get a licence",
    ctaHref: links.contact,
    ctaVariant: "primary",
    emphasized: true,
  },
  {
    name: "Enterprise",
    price: "€2,990",
    priceNote: "per year, per installation",
    body: "For a fleet of hosts, an identity provider to integrate with, and a security review to pass.",
    caps: "Unlimited everything · compliance features",
    cta: "Talk to sales",
    ctaHref: links.contact,
    ctaVariant: "secondary",
    emphasized: false,
  },
];

export interface TierTableRow {
  label: string;
  /** One cell per tier, in the order of {@link tiers}. */
  values: [string, string, string];
}

/**
 * The tier comparison as bare numbers — the at-a-glance complement to the
 * cards. With features free on every tier, the numbers *are* the comparison,
 * so this stays short: the three counted caps, then the two rows that say
 * everything else is identical except compliance.
 */
export const tierTable: TierTableRow[] = [
  { label: "Runtimes (Docker hosts)", values: ["1", "5", "Unlimited"] },
  { label: "Concurrent instances, per runtime", values: ["5", "20", "Unlimited"] },
  { label: "Users", values: ["5", "Unlimited", "Unlimited"] },
  { label: "Service accounts for CI", values: ["3", "Unlimited", "Unlimited"] },
  { label: "Projects, environments, templates", values: ["Unlimited", "Unlimited", "Unlimited"] },
  { label: "Every product feature", values: ["✓", "✓", "✓"] },
  { label: "IdP group mapping · SCIM · audit log · KMS", values: ["—", "—", "✓"] },
  { label: "Support", values: ["Community", "Email, next business day", "SLA, named contact"] },
];

export interface LicenceNote {
  title: string;
  body: string;
}

/**
 * The licensing promises from `business-model.md` §Decision 3 — the part that
 * differentiates fadebox from metered competitors, so it belongs on the page
 * rather than buried in a EULA.
 */
export const licenceNotes: LicenceNote[] = [
  {
    title: "No phone-home, ever",
    body: "A licence is a signed file you paste in. Verification is a local signature check — nothing leaves your host, including in air-gapped installs.",
  },
  {
    title: "Priced per installation",
    body: "One flat annual number, not a per-seat calculation. Give everyone an account; the bill stays the same.",
  },
  {
    title: "Your instances are never held hostage",
    body: "Caps are checked when you create or deploy. Running instances are never stopped — not on overage, not on expiry.",
  },
  {
    title: "Expiry stops updates, not features",
    body: "The version you paid for keeps every feature, forever. Lapsing means falling behind on releases, not a broken environment.",
  },
];
