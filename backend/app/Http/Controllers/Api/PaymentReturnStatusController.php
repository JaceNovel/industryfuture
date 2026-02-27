<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Services\Payments\FedapayGateway;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentReturnStatusController extends Controller
{
    public function show(Request $request, FedapayGateway $gateway)
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

        // If the webhook hasn't updated the DB yet, refresh the status directly from the provider.
        // This keeps the return page accurate even when webhooks are delayed.
        try {
            $currentPaymentStatus = (string) ($payment->status ?? 'pending');
            $currentOrderStatus = (string) ($order->status ?? 'pending');

            $shouldRefresh = $gateway->isConfigured()
                && $currentPaymentStatus === 'pending'
                && in_array($currentOrderStatus, ['pending', 'paid'], true);

            if ($shouldRefresh) {
                $meta = (array) ($payment->metadata ?? []);
                $transactionId = (int) ($meta['fedapay_transaction_id'] ?? 0);

                if ($transactionId > 0) {
                    $transaction = $gateway->retrieveTransaction($transactionId);
                    $rawStatus = (string) ($transaction->status ?? '');

                    $newPaymentStatus = 'pending';
                    if (method_exists($transaction, 'wasPaid') && $transaction->wasPaid()) {
                        $newPaymentStatus = 'completed';
                    } elseif (in_array($rawStatus, ['declined', 'canceled', 'expired', 'failed'], true)) {
                        $newPaymentStatus = 'failed';
                    }

                    if ($newPaymentStatus !== $currentPaymentStatus) {
                        $payment->status = $newPaymentStatus;
                        $payment->provider = 'gateway';
                        $payment->metadata = array_merge($meta, [
                            'fedapay_status' => $rawStatus,
                            'fedapay_payload' => $transaction instanceof \FedaPay\FedaPayObject ? $transaction->__toArray(true) : $transaction,
                        ]);
                        if ($newPaymentStatus === 'completed' && !$payment->paid_at) {
                            $payment->paid_at = now();
                        }
                        $payment->save();
                    }

                    // Mirror the webhook transitions for the order.
                    if ($newPaymentStatus === 'completed' && in_array($order->status, ['pending', 'paid'], true)) {
                        $order->status = 'preparing';
                        $orderMeta = (array) ($order->metadata ?? []);
                        if (!isset($orderMeta['preparing_at'])) {
                            $orderMeta['preparing_at'] = now()->toIso8601String();
                            $order->metadata = $orderMeta;
                        }
                        $order->save();
                    }

                    if ($newPaymentStatus === 'failed' && in_array($order->status, ['pending', 'paid'], true)) {
                        $order->status = 'canceled';
                        $orderMeta = (array) ($order->metadata ?? []);
                        if (!isset($orderMeta['canceled_at'])) {
                            $orderMeta['canceled_at'] = now()->toIso8601String();
                            $order->metadata = $orderMeta;
                        }
                        $order->save();
                    }
                }
            }
        } catch (\Throwable $e) {
            // Do not fail the return page if provider refresh fails.
            Log::warning('Payment return-status refresh failed', [
                'order_id' => $orderId,
                'payment_id' => $paymentId,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'order_id' => $orderId,
            'payment_id' => $paymentId,
            'order_status' => (string) ($order->status ?? 'pending'),
            'payment_status' => (string) ($payment->status ?? 'pending'),
        ]);
    }
}
