<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));

        $users = User::query()
            ->with(['addresses' => function ($q) {
                $q->orderByDesc('is_default')->orderByDesc('created_at');
            }])
            ->withSum('orders', 'total')
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('created_at')
            ->paginate(50);

        $users->getCollection()->transform(function (User $user) {
            $address = $user->addresses->first();
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'location' => $address?->country ?? null,
                'spent_total' => (float) ($user->orders_sum_total ?? 0),
                'status' => 'active',
                'created_at' => $user->created_at,
            ];
        });

        return response()->json($users);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['nullable', 'in:admin,customer,user'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'] ?? 'customer',
        ]);

        return response()->json($user, 201);
    }

    public function show(User $user)
    {
        $user->load(['addresses', 'orders']);

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'status' => 'active',
            'spent_total' => (float) $user->orders->sum(fn ($o) => (float) $o->total),
            'orders_count' => $user->orders->count(),
            'addresses' => $user->addresses,
            'created_at' => $user->created_at,
        ]);
    }

    public function destroy(User $user)
    {
        $user->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
