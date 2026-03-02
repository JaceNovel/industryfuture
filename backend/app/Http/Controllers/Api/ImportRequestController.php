<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ImportRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImportRequestController extends Controller
{
    public function index(Request $request)
    {
        $items = ImportRequest::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($items);
    }

    public function show(Request $request, ImportRequest $importRequest)
    {
        if ((int) $importRequest->user_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($importRequest);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'shipping_mode' => ['required', 'in:air,sea'],
            'desired_delay_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        $photoUrl = null;
        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('imports', 'public');
            $photoUrl = url(Storage::disk('public')->url($path));
        }

        $req = ImportRequest::create([
            'user_id' => $request->user()->id,
            'status' => 'pending',
            'shipping_mode' => $validated['shipping_mode'],
            'desired_delay_days' => $validated['desired_delay_days'] ?? null,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'photo_url' => $photoUrl,
            'tracking_number' => Str::upper(Str::random(8)) . '-' . Str::upper(Str::random(6)),
            'metadata' => null,
        ]);

        return response()->json($req, 201);
    }
}
