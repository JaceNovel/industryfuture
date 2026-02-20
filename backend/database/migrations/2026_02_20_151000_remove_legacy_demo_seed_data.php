<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $demoSlugs = [
            'module-automatisation-ax-200',
            'presse-hydraulique-hx-10',
            'kit-maintenance-mx',
        ];

        $productIds = Product::query()
            ->whereIn('slug', $demoSlugs)
            ->pluck('id');

        if ($productIds->isNotEmpty()) {
            ProductImage::query()->whereIn('product_id', $productIds)->delete();
            Product::query()->whereIn('id', $productIds)->delete();
        }

        Category::query()->whereIn('slug', [
            'machines-industrielles',
            'pieces-accessoires',
            'automatisation',
        ])->delete();

        User::query()->where('email', 'admin@futurin.space')->delete();
    }

    public function down(): void
    {
    }
};
