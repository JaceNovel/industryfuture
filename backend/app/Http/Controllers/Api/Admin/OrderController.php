<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\Payment;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Carbon;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $query = Order::query()->with(['items', 'payments', 'user', 'shippingAddress'])->orderByDesc('created_at');
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        return response()->json($query->paginate(50));
    }

    public function show(Order $order)
    {
        $order->load(['items', 'payments', 'user', 'shippingAddress']);
        return response()->json($order);
    }

    public function update(Request $request, Order $order)
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', 'max:64'],
            'tag_delivery' => ['nullable', 'in:PRET_A_ETRE_LIVRE,SUR_COMMANDE'],
            'payment_status' => ['nullable', 'in:pending,completed,failed'],
            'delivery_status' => ['nullable', 'in:pending,ready_for_pickup,out_for_delivery,delivered,canceled'],
            'delivery_eta_days' => ['nullable', 'integer', 'min:0', 'max:365'],
        ]);

        $order->fill(array_filter([
            'status' => $validated['status'] ?? null,
            'tag_delivery' => $validated['tag_delivery'] ?? null,
        ], fn ($v) => $v !== null));

        $metadata = $order->metadata ?? [];
        if (array_key_exists('delivery_status', $validated)) {
            $metadata['delivery_status'] = $validated['delivery_status'];
        }
        if (array_key_exists('delivery_eta_days', $validated)) {
            $metadata['delivery_eta_days'] = $validated['delivery_eta_days'];
            $metadata['delivery_estimated_at'] = Carbon::now()->addDays((int) $validated['delivery_eta_days'])->toIso8601String();
        }
        $order->metadata = $metadata;
        $order->save();

        if (array_key_exists('payment_status', $validated)) {
            $payment = $order->payments()->latest('id')->first();
            if (!$payment) {
                $payment = new Payment([
                    'provider' => 'manual',
                    'amount' => $order->total,
                    'metadata' => null,
                ]);
                $payment->order_id = $order->id;
            }
            $payment->status = $validated['payment_status'];
            if ($validated['payment_status'] === 'completed') {
                $payment->paid_at = now();
            }
            $payment->save();
        }

        $order->load(['items', 'payments', 'user', 'shippingAddress']);
        return response()->json($order);
    }

    public function deliveryNote(Order $order)
    {
        $order->load(['items', 'user', 'shippingAddress', 'payments']);

        $metadata = $order->metadata ?? [];
        $deliveryStatus = $metadata['delivery_status'] ?? 'pending';
        $etaDays = (int) ($metadata['delivery_eta_days'] ?? ($order->tag_delivery === 'SUR_COMMANDE' ? 10 : 3));

        $pdf = Pdf::loadView('admin.delivery-note', [
            'order' => $order,
            'deliveryStatus' => $deliveryStatus,
            'etaDays' => $etaDays,
            'generatedAt' => now(),
        ])->setPaper('a4');

        return $pdf->download('bon-livraison-'.$order->id.'.pdf');
    }
}
