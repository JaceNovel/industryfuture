<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\File;

class ImportProducts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'import:products {path : Path to products.json}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import products from scraper export JSON (categories, products, images)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $path = (string) $this->argument('path');
        if (!is_file($path)) {
            $this->error("File not found: {$path}");
            return self::FAILURE;
        }

        $jsonDir = dirname(realpath($path) ?: $path);
        $scraperRoot = dirname($jsonDir);
        $publicImportDir = public_path('imports/images');
        File::ensureDirectoryExists($publicImportDir);

        $raw = file_get_contents($path);
        if ($raw === false) {
            $this->error('Unable to read file');
            return self::FAILURE;
        }

        $payload = json_decode($raw, true);
        if (!is_array($payload)) {
            $this->error('Invalid JSON (expected array)');
            return self::FAILURE;
        }

        $imported = 0;
        $updated = 0;

        DB::transaction(function () use ($payload, $scraperRoot, $publicImportDir, &$imported, &$updated) {
            foreach ($payload as $row) {
                if (!is_array($row)) {
                    continue;
                }

                $name = (string) ($row['name'] ?? '');
                $slug = (string) ($row['slug'] ?? '');
                if ($slug === '') {
                    $slug = Str::slug($name);
                }
                if ($slug === '') {
                    continue;
                }

                $description = $row['description'] ?? null;
                $price = $row['price'] ?? 0;
                $compareAt = $row['compare_at_price'] ?? null;
                $stock = $row['stock'] ?? 999;

                $text = strtolower(trim(($name.' '.($description ?? ''))));
                $tagDelivery = (str_contains($text, 'stock') || str_contains($text, 'disponible'))
                    ? 'PRET_A_ETRE_LIVRE'
                    : 'SUR_COMMANDE';

                $productData = [
                    'name' => $name !== '' ? $name : $slug,
                    'description' => $description,
                    'price' => is_numeric($price) ? (float) $price : 0,
                    'compare_at_price' => is_numeric($compareAt) ? (float) $compareAt : null,
                    'stock' => is_numeric($stock) ? (int) $stock : 999,
                    'status' => 'active',
                    'tag_delivery' => $tagDelivery,
                    'delivery_delay_days' => $row['delivery_delay_days'] ?? null,
                    'sku' => $row['sku'] ?? null,
                    'metadata' => $row['metadata'] ?? null,
                    'featured' => (bool) ($row['featured'] ?? false),
                ];

                $existing = Product::where('slug', $slug)->first();
                if ($existing) {
                    $existing->fill($productData);
                    $existing->save();
                    $product = $existing;
                    $updated++;
                } else {
                    $product = Product::create(array_merge($productData, ['slug' => $slug]));
                    $imported++;
                }

                $categoryNames = $row['categories'] ?? [];
                if (!is_array($categoryNames)) {
                    $categoryNames = [];
                }

                $categoryIds = [];
                foreach ($categoryNames as $catName) {
                    $catName = (string) $catName;
                    if ($catName === '') {
                        continue;
                    }
                    $catSlug = Str::slug($catName);
                    if ($catSlug === '') {
                        continue;
                    }

                    $category = Category::firstOrCreate(
                        ['slug' => $catSlug],
                        ['name' => $catName, 'description' => null, 'image_url' => null]
                    );
                    $categoryIds[] = $category->id;
                }
                $product->categories()->sync(array_values(array_unique($categoryIds)));

                $images = $row['images'] ?? [];
                if (!is_array($images)) {
                    $images = [];
                }
                ProductImage::where('product_id', $product->id)->delete();
                foreach ($images as $img) {
                    if (!is_array($img)) {
                        continue;
                    }
                    $imgPath = (string) ($img['path'] ?? $img['url'] ?? '');
                    if ($imgPath === '') {
                        continue;
                    }

                    $finalUrl = $imgPath;
                    if (!str_starts_with($imgPath, 'http://') && !str_starts_with($imgPath, 'https://')) {
                        // Scraper exports use a relative path like "exports/images/foo.jpg".
                        $sourceAbs = $scraperRoot.DIRECTORY_SEPARATOR.str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $imgPath);
                        if (is_file($sourceAbs)) {
                            $filename = basename($sourceAbs);
                            $destAbs = $publicImportDir.DIRECTORY_SEPARATOR.$filename;
                            if (!is_file($destAbs)) {
                                File::copy($sourceAbs, $destAbs);
                            }
                            $finalUrl = '/imports/images/'.$filename;
                        }
                    }

                    ProductImage::create([
                        'product_id' => $product->id,
                        'url' => $finalUrl,
                        'alt' => $img['alt'] ?? null,
                        'sort_order' => (int) ($img['sort_order'] ?? 0),
                    ]);
                }
            }
        });

        $this->info("Imported: {$imported}, Updated: {$updated}");
        return self::SUCCESS;
    }
}
