<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ImportRequest;
use App\Models\Order;
use App\Models\Payment;
use App\Services\Payments\FedapayGateway;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ImportRequestPaymentLinkController extends Controller
{
    public function store(Request $request, ImportRequest $importRequest)
    {
        if ((int) $importRequest->user_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if (!in_array((string) $importRequest->status, ['priced', 'awaiting_payment'], true)) {
            return response()->json(['message' => 'This request is not ready for payment.'], 409);
        }

        if ($importRequest->admin_price === null || (float) $importRequest->admin_price < 1) {
            return response()->json(['message' => 'Price is not set yet.'], 409);
        }

        $gateway = app(FedapayGateway::class);
        if (!$gateway->isConfigured()) {
            return response()->json(['message' => 'Payment gateway is not configured.'], 500);
        }

        $order = Order::create([
            'user_id' => $request->user()->id,
            'status' => 'pending',
            'tag_delivery' => 'SUR_COMMANDE',
            'shipping_address_id' => null,
            'subtotal' => $importRequest->admin_price,
            'discount_total' => 0,
            'shipping_total' => 0,
            'total' => $importRequest->admin_price,
            'metadata' => [
                'type' => 'import_request',
                'import_request_id' => (int) $importRequest->id,
                'tracking_number' => $importRequest->tracking_number ?: (Str::upper(Str::random(8)) . '-' . Str::upper(Str::random(6))),
                'order_number' => 'IMP' . strtoupper(Str::random(10)),
                'estimated_delivery' => now()->addDays((int) ($importRequest->desired_delay_days ?? 7))->toIso8601String(),
            ],
        ]);

        $payment = Payment::create([
            'order_id' => $order->id,
            'provider' => 'gateway',
            'status' => 'pending',
            'amount' => $importRequest->admin_price,
            'metadata' => [
                'type' => 'import_request',
                'import_request_id' => (int) $importRequest->id,
            ],
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

        $payment->metadata = array_merge((array) ($payment->metadata ?? []), [
            'fedapay_transaction_id' => $link['transaction_id'],
            'fedapay_reference' => $link['reference'],
            'merchant_reference' => $link['merchant_reference'],
            'payment_url' => $link['payment_url'],
        ]);
        $payment->save();

        $importRequest->payment_id = $payment->id;
        $importRequest->status = 'awaiting_payment';
        if (!$importRequest->tracking_number) {
            $importRequest->tracking_number = (string) (($order->metadata ?? [])['tracking_number'] ?? null);
        }
        $importRequest->save();

        return response()->json([
            'payment_url' => $link['payment_url'],
            'payment_id' => $payment->id,
            'import_request_id' => $importRequest->id,
        ], 201);
    }
}
