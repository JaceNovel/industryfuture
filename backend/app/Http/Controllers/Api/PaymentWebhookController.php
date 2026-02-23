<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Services\Payments\FedapayGateway;
use Illuminate\Http\Request;

class PaymentWebhookController extends Controller
{
    public function handle(Request $request, FedapayGateway $gateway)
    {
        $payload = (string) $request->getContent();
        $sigHeader = $request->header('x-fedapay-signature');

        try {
            $event = $gateway->constructWebhookEvent($payload, $sigHeader);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Invalid signature'], 400);
        }

        $entity = (string) ($event->entity ?? '');
        $objectId = (int) ($event->object_id ?? 0);

        if ($entity !== 'transaction' || $objectId < 1) {
            return response()->json(['received' => true]);
        }

        try {
            $transaction = $gateway->retrieveTransaction($objectId);
        } catch (\Throwable $e) {
            return response()->json(['received' => true]);
        }

        $transactionId = (int) ($transaction->id ?? $objectId);
        $status = (string) ($transaction->status ?? '');

        $payment = Payment::query()
            ->where('metadata->fedapay_transaction_id', $transactionId)
            ->orderByDesc('id')
            ->first();

        if (!$payment) {
            $custom = $transaction->custom_metadata ?? [];
            if ($custom instanceof \FedaPay\FedaPayObject) {
                $custom = $custom->__toArray(true);
            }
            $orderId = is_array($custom) && isset($custom['order_id']) ? (int) $custom['order_id'] : 0;
            if ($orderId > 0) {
                $payment = Payment::query()->where('order_id', $orderId)->orderByDesc('id')->first();
            }
        }

        if (!$payment) {
            return response()->json(['received' => true]);
        }

        $newStatus = 'pending';
        if (method_exists($transaction, 'wasPaid') && $transaction->wasPaid()) {
            $newStatus = 'completed';
        } elseif (in_array($status, ['declined', 'canceled', 'expired', 'failed'], true)) {
            $newStatus = 'failed';
        }

        $payment->status = $newStatus;
        $payment->provider = 'gateway';
        $payment->metadata = array_merge((array) ($payment->metadata ?? []), [
            'fedapay_transaction_id' => $transactionId,
            'fedapay_status' => $status,
            'fedapay_payload' => $transaction instanceof \FedaPay\FedaPayObject ? $transaction->__toArray(true) : $transaction,
        ]);
        if ($newStatus === 'completed' && !$payment->paid_at) {
            $payment->paid_at = now();
        }
        $payment->save();

        if ($newStatus === 'completed') {
            $order = Order::find($payment->order_id);
            if ($order && in_array($order->status, ['pending', 'paid'], true)) {
                $order->status = 'preparing';
                $order->save();
            }
        }

        return response()->json(['received' => true]);
    }
}
