# État du plan (source de vérité pour les agents cloud)

- repo: `GremTristan/creperie-saas`
- base: `main`
- current: `S0`
- auto_merge: false
- last_pr: none
- blocker: none

## Fait

- SaaS multi-tenant (caisse, KDS, stock, direction)
- Cartes imprimées + inventaire Molard janvier 2026
- Taxonomie friction (canvas local, pas dans ce repo)

## En cours — S0 uniquement

Table `capture_events`, émetteur `lib/capture.ts`, hooks order/stock, script backfill, types `CaptureSource` / `CaptureEventType`.

## Ensuite

S1 → S2 → S3 → S4 (POS à choisir à S4, pas maintenant)
