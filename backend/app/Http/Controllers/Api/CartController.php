<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Cart;
use App\Models\CartItem;

class CartController extends Controller
{
    public function show(Request $request)
    {
        $cart = Cart::firstOrCreate(['user_id' => $request->user()->id]);

        $cart->load(['items.product.images', 'items.product.categories']);

        return response()->json($cart);
    }

    public function add(Request $request)
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'qty' => ['nullable', 'integer', 'min:1'],
        ]);

        $cart = Cart::firstOrCreate(['user_id' => $request->user()->id]);
        $qty = (int) ($validated['qty'] ?? 1);

        $item = CartItem::firstOrNew([
            'cart_id' => $cart->id,
            'product_id' => $validated['product_id'],
        ]);
        $item->qty = ($item->exists ? $item->qty : 0) + $qty;
        $item->save();

        return $this->show($request);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'qty' => ['required', 'integer', 'min:0'],
        ]);

        $cart = Cart::firstOrCreate(['user_id' => $request->user()->id]);

        $item = CartItem::where('cart_id', $cart->id)
            ->where('product_id', $validated['product_id'])
            ->first();

        if (!$item) {
            return response()->json(['message' => 'Item not found'], 404);
        }

        if ((int) $validated['qty'] === 0) {
            $item->delete();
        } else {
            $item->qty = (int) $validated['qty'];
            $item->save();
        }

        return $this->show($request);
    }

    public function remove(Request $request)
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
        ]);

        $cart = Cart::firstOrCreate(['user_id' => $request->user()->id]);

        CartItem::where('cart_id', $cart->id)
            ->where('product_id', $validated['product_id'])
            ->delete();

        return $this->show($request);
    }
}
