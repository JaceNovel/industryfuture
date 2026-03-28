## Backend Next.js intégré

Le backend Laravel a été remplacé par une API Next.js native exposée via `src/app/api/[[...path]]/route.ts`.

## Variables d'environnement

Copiez `frontend/.env.example` puis renseignez au minimum :

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/industryfuture?schema=public"
AUTH_SECRET="une-cle-longue-et-secrete"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
BLOB_READ_WRITE_TOKEN=""
FEDAPAY_API_KEY=""
FEDAPAY_SECRET_KEY=""
FEDAPAY_ENV="sandbox"
FEDAPAY_ACCOUNT_ID=""
FEDAPAY_AUTO_SEND_MODE=""
FEDAPAY_WEBHOOK_SECRET=""
FEDAPAY_WEBHOOK_TOLERANCE=""
```

Notes :

 - `DATABASE_URL` doit pointer vers une base PostgreSQL compatible Vercel/Neon/Supabase.
 - `BLOB_READ_WRITE_TOKEN` est requis pour les uploads admin et les photos de demandes d'import.
 - le code accepte `FEDAPAY_API_KEY` ou `FEDAPAY_SECRET_KEY`. Si l'un des deux est défini, le checkout, le repaiement de commande et le paiement des demandes d'import passent par FedaPay.
 - `FEDAPAY_ENV` accepte `sandbox` ou `live`.
 - `FEDAPAY_ACCOUNT_ID` est optionnel selon votre compte/marchand FedaPay.
 - `FEDAPAY_AUTO_SEND_MODE` est optionnel. Renseignez une valeur comme `mtn_open`, `moov`, `celtiis` ou un autre mode supporté par votre compte pour déclencher `sendNowWithToken(...)` automatiquement quand un numéro client est disponible.
 - `FEDAPAY_WEBHOOK_SECRET` et `FEDAPAY_WEBHOOK_TOLERANCE` sont utilisés par le webhook serveur pour valider la signature FedaPay et resynchroniser le statut réel du paiement.
 - sans configuration FedaPay, l'application retombe sur le flux mock interne pour garder un tunnel de paiement testable.

## Bootstrap admin (prod)

Sur une base vide (nouveau `DATABASE_URL`), aucun admin n'existe par défaut. Pour éviter d'être bloqué (login en 422 + routes admin en 401), vous pouvez définir sur Vercel :

- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD` (min 8 caractères)
- `BOOTSTRAP_ADMIN_NAME` (optionnel)

Au moment du build Vercel, un compte admin sera créé automatiquement si l'email n'existe pas encore.

## Persistance des images

Les uploads faits depuis l'admin passent par Vercel Blob et restent persistants après redéploiement.

Attention : si vous importez des produits depuis une ancienne base Laravel contenant des URLs de type `/storage/...`, ces fichiers ne sont pas persistants sur Vercel par défaut. Le script d'import essaie maintenant de recopier ces médias vers Vercel Blob quand `BLOB_READ_WRITE_TOKEN` est configuré.

Pour corriger des enregistrements déjà importés avec des URLs legacy cassées, utilisez :

```bash
npm run backfill:legacy-media
```

Optionnel : si les anciens fichiers ne sont plus disponibles sur `api.futurind.space`, définissez `LEGACY_ASSET_BASE_URL` vers une origine encore accessible qui expose les mêmes chemins `/storage/...` avant d'exécuter le script.

## Démarrage local

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

## Build production

```bash
npm run build
```

Sur Vercel, le build exécute aussi une étape Prisma de déploiement de schéma (création des tables si la base est vide) avant `next build`. Assurez-vous que `DATABASE_URL` pointe vers une base PostgreSQL accessible depuis Vercel.

Le build a été validé avec succès après la migration backend.

## Import catalogue

Si vous récupérez un ancien export `products.json`, vous pouvez l'injecter dans la base Prisma actuelle avec :

```bash
npm run import:products -- ../tools/scraper/exports/products.json
```

Notes :

 - le format attendu correspond à l'ancien export du scraper/Laravel (`name`, `slug`, `description`, `price`, `categories`, `images`)
 - les images locales sont envoyées vers Vercel Blob si `BLOB_READ_WRITE_TOKEN` est configuré
 - sans token Blob, les images locales sont ignorées mais les produits et catégories sont importés

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
