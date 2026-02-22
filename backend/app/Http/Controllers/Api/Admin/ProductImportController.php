<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductImportController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'products' => ['required', 'array', 'min:1'],
            'dry_run' => ['sometimes', 'boolean'],
            'skip_existing' => ['sometimes', 'boolean'],
            'download_images' => ['sometimes', 'boolean'],
            'source_site' => ['nullable', 'string', 'max:255'],
        ]);

        $dryRun = (bool)($validated['dry_run'] ?? false);
        $skipExisting = (bool)($validated['skip_existing'] ?? true);
        $downloadImages = (bool)($validated['download_images'] ?? true);
        $sourceSite = $validated['source_site'] ?? null;

        $created = 0;
        $skipped = 0;
        $errors = [];

        foreach ($validated['products'] as $idx => $payload) {
            try {
                $name = trim((string)($payload['name'] ?? ''));
                if ($name === '') {
                    throw new \InvalidArgumentException('Missing name');
                }

                $incomingSlug = Str::slug((string)($payload['slug'] ?? $name));
                $sourceKey = null;
                if ($sourceSite && $incomingSlug) {
                    $sourceKey = $sourceSite.'|'.$incomingSlug;
                }

                $sourceUrl = $payload['source_url'] ?? $payload['sourceUrl'] ?? null;
                if ($skipExisting) {
                    if ($sourceKey) {
                        $exists = Product::query()->where('metadata->source_key', $sourceKey)->exists();
                        if ($exists) {
                            $skipped++;
                            continue;
                        }
                    } elseif ($sourceUrl) {
                        $exists = Product::query()->where('metadata->source_url', $sourceUrl)->exists();
                        if ($exists) {
                            $skipped++;
                            continue;
                        }
                    }
                }

                $slugBase = $payload['slug'] ?? Str::slug($name);
                $slug = $this->uniqueSlug($slugBase);

                $categories = $payload['categories'] ?? [];
                if (!is_array($categories)) $categories = [];

                $metadata = is_array($payload['metadata'] ?? null) ? $payload['metadata'] : [];
                if ($sourceUrl) $metadata['source_url'] = $sourceUrl;
                if ($sourceSite) $metadata['source_site'] = $sourceSite;
                if ($sourceKey) $metadata['source_key'] = $sourceKey;

                if ($dryRun) {
                    $created++;
                    continue;
                }

                $product = Product::create([
                    'name' => $name,
                    'slug' => $slug,
                    'description' => $payload['description'] ?? null,
                    'price' => (float)($payload['price'] ?? 0),
                    'compare_at_price' => $payload['compare_at_price'] ?? null,
                    'stock' => (int)($payload['stock'] ?? 999),
                    'status' => in_array(($payload['status'] ?? ''), ['draft', 'active'], true) ? $payload['status'] : 'draft',
                    'tag_delivery' => in_array(($payload['tag_delivery'] ?? ''), ['PRET_A_ETRE_LIVRE', 'SUR_COMMANDE'], true) ? $payload['tag_delivery'] : 'SUR_COMMANDE',
                    'delivery_delay_days' => $payload['delivery_delay_days'] ?? null,
                    'sku' => $payload['sku'] ?? null,
                    'metadata' => $metadata,
                    'featured' => (bool)($payload['featured'] ?? false),
                    'is_promo' => (bool)($payload['is_promo'] ?? false),
                ]);

                if (!empty($categories)) {
                    $categoryIds = $this->resolveCategoryIds($categories);
                    $product->categories()->sync($categoryIds);
                }

                $images = $payload['images'] ?? [];
                if (is_array($images) && !empty($images)) {
                    $this->importImages($product, $images, $downloadImages);
                }

                $created++;
            } catch (\Throwable $e) {
                $errors[] = [
                    'index' => $idx,
                    'message' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'dry_run' => $dryRun,
            'created' => $created,
            'skipped' => $skipped,
            'errors' => $errors,
        ]);
    }

    private function uniqueSlug(string $base): string
    {
        $slug = Str::slug($base);
        $try = $slug;
        $i = 2;

        while (Product::query()->where('slug', $try)->exists()) {
            $try = $slug.'-'.$i;
            $i++;
        }

        return $try;
    }

    private function resolveCategoryIds(array $categoryNamesOrSlugs): array
    {
        $ids = [];
        foreach ($categoryNamesOrSlugs as $value) {
            $value = trim((string)$value);
            if ($value === '') continue;
            $slug = Str::slug($value);
            $category = Category::firstOrCreate(
                ['slug' => $slug],
                ['name' => $value, 'description' => null, 'image_url' => null]
            );
            $ids[] = $category->id;
        }
        return array_values(array_unique($ids));
    }

    private function importImages(Product $product, array $images, bool $downloadImages): void
    {
        $max = 10;
        $count = 0;

        foreach ($images as $im) {
            if ($count >= $max) break;
            if (!is_array($im)) continue;

            $url = $im['url'] ?? $im['original_url'] ?? $im['source_url'] ?? $im['src'] ?? null;
            $alt = $im['alt'] ?? $product->name;
            $sortOrder = (int)($im['sort_order'] ?? $count);

            if (!is_string($url) || trim($url) === '') continue;
            $url = trim($url);

            $finalUrl = $url;

            if ($downloadImages) {
                $finalUrl = $this->downloadAndStoreImage($url, $product->slug, $sortOrder);
            }

            ProductImage::create([
                'product_id' => $product->id,
                'url' => $finalUrl,
                'alt' => is_string($alt) ? $alt : null,
                'sort_order' => $sortOrder,
            ]);

            $count++;
        }
    }

    private function downloadAndStoreImage(string $url, string $slug, int $sortOrder): string
    {
        $res = Http::timeout(25)
            ->withHeaders([
                'User-Agent' => 'IndustryFutureImporter/1.0',
                'Accept' => 'image/*,*/*;q=0.8',
            ])
            ->get($url);

        if (!$res->ok()) {
            throw new \RuntimeException('Image download failed: HTTP '.$res->status());
        }

        $contentType = (string)($res->header('content-type') ?? '');
        $allowed = ['image/jpeg' => 'jpg', 'image/jpg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        $ext = null;

        foreach ($allowed as $type => $mapped) {
            if (str_starts_with(strtolower($contentType), $type)) {
                $ext = $mapped;
                break;
            }
        }

        if (!$ext) {
            // fallback to URL extension
            $path = parse_url($url, PHP_URL_PATH) ?: '';
            $guess = strtolower(pathinfo($path, PATHINFO_EXTENSION));
            if (in_array($guess, ['jpg', 'jpeg', 'png', 'webp'], true)) {
                $ext = $guess === 'jpeg' ? 'jpg' : $guess;
            } else {
                $ext = 'jpg';
            }
        }

        $body = $res->body();
        if (strlen($body) > 4 * 1024 * 1024) {
            throw new \RuntimeException('Image too large (>4MB)');
        }

        $filename = $slug.'-'.$sortOrder.'-'.Str::random(6).'.'.$ext;
        $storagePath = 'products/import/'.$filename;
        Storage::disk('public')->put($storagePath, $body);

        return url(Storage::disk('public')->url($storagePath));
    }
}
