<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@futurin.space'],
            [
                'name' => 'Admin',
                'role' => 'admin',
                'password' => 'change-me-123',
            ]
        );

        $categories = [
            'Machines industrielles',
            'Pièces & accessoires',
            'Automatisation',
        ];

        $categoryModels = [];
        foreach ($categories as $name) {
            $categoryModels[] = Category::updateOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name, 'description' => null, 'image_url' => null]
            );
        }

        $demoProducts = [
            [
                'name' => 'Module d\'automatisation AX-200',
                'slug' => 'module-automatisation-ax-200',
                'description' => 'Module prêt à être livré (démo).',
                'price' => 1990,
                'status' => 'active',
                'tag_delivery' => 'PRET_A_ETRE_LIVRE',
                'featured' => true,
                'categories' => ['Automatisation'],
                'images' => [
                    ['url' => 'https://placehold.co/1200x900', 'alt' => 'AX-200', 'sort_order' => 0],
                ],
            ],
            [
                'name' => 'Presse hydraulique HX-10',
                'slug' => 'presse-hydraulique-hx-10',
                'description' => 'Sur commande (démo).',
                'price' => 12900,
                'status' => 'active',
                'tag_delivery' => 'SUR_COMMANDE',
                'delivery_delay_days' => 21,
                'featured' => false,
                'categories' => ['Machines industrielles'],
                'images' => [
                    ['url' => 'https://placehold.co/1200x900', 'alt' => 'HX-10', 'sort_order' => 0],
                ],
            ],
            [
                'name' => 'Kit de maintenance MX',
                'slug' => 'kit-maintenance-mx',
                'description' => 'Accessoire disponible en stock (démo).',
                'price' => 149,
                'status' => 'active',
                'tag_delivery' => 'PRET_A_ETRE_LIVRE',
                'featured' => false,
                'categories' => ['Pièces & accessoires'],
                'images' => [
                    ['url' => 'https://placehold.co/1200x900', 'alt' => 'MX', 'sort_order' => 0],
                ],
            ],
        ];

        foreach ($demoProducts as $p) {
            $product = Product::updateOrCreate(
                ['slug' => $p['slug']],
                [
                    'name' => $p['name'],
                    'description' => $p['description'],
                    'price' => $p['price'],
                    'compare_at_price' => $p['compare_at_price'] ?? null,
                    'stock' => 999,
                    'status' => $p['status'],
                    'tag_delivery' => $p['tag_delivery'],
                    'delivery_delay_days' => $p['delivery_delay_days'] ?? null,
                    'sku' => $p['sku'] ?? null,
                    'metadata' => null,
                    'featured' => (bool) ($p['featured'] ?? false),
                ]
            );

            $catIds = [];
            foreach ($p['categories'] as $cName) {
                $cat = Category::firstOrCreate(
                    ['slug' => Str::slug($cName)],
                    ['name' => $cName, 'description' => null, 'image_url' => null]
                );
                $catIds[] = $cat->id;
            }
            $product->categories()->sync($catIds);

            ProductImage::where('product_id', $product->id)->delete();
            foreach ($p['images'] as $img) {
                ProductImage::create([
                    'product_id' => $product->id,
                    'url' => $img['url'],
                    'alt' => $img['alt'] ?? null,
                    'sort_order' => $img['sort_order'] ?? 0,
                ]);
            }
        }
    }
}
