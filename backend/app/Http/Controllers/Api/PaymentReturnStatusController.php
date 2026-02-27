<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\Request;

class PaymentReturnStatusController extends Controller
{
    public function show(Request $request)
    {
        $data = $request->validate([
            'order_id' => ['required', 'integer', 'min:1'],
            'payment_id' => ['required', 'integer', 'min:1'],
        ]);

        /** @var int $orderId */
        $orderId = (int) $data['order_id'];
        /** @var int $paymentId */
        $paymentId = (int) $data['payment_id'];

        $payment = Payment::query()->whereKey($paymentId)->first();
        if (!$payment || (int) $payment->order_id !== $orderId) {
            // Avoid leaking whether an order/payment exists.
            return response()->json(['message' => 'Not found'], 404);
        }

        $order = Order::query()->whereKey($orderId)->first();
        if (!$order) {
            return response()->json(['message' => 'Not found'], 404);
        }

        return response()->json([
            'order_id' => $orderId,
            'payment_id' => $paymentId,
            'order_status' => (string) ($order->status ?? 'pending'),
            'payment_status' => (string) ($payment->status ?? 'pending'),
        ]);
    }
}
