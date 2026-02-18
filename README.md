# IndustryFuture — e-commerce (Next.js + Laravel) + scraper migration

Ce workspace contient :

- `backend/` : API Laravel 11 (Sanctum, e-commerce)
- `frontend/` : Front Next.js 14 App Router (TS, Tailwind, shadcn/ui, TanStack Query)
- `tools/scraper/` : Scraper Playwright + exports JSON/CSV + images

## Prérequis

- PHP >= 8.3 + Composer
- Node.js >= 20

---

## Backend (Laravel) — `backend/`

### Installer + migrer + seed

```bash
cd backend
composer install
php artisan migrate --seed
```

Seed important :

- Admin: `admin@futurin.space`
- Password: `change-me-123`

### Lancer l’API

```bash
cd backend
php artisan serve
```

Par défaut: `http://127.0.0.1:8000`

### Endpoints (principaux)

Public:

- `GET /api/health`
- `GET /api/categories`
- `GET /api/products?search=&category=&minPrice=&maxPrice=&tag=&sort=(newest|price_asc|price_desc|featured)`
- `GET /api/products/{slug}`

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout` (auth)
- `GET /api/auth/me` (auth)

Customer:

- `GET|POST|PATCH|DELETE /api/cart`
- `POST /api/checkout`
- `GET /api/orders`
- `GET /api/orders/{id}`

Admin (middleware `role:admin`):

- CRUD: `/api/admin/categories`, `/api/admin/products`, `/api/admin/coupons`
- Images: `GET|POST /api/admin/products/{product}/images`, `PATCH|DELETE /api/admin/product-images/{id}`
- Orders: `GET /api/admin/orders`, `PATCH /api/admin/orders/{id}`

---

## Frontend (Next.js) — `frontend/`

### Installer

```bash
cd frontend
npm install
```

### Configurer l’URL API

Créer `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### Lancer

```bash
cd frontend
npm run dev
```

Frontend: `http://localhost:3000`

Pages:

- `/` landing
- `/shop`
- `/product/[slug]`
- `/cart`, `/checkout`
- `/auth/login`, `/auth/register`
- `/account`
- `/admin`, `/admin/products`, `/admin/orders` (protégé par `frontend/middleware.ts`)

---

## Scraper migration — `tools/scraper/`

### Installer

```bash
cd tools/scraper
npm install
npm run playwright:install
```

### Scraper (site source)

- Source: https://avenir-industrie.vercel.app/
- Rate-limit: ~1 req/s
- User-Agent clair
- Retry soft
- Télécharge les images dans `tools/scraper/exports/images/`

Lancer:

```bash
cd tools/scraper
npm run scrape
```

Dry-run (ne télécharge pas / n’écrit pas de fichiers):

```bash
cd tools/scraper
npm run scrape:dry
```

Sorties (mode normal):

- `tools/scraper/exports/products.json`
- `tools/scraper/exports/products.csv`
- `tools/scraper/exports/images/*`

---

## Importer dans Laravel

La commande lit le JSON du scraper, upsert sur `slug`, crée/maj catégories, produits, images.

Elle copie aussi les images locales du scraper dans `backend/public/imports/images/` et stocke l’URL `/imports/images/...`.

```bash
php backend/artisan import:products tools/scraper/exports/products.json
```

Alternative (si vous êtes déjà dans `backend/`) :

```bash
cd backend
php artisan import:products ../tools/scraper/exports/products.json
```

Ensuite, relancez le frontend et vérifiez le catalogue.
