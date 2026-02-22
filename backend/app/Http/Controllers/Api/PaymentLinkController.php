<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Services\Payments\FedapayGateway;
use Illuminate\Http\Request;

class PaymentLinkController extends Controller
{
    public function store(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $latest = $order->payments()->latest('id')->first();
        if ($latest && $latest->status === 'completed') {
            return response()->json(['message' => 'Order is already paid.'], 409);
        }

        $gateway = app(FedapayGateway::class);
        if (!$gateway->isConfigured()) {
            return response()->json(['message' => 'Payment gateway is not configured.'], 500);
        }

        $payment = Payment::create([
            'order_id' => $order->id,
            'provider' => 'gateway',
            'status' => 'pending',
            'amount' => $order->total,
        ]);

        $fullName = trim((string) ($request->user()->name ?? ''));
        $parts = preg_split('/\s+/', $fullName, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $firstname = $parts[0] ?? 'Client';
        $lastname = count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : '—';

        $customer = [
            'firstname' => $firstname,
            'lastname' => $lastname,
            'email' => (string) $request->user()->email,
        ];

        $link = $gateway->createPaymentLink($order, $payment, $customer);
        $payment->metadata = [
            'fedapay_transaction_id' => $link['transaction_id'],
            'fedapay_reference' => $link['reference'],
            'merchant_reference' => $link['merchant_reference'],
            'payment_url' => $link['payment_url'],
        ];
        $payment->save();

        return response()->json([
            'payment_url' => $link['payment_url'],
            'payment_id' => $payment->id,
            'order_id' => $order->id,
        ], 201);
    }
}
