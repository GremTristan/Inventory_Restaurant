# Harness cloud — puits de données (un sprint par agent)

Tu es un agent cloud sur `https://github.com/GremTristan/creperie-saas`.
Lis `docs/PLAN-STATE.md` **avant** de coder. N’implémente **que** le sprint `current`.
Quand tu as fini : PR unique, mets à jour `PLAN-STATE.md` dans la même PR, arrête-toi.

## Produit

Cerveau sur la caisse, pas une caisse concurrente. Zéro saisie nouvelle en salle dans S0–S1.
Friction : épuiser niveau 0 (déjà en base) avant OCR / CRM / IoT.
Suisse : CHF, TWINT — pas les taux TVA FR 10 / 5,5 / 20.

## Non-négociable

- Next.js de ce repo : lire `node_modules/next/dist/docs/` avant d’écrire des routes App Router.
- Multi-tenant : toute table métier a `tenant_id` ; requêtes toujours filtrées.
- Pas de jargon dans l’UI (serveur / cuisine / direction).
- Pas de NF525, pas de plan de salle, pas de CRM, pas de HACCP, pas de Zelty **sauf si** `current` = S4.
- Ne pas inventer de recettes / prix. Recettes existantes : `scripts/data/`.
- `npm run typecheck` et `npm run lint` verts. Pas de secrets (`.env*`) dans le git.
- Une PR = un sprint. Branche `capture/s<n>-<slug>`. Titre : `capture(S0): …`

## Contrat TicketNormalized (cible S0)

```ts
type CaptureSource = "native" | "zelty" | "addition" | "lightspeed" | "square" | "ocr" | "backfill";
type CaptureEventType =
  | "order.created" | "order.sent" | "order.ready" | "order.served"
  | "order.paid" | "order.cancelled" | "order.appended"
  | "stock.sale" | "stock.count" | "stock.waste" | "stock.adjust";
```

Table `capture_events` : id uuid, tenant_id, site_id, occurred_at timestamptz, type text, source text, order_id uuid null, inventory_item_id uuid null, payload jsonb, idempotency_key text unique.

Émettre depuis `lib/order-store.ts` et `lib/inventory-store.ts` via `lib/capture.ts` (fire-and-forget comme `lib/audit.ts` : jamais casser l’encaissement).

Idempotence : `idempotency_key` = `${tenantId}:${type}:${orderId|itemId}:${occurredAt iso or status}`.

## Sprints (faire uniquement `current`)

| id | Livrable |
|----|----------|
| S0 | `capture_events` + migration Drizzle + `lib/capture.ts` + hooks stores + `scripts/backfill-capture.ts` + types. Pas d’UI. |
| S1 | Direction : délais KDS p50/p90, CA par serveur, durée table, annulés/waste, export CSV tickets brut. Lecture seule. |
| S2 | 15 plats tête de gondole Molard : quantités recette réelles, coût/marge direction, écart théorique vs count. Le reste « non chiffré ». |
| S3 | OCR structuré sur `receipts` → lignes proposées, matching stock, `supplier_prices`, validation directeur. |
| S4 | Un adaptateur POS externe → TicketNormalized (celui indiqué dans PLAN-STATE). Idempotent. |

## Definition of done (chaque PR)

1. `npm run typecheck` && `npm run lint`
2. `docs/PLAN-STATE.md` : `current` avance au sprint suivant **seulement** si ce sprint est vraiment livré ; sinon laisser `current` et noter le blocker.
3. Corps de PR : résumé 3 puces + comment tester (commandes, pages).
4. Ne merge pas toi-même sauf si PLAN-STATE dit `auto_merge: true`.

## Si tu es bloqué

Écris le blocker en tête de `PLAN-STATE.md` et ouvre quand même une PR draft avec ce qui compile. Ne commence pas le sprint suivant.
