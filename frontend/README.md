## Backend Next.js intégré

Le backend Laravel a été remplacé par une API Next.js native exposée via `src/app/api/[[...path]]/route.ts`.

## Variables d'environnement

Copiez `frontend/.env.example` puis renseignez au minimum :

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/industryfuture?schema=public"
AUTH_SECRET="une-cle-longue-et-secrete"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
BLOB_READ_WRITE_TOKEN=""
```

Notes :

 - `DATABASE_URL` doit pointer vers une base PostgreSQL compatible Vercel/Neon/Supabase.
 - `BLOB_READ_WRITE_TOKEN` est requis pour les uploads admin et les photos de demandes d'import.
 - le flux de paiement est actuellement en mode mock interne, ce qui permet de valider le tunnel complet sans dépendre du backend Laravel.

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

Le build a été validé avec succès après la migration backend.
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
