<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Coupon;

class CouponController extends Controller
{
    public function index()
    {
        return response()->json(Coupon::query()->orderByDesc('created_at')->paginate(50));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:64', 'unique:coupons,code'],
            'description' => ['nullable', 'string'],
            'type' => ['nullable', 'in:percent,fixed,shipping'],
            'amount' => ['required', 'numeric', 'min:0'],
            'min_amount' => ['nullable', 'numeric', 'min:0'],
            'max_discount' => ['nullable', 'numeric', 'min:0'],
            'applies_to' => ['nullable', 'in:all_products,category,product'],
            'active' => ['nullable', 'boolean'],
            'unique_per_user' => ['nullable', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
        ]);

        $coupon = Coupon::create([
            'name' => $validated['name'],
            'code' => $validated['code'],
            'description' => $validated['description'] ?? null,
            'type' => $validated['type'] ?? 'fixed',
            'amount' => $validated['amount'],
            'min_amount' => $validated['min_amount'] ?? null,
            'max_discount' => $validated['max_discount'] ?? null,
            'applies_to' => $validated['applies_to'] ?? 'all_products',
            'active' => $validated['active'] ?? true,
            'unique_per_user' => $validated['unique_per_user'] ?? false,
            'starts_at' => $validated['starts_at'] ?? null,
            'ends_at' => $validated['ends_at'] ?? null,
            'usage_limit' => $validated['usage_limit'] ?? null,
            'used_count' => 0,
        ]);

        return response()->json($coupon, 201);
    }

    public function show(Coupon $coupon)
    {
        return response()->json($coupon);
    }

    public function update(Request $request, Coupon $coupon)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'code' => ['sometimes', 'string', 'max:64', 'unique:coupons,code,'.$coupon->id],
            'description' => ['nullable', 'string'],
            'type' => ['nullable', 'in:percent,fixed,shipping'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'min_amount' => ['nullable', 'numeric', 'min:0'],
            'max_discount' => ['nullable', 'numeric', 'min:0'],
            'applies_to' => ['nullable', 'in:all_products,category,product'],
            'active' => ['nullable', 'boolean'],
            'unique_per_user' => ['nullable', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
        ]);

        $coupon->fill($validated);
        $coupon->save();
        return response()->json($coupon);
    }

    public function destroy(Coupon $coupon)
    {
        $coupon->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
