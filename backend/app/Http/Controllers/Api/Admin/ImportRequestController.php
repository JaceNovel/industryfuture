<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ImportRequest;
use Illuminate\Http\Request;

class ImportRequestController extends Controller
{
    public function index(Request $request)
    {
        $query = ImportRequest::query()->with(['user:id,name,email'])->orderByDesc('created_at');

        if ($status = $request->query('status')) {
            $query->where('status', (string) $status);
        }

        if ($search = $request->query('search')) {
            $needle = trim((string) $search);
            if ($needle !== '') {
                $query->where(function ($q) use ($needle) {
                    $q->where('name', 'like', "%{$needle}%")
                        ->orWhere('tracking_number', 'like', "%{$needle}%")
                        ->orWhereHas('user', function ($u) use ($needle) {
                            $u->where('name', 'like', "%{$needle}%")
                                ->orWhere('email', 'like', "%{$needle}%");
                        });
                });
            }
        }

        return response()->json($query->paginate(50));
    }

    public function show(ImportRequest $importRequest)
    {
        $importRequest->load(['user:id,name,email', 'payment']);
        return response()->json($importRequest);
    }

    public function update(Request $request, ImportRequest $importRequest)
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:pending,accepted,priced,awaiting_payment,paid,processing,shipped,delivered,rejected,canceled'],
            'admin_price' => ['nullable', 'numeric', 'min:0'],
            'tracking_number' => ['nullable', 'string', 'max:255'],
        ]);

        if (array_key_exists('admin_price', $validated)) {
            $importRequest->admin_price = $validated['admin_price'];
            if ((float) ($validated['admin_price'] ?? 0) > 0 && in_array((string) $importRequest->status, ['pending', 'accepted', 'priced'], true)) {
                $importRequest->status = 'priced';
            }
        }

        if (array_key_exists('status', $validated)) {
            $importRequest->status = $validated['status'];
        }

        if (array_key_exists('tracking_number', $validated)) {
            $importRequest->tracking_number = $validated['tracking_number'];
        }

        $importRequest->save();
        $importRequest->load(['user:id,name,email', 'payment']);

        return response()->json($importRequest);
    }
}
