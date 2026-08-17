---
layout: ../../layouts/LegalLayout.astro
docId: license
description: The agreement governing installation and use of the Fadebox software, on the Free tier and under a paid license key.
---

Copyright © 2026 MoresApp s.r.o. All rights reserved.

This End User License Agreement (the "**Agreement**") governs the use of the Fadebox software in
binary form, its documentation, and any updates provided to you (together, the "**Software**").
Fadebox is proprietary, closed-source software. By installing or using the Software you agree to
this Agreement.

The "**Licensor**" is MoresApp s.r.o., a limited liability company incorporated under the laws of
the Czech Republic, with its registered seat at Wassermannova 921/6, Hlubočepy, 152 00 Praha 5,
Czech Republic, company identification number (IČO) 09594965, registered in the Commercial
Register kept by the Municipal Court in Prague, Section C, Insert 338394.

<aside class="summary">
<p><strong>About these summaries.</strong> The grey boxes in this document restate the clause next to them in plain language. They are provided for convenience only, they are not part of the Agreement, and where a summary and the clause it accompanies differ, the clause governs.</p>
</aside>

## 1. Definitions

"**Installation**" means one deployed instance of the Software's control plane, identified by the
installation ID it generates at first start, regardless of how many Docker hosts (runtimes) it
manages.

"**License Key**" means a signed license file issued by the Licensor that encodes the licensed
tier, limits, the Installation it was issued for, and the Update Horizon.

"**Free Tier**" means use of the Software without a License Key, subject to the built-in limits
the Software enforces for unlicensed use.

"**Update Horizon**" means the date encoded in a License Key; the License Key covers every version
of the Software released before that date.

<aside class="summary">
<p><strong>Summary.</strong> What you buy is counted per Installation — one control plane — not per person and not per Docker host. The Update Horizon is a date, not an expiry: it decides which releases your key covers.</p>
</aside>

## 2. License grant

**(a) Free.** The Licensor grants you a non-exclusive, non-transferable, royalty-free right to
install and use the Software in the Free Tier, for any purpose including production use.

**(b) Paid tiers.** Subject to payment of the applicable fees, the Licensor grants you a
non-exclusive, non-transferable right to use the Software on the Installation named in your
License Key, within the tier and limits the License Key encodes.

**(c) Perpetual fallback.** Rights to versions released before your License Key's Update Horizon
are perpetual and survive expiry of any subscription. Versions released after the Update Horizon
require a renewed License Key.

<aside class="summary">
<p><strong>Summary.</strong> The Free Tier is free for production use, with no registration and no key. If you stop paying, you keep every version released before your Update Horizon, forever — what lapses is access to newer releases, not the software you already run.</p>
</aside>

## 3. Restrictions

You may not, and may not permit any third party to:

**(a)** distribute, sell, rent, lease, sublicense or otherwise make the Software available to any
third party, including as a hosted or managed service whose substantial value is the
functionality of the Software;

**(b)** reverse engineer, decompile, disassemble or otherwise attempt to derive the source code of
the Software, except to the extent such a restriction is prohibited by applicable law;

**(c)** circumvent, disable or interfere with the License Key functionality or any limit it
enforces, or use one License Key for more than one Installation;

**(d)** remove or obscure any copyright, trademark or license notices in the Software.

<aside class="summary">
<p><strong>Summary.</strong> Run it for your own organisation as much as you like. Do not resell it, do not run it as a service for others, and do not tamper with the license check. One key, one Installation.</p>
</aside>

## 4. License keys and privacy

License Keys are verified locally by cryptographic signature. The Software performs no
license-related network communication, collects no telemetry, and transmits nothing to the
Licensor. Exceeding a licensed limit prevents creating or deploying new resources only; the
Software will not stop or degrade resources that are already running.

<aside class="summary">
<p><strong>Summary.</strong> There is no activation server and no phone-home, on any tier — an air-gapped Installation licenses exactly like any other. Going over a limit blocks new instances; it never stops the ones you are running.</p>
</aside>

## 5. Third-party components

The Software incorporates third-party components licensed under their own permissive terms; the
applicable notices are provided in the `THIRD-PARTY-NOTICES` file distributed with the Software.
The template catalog and the ingress deployment bundle are licensed separately under the Apache
License 2.0 as marked. Container images referenced by templates are pulled by you from their
publishers under those publishers' own terms; the Licensor does not distribute them.

## 6. Support and updates

Support obligations, if any, are those stated for your tier in the applicable order form or on the
Licensor's published price list.

## 7. Termination

This Agreement terminates automatically if you materially breach it and do not cure the breach
within 30 days of notice. On termination you must stop using the Software and destroy your copies.
Sections 3, 8, 9 and 10 survive termination. Termination does not affect rights under section 2(c)
unless the termination was for breach of section 3.

## 8. Warranty disclaimer

<p class="allcaps">THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT.</p>

You are responsible for the security configuration of the Docker hosts the Software manages.

## 9. Limitation of liability

<p class="allcaps">TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE LICENSOR'S AGGREGATE LIABILITY UNDER THIS AGREEMENT IS LIMITED TO THE FEES YOU PAID FOR THE SOFTWARE IN THE TWELVE MONTHS PRECEDING THE CLAIM, AND THE LICENSOR IS NOT LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL OR CONSEQUENTIAL DAMAGES OR LOSS OF DATA OR PROFITS.</p>

Nothing in this Agreement limits liability that cannot be limited under applicable law.

<aside class="summary">
<p><strong>Summary.</strong> Liability is capped at what you paid in the preceding twelve months, and consequential losses are excluded — subject to the liability that law does not allow anyone to exclude.</p>
</aside>

## 10. General

This Agreement is governed by the laws of the Czech Republic, and the courts of the Czech Republic
have exclusive jurisdiction, with venue at the Licensor's registered seat. If a provision is
unenforceable, the remainder stays in effect. This Agreement is the entire agreement concerning
the Software and supersedes prior discussions.
