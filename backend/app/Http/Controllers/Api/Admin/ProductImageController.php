<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\ProductImage;

class ProductImageController extends Controller
{
    public function index(Product $product)
    {
        $images = $product->images()->get();
        return response()->json($images);
    }

    public function store(Request $request, Product $product)
    {
        $validated = $request->validate([
            'url' => ['required', 'string', 'max:2048'],
            'alt' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $image = ProductImage::create([
            'product_id' => $product->id,
            'url' => $validated['url'],
            'alt' => $validated['alt'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return response()->json($image, 201);
    }

    public function update(Request $request, ProductImage $productImage)
    {
        $validated = $request->validate([
            'url' => ['sometimes', 'string', 'max:2048'],
            'alt' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $productImage->fill($validated);
        $productImage->save();

        return response()->json($productImage);
    }

    public function destroy(ProductImage $productImage)
    {
        $productImage->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
