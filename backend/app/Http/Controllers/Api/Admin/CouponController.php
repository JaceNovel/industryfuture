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
            'code' => ['required', 'string', 'max:64', 'unique:coupons,code'],
            'type' => ['nullable', 'in:percent,fixed'],
            'amount' => ['required', 'numeric', 'min:0'],
            'active' => ['nullable', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
        ]);

        $coupon = Coupon::create([
            'code' => $validated['code'],
            'type' => $validated['type'] ?? 'fixed',
            'amount' => $validated['amount'],
            'active' => $validated['active'] ?? true,
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
            'code' => ['sometimes', 'string', 'max:64', 'unique:coupons,code,'.$coupon->id],
            'type' => ['nullable', 'in:percent,fixed'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'active' => ['nullable', 'boolean'],
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
