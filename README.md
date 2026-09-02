# Crêpo — portail SaaS pour chaînes de crêperies

Commandes, écran cuisine, caisse, stock et pilotage multi-établissements. Multi-tenant, facturation Stripe par établissement, PWA hors-ligne pour la cuisine.

## Démarrage local

```bash
cp .env.example .env.local        # puis remplir DATABASE_URL, SESSION_SECRET, Stripe
npm install
npm run db:migrate                # applique ./drizzle sur la base
npm run superadmin -- "Vous" vous@editeur.ch "mot-de-passe-long"   # compte éditeur (/admin)
npm run dev
```

Puis ouvrir http://localhost:3000/inscription pour créer une première enseigne cliente (essai 14 jours).

## Architecture

| Couche | Rôle |
| --- | --- |
| `proxy.ts` | Première barrière : cookie signé HMAC vérifié à l'edge, rôle → zone autorisée (`/admin`, `/direction`, `/s/[siteId]/…`, `/api/*`). |
| `lib/session.ts` | Vérité côté serveur : recharge l'utilisateur et l'enseigne en base, vérifie compte actif, abonnement utilisable, appartenance du site. Toutes les actions serveur et routes API passent par `requireDirector` / `requireSiteAccess` / `requireSuperAdmin`. |
| `lib/*-store.ts` | Accès données, toujours filtrés par `tenantId` (isolation multi-tenant). |
| `lib/direction-actions.ts`, `lib/admin-actions.ts`, `lib/auth/actions.ts` | Server Actions (mutations), avec journal d'audit (`lib/audit.ts`). |
| `app/api/{orders,kds,stock}/[siteId]` | API JSON utilisée par les écrans tactiles (polling + file hors-ligne). |
| `lib/offline-queue.ts` + `public/sw.js` | Hors-ligne : mutations en file locale rejouées au retour réseau (idempotence via `clientId`), pages mises en cache par le service worker. |
| `lib/billing/` | Plans, Stripe Checkout / Portal, webhook, synchronisation du nombre d'établissements facturés. |

### Rôles

| Rôle | Connexion | Zone |
| --- | --- | --- |
| Serveur | PIN 4 chiffres sur tablette reliée | `/s/[site]/service`, `/commande`, `/caisse` |
| Cuisinier | PIN 4 chiffres sur tablette reliée | `/s/[site]/cuisine`, `/stock` |
| Directeur | e-mail + mot de passe (10+ car.) | `/direction/*` + tous les écrans de tous ses sites |
| Éditeur (super-admin) | e-mail + mot de passe (12+ car.) | `/admin/*` uniquement |

Une tablette est reliée une fois à un établissement par son **code tablette** (6 caractères, cookie signé 1 an). Elle affiche ensuite le pavé PIN.

## Facturation

Créer dans Stripe deux prix récurrents mensuels (« par établissement »), renseigner `STRIPE_PRICE_ESSENTIEL` / `STRIPE_PRICE_PRO`, et un endpoint webhook vers `/api/stripe/webhook` écoutant :
`checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.payment_failed`, `invoice.paid`.

La quantité de l'abonnement suit automatiquement le nombre d'établissements actifs (`syncSeatCount`).

## Vérifications avant mise en ligne

```bash
npm run typecheck && npm run lint && npm run build
npm run check:permissions -- http://localhost:3000    # serveur lancé : teste chaque URL par rôle
```

`check:permissions` forge des sessions pour chaque rôle et vérifie qu'un serveur ne peut atteindre ni `/direction`, ni `/admin`, ni la cuisine d'un autre site, même en modifiant l'URL.

## Déploiement

Vercel (région `fra1`) + Neon (région `eu-central-1`) pour un hébergement UE. Variables d'environnement : voir `.env.example`. Point de santé : `GET /api/health`.

## RGPD

- Export complet des données : Direction → Réglages → « Exporter toutes mes données » (`/api/export/donnees`).
- Suppression : Direction → Réglages → « Supprimer le compte » (coupe l'accès, puis purge par l'éditeur depuis `/admin` après 30 jours).
- Mentions légales, CGU/CGV et politique de confidentialité : `/mentions-legales`, `/cgu`, `/confidentialite` (identité de l'éditeur via `NEXT_PUBLIC_EDITOR_*`).
