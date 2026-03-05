<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;


class ProductController extends Controller
{
    private function applyStableOrder($query, string $column, string $direction = 'desc'): void
    {
        if ($direction === 'asc') {
            $query->orderBy($column)->orderBy('id');
            return;
        }

        $query->orderByDesc($column)->orderByDesc('id');
    }

    public function index(Request $request)
    {
        $query = Product::query()->with(['images', 'categories']);

        $perPageRaw = $request->query('perPage', 24);
        $perPage = 24;
        if (is_numeric($perPageRaw)) {
            $perPage = (int) $perPageRaw;
        }
        if ($perPage < 1) {
            $perPage = 1;
        }
        if ($perPage > 100) {
            $perPage = 100;
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        if ($categorySlug = $request->query('category')) {
            $query->whereHas('categories', function ($q) use ($categorySlug) {
                $q->where('slug', $categorySlug);
            });
        }

        if (($minPrice = $request->query('minPrice')) !== null) {
            $query->where('price', '>=', (float) $minPrice);
        }

        if (($maxPrice = $request->query('maxPrice')) !== null) {
            $query->where('price', '<=', (float) $maxPrice);
        }

        if ($tag = $request->query('tag')) {
            $query->where('tag_delivery', $tag);
        }

        if ($request->boolean('promo') || $request->query('promo') === '1') {
            $query->where('is_promo', true);
        }

        $query->where('status', 'active');

        $sort = $request->query('sort', 'newest');
        if ($sort === 'price_asc') {
            $this->applyStableOrder($query, 'price', 'asc');
        } elseif ($sort === 'price_desc') {
            $this->applyStableOrder($query, 'price', 'desc');
        } elseif ($sort === 'featured') {
            $query->orderByDesc('featured');
            $this->applyStableOrder($query, 'created_at', 'desc');
        } elseif ($sort === 'promo') {
            $query->orderByDesc('is_promo');
            $this->applyStableOrder($query, 'created_at', 'desc');
        } else {
            $this->applyStableOrder($query, 'created_at', 'desc');
        }

        $products = $query->paginate($perPage);

        return response()->json($products);
    }

    public function show(string $slug)
    {
        $product = Product::query()
            ->with(['images', 'categories'])
            ->where('slug', $slug)
            ->where('status', 'active')
            ->firstOrFail();

        return response()->json($product);
    }
}
