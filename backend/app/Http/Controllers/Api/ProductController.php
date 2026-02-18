<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;


class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::query()->with(['images', 'categories']);

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
            $query->orderBy('price');
        } elseif ($sort === 'price_desc') {
            $query->orderByDesc('price');
        } elseif ($sort === 'featured') {
            $query->orderByDesc('featured')->orderByDesc('created_at');
        } elseif ($sort === 'promo') {
            $query->orderByDesc('is_promo')->orderByDesc('created_at');
        } else {
            $query->orderByDesc('created_at');
        }

        $products = $query->paginate(24);

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
