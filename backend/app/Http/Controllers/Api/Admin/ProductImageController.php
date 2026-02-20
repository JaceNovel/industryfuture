<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Support\Facades\Storage;

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
            'url' => ['nullable', 'string', 'max:2048', 'required_without:image'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096', 'required_without:url'],
            'alt' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $url = $validated['url'] ?? null;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('products', 'public');
            $url = url(Storage::disk('public')->url($path));
        }

        $image = ProductImage::create([
            'product_id' => $product->id,
            'url' => $url,
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
