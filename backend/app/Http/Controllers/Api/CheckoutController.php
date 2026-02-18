<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Address;
use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use Illuminate\Support\Str;

class CheckoutController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'shipping_address' => ['nullable', 'array'],
            'shipping_address.full_name' => ['required_with:shipping_address', 'string', 'max:255'],
            'shipping_address.line1' => ['required_with:shipping_address', 'string', 'max:255'],
            'shipping_address.line2' => ['nullable', 'string', 'max:255'],
            'shipping_address.city' => ['required_with:shipping_address', 'string', 'max:255'],
            'shipping_address.postal_code' => ['required_with:shipping_address', 'string', 'max:32'],
            'shipping_address.country' => ['nullable', 'string', 'max:2'],
            'shipping_address.phone' => ['nullable', 'string', 'max:64'],
        ]);

        $user = $request->user();
        $cart = Cart::firstOrCreate(['user_id' => $user->id]);
        $cart->load(['items.product']);

        if ($cart->items->isEmpty()) {
            return response()->json(['message' => 'Cart is empty'], 422);
        }

        return DB::transaction(function () use ($validated, $user, $cart) {
            $addressId = null;
            if (!empty($validated['shipping_address'])) {
                $addr = $validated['shipping_address'];
                $address = Address::create([
                    'user_id' => $user->id,
                    'type' => 'shipping',
                    'full_name' => $addr['full_name'],
                    'line1' => $addr['line1'],
                    'line2' => $addr['line2'] ?? null,
                    'city' => $addr['city'],
                    'postal_code' => $addr['postal_code'],
                    'country' => $addr['country'] ?? 'FR',
                    'phone' => $addr['phone'] ?? null,
                    'is_default' => false,
                ]);
                $addressId = $address->id;
            }

            $subtotal = 0;
            $tagDelivery = 'SUR_COMMANDE';

            foreach ($cart->items as $item) {
                $subtotal += ((float) $item->product->price) * (int) $item->qty;
                if ($item->product->tag_delivery === 'PRET_A_ETRE_LIVRE') {
                    $tagDelivery = 'PRET_A_ETRE_LIVRE';
                }
            }

            $order = Order::create([
                'user_id' => $user->id,
                'status' => 'pending',
                'tag_delivery' => $tagDelivery,
                'shipping_address_id' => $addressId,
                'subtotal' => $subtotal,
                'discount_total' => 0,
                'shipping_total' => 0,
                'total' => $subtotal,
                'metadata' => [
                    'tracking_number' => strtoupper(Str::random(8)) . '-' . strtoupper(Str::random(6)),
                    'order_number' => 'LKaZJIMp' . strtoupper(Str::random(14)),
                    'estimated_delivery' => ($tagDelivery === 'PRET_A_ETRE_LIVRE'
                        ? now()->addDays(3)
                        : now()->addDays(7)
                    )->toIso8601String(),
                ],
            ]);

            foreach ($cart->items as $item) {
                $price = (float) $item->product->price;
                $qty = (int) $item->qty;

                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item->product_id,
                    'name' => $item->product->name,
                    'sku' => $item->product->sku,
                    'price' => $price,
                    'qty' => $qty,
                    'total' => $price * $qty,
                ]);
            }

            Payment::create([
                'order_id' => $order->id,
                'provider' => 'manual',
                'status' => 'pending',
                'amount' => $order->total,
            ]);

            $cart->items()->delete();

            $order->load(['items', 'payments', 'shippingAddress']);
            return response()->json($order, 201);
        });
    }
}
