<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $orders = Order::query()
            ->where('user_id', $request->user()->id)
            ->with(['items.product.images', 'payments'])
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($orders);
    }

    public function show(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $order->load(['items.product.images', 'payments', 'shippingAddress']);
        return response()->json($order);
    }
}
