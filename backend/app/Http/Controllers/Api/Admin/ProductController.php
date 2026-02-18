<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::query()->with(['images', 'categories'])->orderByDesc('created_at');
        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }
        return response()->json($query->paginate(50));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'compare_at_price' => ['nullable', 'numeric', 'min:0'],
            'stock' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', 'in:draft,active'],
            'tag_delivery' => ['nullable', 'in:PRET_A_ETRE_LIVRE,SUR_COMMANDE'],
            'delivery_delay_days' => ['nullable', 'integer', 'min:0'],
            'sku' => ['nullable', 'string', 'max:255'],
            'metadata' => ['nullable', 'array'],
            'featured' => ['nullable', 'boolean'],
            'is_promo' => ['nullable', 'boolean'],
            'categories' => ['nullable', 'array'],
            'categories.*' => ['string', 'max:255'],
        ]);

        $slugBase = $validated['slug'] ?? Str::slug($validated['name']);
        $slug = $this->uniqueSlug($slugBase);

        $product = Product::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'price' => $validated['price'] ?? 0,
            'compare_at_price' => $validated['compare_at_price'] ?? null,
            'stock' => $validated['stock'] ?? 999,
            'status' => $validated['status'] ?? 'draft',
            'tag_delivery' => $validated['tag_delivery'] ?? 'SUR_COMMANDE',
            'delivery_delay_days' => $validated['delivery_delay_days'] ?? null,
            'sku' => $validated['sku'] ?? null,
            'metadata' => $validated['metadata'] ?? null,
            'featured' => $validated['featured'] ?? false,
            'is_promo' => $validated['is_promo'] ?? false,
        ]);

        if (!empty($validated['categories'])) {
            $categoryIds = $this->resolveCategoryIds($validated['categories']);
            $product->categories()->sync($categoryIds);
        }

        $product->load(['images', 'categories']);
        return response()->json($product, 201);
    }

    public function show(Product $product)
    {
        $product->load(['images', 'categories']);
        return response()->json($product);
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'compare_at_price' => ['nullable', 'numeric', 'min:0'],
            'stock' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', 'in:draft,active'],
            'tag_delivery' => ['nullable', 'in:PRET_A_ETRE_LIVRE,SUR_COMMANDE'],
            'delivery_delay_days' => ['nullable', 'integer', 'min:0'],
            'sku' => ['nullable', 'string', 'max:255'],
            'metadata' => ['nullable', 'array'],
            'featured' => ['nullable', 'boolean'],
            'is_promo' => ['nullable', 'boolean'],
            'categories' => ['nullable', 'array'],
            'categories.*' => ['string', 'max:255'],
        ]);

        if (array_key_exists('slug', $validated)) {
            $validated['slug'] = $this->uniqueSlug($validated['slug'], $product->id);
        }

        $product->fill($validated);
        $product->save();

        if (array_key_exists('categories', $validated)) {
            $categoryIds = $this->resolveCategoryIds($validated['categories'] ?? []);
            $product->categories()->sync($categoryIds);
        }

        $product->load(['images', 'categories']);
        return response()->json($product);
    }

    public function destroy(Product $product)
    {
        $product->delete();
        return response()->json(['message' => 'Deleted']);
    }

    private function uniqueSlug(string $base, ?int $ignoreId = null): string
    {
        $slug = Str::slug($base);
        $try = $slug;
        $i = 2;

        while (Product::query()
            ->where('slug', $try)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists()) {
            $try = $slug.'-'.$i;
            $i++;
        }

        return $try;
    }

    private function resolveCategoryIds(array $categoryNamesOrSlugs): array
    {
        $ids = [];
        foreach ($categoryNamesOrSlugs as $value) {
            $slug = Str::slug($value);
            $category = Category::firstOrCreate(
                ['slug' => $slug],
                ['name' => $value, 'description' => null, 'image_url' => null]
            );
            $ids[] = $category->id;
        }
        return array_values(array_unique($ids));
    }
}
