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
use App\Services\Payments\FedapayGateway;

class CheckoutController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'shipping_address_id' => ['nullable', 'integer'],
            'shipping_address' => ['nullable', 'array'],
            'shipping_address.full_name' => ['required_with:shipping_address', 'string', 'max:255'],
            'shipping_address.line1' => ['required_with:shipping_address', 'string', 'max:255'],
            'shipping_address.line2' => ['nullable', 'string', 'max:255'],
            'shipping_address.city' => ['required_with:shipping_address', 'string', 'max:255'],
            'shipping_address.postal_code' => ['required_with:shipping_address', 'string', 'max:32'],
            'shipping_address.country' => ['nullable', 'string', 'max:2'],
            'shipping_address.phone' => ['nullable', 'string', 'max:64'],
            'customer_phone' => ['nullable', 'string', 'max:64'],
            'customer_country' => ['nullable', 'string', 'max:2'],
        ]);

        $user = $request->user();
        $cart = Cart::firstOrCreate(['user_id' => $user->id]);
        $cart->load(['items.product']);

        if ($cart->items->isEmpty()) {
            return response()->json(['message' => 'Cart is empty'], 422);
        }

        $existingAddress = null;
        if (!empty($validated['shipping_address_id'])) {
            $existingAddress = Address::query()
                ->where('id', (int) $validated['shipping_address_id'])
                ->where('user_id', $user->id)
                ->first();

            if (!$existingAddress) {
                return response()->json(['message' => 'Address not found'], 404);
            }
        }

        if (empty($validated['shipping_address']) && !$existingAddress) {
            $existingAddress = $user->addresses()
                ->orderByDesc('is_default')
                ->orderByDesc('created_at')
                ->first();

            if (!$existingAddress) {
                return response()->json(['message' => 'Shipping address is required'], 422);
            }
        }

        $result = DB::transaction(function () use ($validated, $user, $cart, $existingAddress) {
            $addressId = null;
            $createdAddressId = null;
            if (!empty($validated['shipping_address'])) {
                $addr = $validated['shipping_address'];
                $country = strtoupper((string) ($addr['country'] ?? 'BJ'));
                if (strlen($country) > 2) {
                    $country = substr($country, 0, 2);
                }
                $address = Address::create([
                    'user_id' => $user->id,
                    'type' => 'shipping',
                    'full_name' => $addr['full_name'],
                    'line1' => $addr['line1'],
                    'line2' => $addr['line2'] ?? null,
                    'city' => $addr['city'],
                    'postal_code' => $addr['postal_code'],
                    'country' => $country ?: 'BJ',
                    'phone' => $addr['phone'] ?? null,
                    'is_default' => false,
                ]);
                $addressId = $address->id;
                $createdAddressId = $address->id;
            } elseif ($existingAddress) {
                $addressId = (int) $existingAddress->id;
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

            $payment = Payment::create([
                'order_id' => $order->id,
                'provider' => 'gateway',
                'status' => 'pending',
                'amount' => $order->total,
            ]);

            $order->load(['items', 'payments', 'shippingAddress']);
            return [$order, $payment, $createdAddressId, $addressId];
        });

        /** @var array{0: \App\Models\Order, 1: \App\Models\Payment, 2: int|null, 3: int|null} $result */
        [$order, $payment, $createdAddressId, $addressId] = $result;

        $gateway = app(FedapayGateway::class);
        if (!$gateway->isConfigured()) {
            return response()->json([
                'message' => 'Payment gateway is not configured.',
            ], 500);
        }

        $address = null;
        if ($addressId) {
            $address = Address::query()->where('id', (int) $addressId)->first();
        }

        $fullName = (string) (
            $validated['shipping_address']['full_name']
                ?? ($address?->full_name)
                ?? ($user->name ?? '')
        );
        $fullName = trim($fullName);
        $parts = preg_split('/\s+/', $fullName, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $firstname = $parts[0] ?? 'Client';
        $lastname = count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : '—';

        $phone = (string) (
            $validated['customer_phone']
                ?? ($validated['shipping_address']['phone'] ?? null)
                ?? ($address?->phone)
                ?? ''
        );
        $country = strtoupper((string) (
            $validated['customer_country']
                ?? ($validated['shipping_address']['country'] ?? null)
                ?? ($address?->country)
                ?? 'BJ'
        ));
        if (strlen($country) > 2) {
            $country = substr($country, 0, 2);
        }
        if (strlen($country) !== 2) {
            $country = 'BJ';
        }

        $customer = [
            'firstname' => $firstname,
            'lastname' => $lastname,
            'email' => (string) $user->email,
        ];
        if (trim($phone) !== '') {
            $customer['phone_number'] = [
                'number' => $phone,
                'country' => $country,
            ];
        }

        try {
            $link = $gateway->createPaymentLink($order, $payment, $customer);

            $payment->provider = 'gateway';
            $payment->metadata = array_merge((array) ($payment->metadata ?? []), [
                'fedapay_transaction_id' => $link['transaction_id'],
                'fedapay_reference' => $link['reference'],
                'merchant_reference' => $link['merchant_reference'],
                'payment_url' => $link['payment_url'],
            ]);
            $payment->save();
        } catch (\Throwable $e) {
            logger()->error('Checkout payment initialization failed', [
                'user_id' => $user->id ?? null,
                'order_id' => $order->id ?? null,
                'payment_id' => $payment->id ?? null,
                'message' => $e->getMessage(),
            ]);

            // Don't create an unpaid order if the payment can't be initialized.
            // Keep the cart intact so the user can retry.
            DB::transaction(function () use ($order, $createdAddressId) {
                $order->delete();
                if ($createdAddressId) {
                    Address::query()->where('id', $createdAddressId)->delete();
                }
            });

            $payload = ['message' => 'Unable to initialize payment.'];
            if (config('app.debug')) {
                $payload['details'] = $e->getMessage();
            }

            return response()->json($payload, 502);
        }

        // Payment link created successfully: clear the cart.
        $cart->items()->delete();

        $order->load(['items', 'payments', 'shippingAddress']);

        return response()->json([
            'order' => $order,
            'payment_url' => (string) ($payment->metadata['payment_url'] ?? ''),
        ], 201);
    }
}
