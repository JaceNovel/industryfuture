<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Order;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $query = Order::query()->with(['items', 'payments', 'user'])->orderByDesc('created_at');
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        return response()->json($query->paginate(50));
    }

    public function update(Request $request, Order $order)
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', 'max:64'],
            'tag_delivery' => ['nullable', 'in:PRET_A_ETRE_LIVRE,SUR_COMMANDE'],
        ]);

        $order->fill(array_filter([
            'status' => $validated['status'] ?? null,
            'tag_delivery' => $validated['tag_delivery'] ?? null,
        ], fn ($v) => $v !== null));
        $order->save();

        $order->load(['items', 'payments', 'user']);
        return response()->json($order);
    }
}
