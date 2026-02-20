<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\GroupedOffer;
use Illuminate\Http\Request;

class GroupedOfferController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));

        $query = GroupedOffer::query()
            ->with(['category', 'products'])
            ->orderByDesc('created_at');

        if ($search !== '') {
            $query->where('title', 'like', "%{$search}%");
        }

        return response()->json($query->paginate(50));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'discount_percent' => ['required', 'integer', 'min:0', 'max:100'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'product_ids' => ['nullable', 'array'],
            'product_ids.*' => ['integer', 'exists:products,id'],
            'active' => ['nullable', 'boolean'],
        ]);

        $offer = GroupedOffer::create([
            'title' => $validated['title'],
            'discount_percent' => $validated['discount_percent'],
            'category_id' => $validated['category_id'] ?? null,
            'active' => $validated['active'] ?? true,
        ]);

        $offer->products()->sync($validated['product_ids'] ?? []);
        $offer->load(['category', 'products']);

        return response()->json($offer, 201);
    }

    public function show(GroupedOffer $groupedOffer)
    {
        $groupedOffer->load(['category', 'products']);
        return response()->json($groupedOffer);
    }

    public function update(Request $request, GroupedOffer $groupedOffer)
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'discount_percent' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'product_ids' => ['nullable', 'array'],
            'product_ids.*' => ['integer', 'exists:products,id'],
            'active' => ['nullable', 'boolean'],
        ]);

        $groupedOffer->fill($validated);
        $groupedOffer->save();

        if (array_key_exists('product_ids', $validated)) {
            $groupedOffer->products()->sync($validated['product_ids'] ?? []);
        }

        $groupedOffer->load(['category', 'products']);
        return response()->json($groupedOffer);
    }

    public function destroy(GroupedOffer $groupedOffer)
    {
        $groupedOffer->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
