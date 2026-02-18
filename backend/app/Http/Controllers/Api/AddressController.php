<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use Illuminate\Http\Request;

class AddressController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $addresses = $user->addresses()
            ->orderByDesc('is_default')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($addresses);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'line1' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:255'],
            'postal_code' => ['required', 'string', 'max:50'],
            'country' => ['required', 'string', 'max:255'],
        ]);

        $hasDefault = $user->addresses()->where('is_default', true)->exists();

        $address = Address::create([
            'user_id' => $user->id,
            'type' => 'shipping',
            'full_name' => $user->name ?? 'Client',
            'line1' => $validated['line1'],
            'line2' => null,
            'city' => $validated['city'],
            'postal_code' => $validated['postal_code'],
            'country' => $validated['country'],
            'phone' => null,
            'is_default' => $hasDefault ? false : true,
        ]);

        return response()->json($address, 201);
    }

    public function update(Request $request, Address $address)
    {
        $user = $request->user();

        if ($address->user_id !== $user->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $validated = $request->validate([
            'line1' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:255'],
            'postal_code' => ['required', 'string', 'max:50'],
            'country' => ['required', 'string', 'max:255'],
        ]);

        $address->update([
            'line1' => $validated['line1'],
            'city' => $validated['city'],
            'postal_code' => $validated['postal_code'],
            'country' => $validated['country'],
        ]);

        return response()->json($address);
    }

    public function destroy(Request $request, Address $address)
    {
        $user = $request->user();

        if ($address->user_id !== $user->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $wasDefault = (bool) $address->is_default;
        $address->delete();

        if ($wasDefault) {
            $newDefault = $user->addresses()->orderByDesc('created_at')->first();
            if ($newDefault) {
                $newDefault->update(['is_default' => true]);
            }
        }

        return response()->json(['ok' => true]);
    }
}
