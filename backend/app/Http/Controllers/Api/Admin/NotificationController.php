<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminWithdrawalRequest;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $since = null;
        $sinceRaw = $request->query('since');
        if (is_string($sinceRaw) && trim($sinceRaw) !== '') {
            try {
                $since = Carbon::parse($sinceRaw);
            } catch (\Throwable $e) {
                $since = null;
            }
        }

        $orders = Order::query()
            ->select(['id', 'created_at', 'total'])
            ->with('user:id,name,email')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->map(function (Order $order) {
                return [
                    'type' => 'order',
                    'id' => $order->id,
                    'created_at' => optional($order->created_at)?->toIso8601String(),
                    'title' => 'Nouvelle commande',
                    'message' => 'Commande #'.$order->id.' de '.($order->user?->name ?? $order->user?->email ?? 'client'),
                    'href' => '/admin/orders/'.$order->id,
                ];
            });

        $users = User::query()
            ->select(['id', 'name', 'email', 'created_at'])
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->map(function (User $user) {
                return [
                    'type' => 'user',
                    'id' => $user->id,
                    'created_at' => optional($user->created_at)?->toIso8601String(),
                    'title' => 'Nouvelle inscription',
                    'message' => ($user->name ?: 'Utilisateur').' ('.$user->email.')',
                    'href' => '/admin/users/'.$user->id,
                ];
            });

        $withdrawals = AdminWithdrawalRequest::query()
            ->select(['id', 'provider', 'amount', 'created_at'])
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->map(function (AdminWithdrawalRequest $withdrawal) {
                return [
                    'type' => 'withdrawal',
                    'id' => $withdrawal->id,
                    'created_at' => optional($withdrawal->created_at)?->toIso8601String(),
                    'title' => 'Demande de retrait',
                    'message' => strtoupper($withdrawal->provider).' - '.number_format((float) $withdrawal->amount, 0, ',', ' ').' FCFA',
                    'href' => '/admin/settings',
                ];
            });

        $notifications = (new Collection())
            ->merge($orders)
            ->merge($users)
            ->merge($withdrawals)
            ->sortByDesc('created_at')
            ->values()
            ->take(30)
            ->all();

        $unreadCount = 0;
        if ($since) {
            $unreadCount = collect($notifications)->filter(function (array $n) use ($since) {
                if (!isset($n['created_at']) || !is_string($n['created_at'])) {
                    return false;
                }
                try {
                    return Carbon::parse($n['created_at'])->greaterThan($since);
                } catch (\Throwable $e) {
                    return false;
                }
            })->count();
        }

        return response()->json([
            'data' => $notifications,
            'unread_count' => $unreadCount,
            'server_time' => now()->toIso8601String(),
        ]);
    }
}
