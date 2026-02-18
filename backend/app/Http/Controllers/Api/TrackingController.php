<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Http\Request;

class TrackingController extends Controller
{
    public function __invoke(Request $request, string $number)
    {
        $number = trim($number);
        if ($number === '') {
            return response()->json(['message' => 'Invalid tracking number'], 422);
        }

        $order = Order::query()
            ->where('metadata->tracking_number', $number)
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $meta = (array) ($order->metadata ?? []);

        $createdAt = $order->created_at ? Carbon::parse($order->created_at) : Carbon::now();
        $estimated = isset($meta['estimated_delivery'])
            ? Carbon::parse($meta['estimated_delivery'])
            : (strtoupper((string) $order->tag_delivery) === 'PRET_A_ETRE_LIVRE'
                ? $createdAt->copy()->addDays(3)
                : $createdAt->copy()->addDays(7));

        $orderNumber = (string) ($meta['order_number'] ?? ('LKaZJIMp' . str_pad((string) $order->id, 6, '0', STR_PAD_LEFT)));

        $status = (string) $order->status;
        $statusKey = strtolower($status);

        $steps = [
            [
                'key' => 'received',
                'label' => 'Commande reçue',
                'date' => $createdAt->toIso8601String(),
            ],
            [
                'key' => 'preparing',
                'label' => 'En préparation',
                'date' => in_array($statusKey, ['preparing', 'preparation', 'processing', 'shipped', 'delivered', 'expedie', 'expédié', 'expediee', 'livree', 'livrée'], true)
                    ? ($meta['preparing_at'] ?? null)
                    : null,
            ],
            [
                'key' => 'shipped',
                'label' => 'Expédié',
                'date' => in_array($statusKey, ['shipped', 'delivered', 'expedie', 'expédié', 'expediee', 'livree', 'livrée'], true)
                    ? ($meta['shipped_at'] ?? null)
                    : null,
            ],
            [
                'key' => 'delivered',
                'label' => 'Livré',
                'date' => in_array($statusKey, ['delivered', 'livree', 'livrée'], true)
                    ? ($meta['delivered_at'] ?? null)
                    : null,
            ],
        ];

        return response()->json([
            'tracking_number' => $number,
            'order_number' => $orderNumber,
            'status' => $order->status,
            'order_date' => $createdAt->toIso8601String(),
            'estimated_delivery' => $estimated->toIso8601String(),
            'steps' => $steps,
        ]);
    }
}
