<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminWithdrawalRequest;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class WithdrawalRequestController extends Controller
{
    public function index(Request $request)
    {
        $withdrawals = AdminWithdrawalRequest::query()
            ->with('user:id,name,email')
            ->orderByDesc('created_at')
            ->paginate(50);

        return response()->json($withdrawals);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'provider' => ['required', 'in:flooz,tmoney'],
            'phone_number' => ['required', 'string', 'max:32'],
            'amount' => ['required', 'numeric', 'min:1'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $withdrawal = AdminWithdrawalRequest::create([
            'user_id' => $request->user()->id,
            'provider' => $validated['provider'],
            'phone_number' => $validated['phone_number'],
            'amount' => $validated['amount'],
            'status' => 'pending',
            'requested_at' => now(),
            'note' => $validated['note'] ?? null,
        ]);

        $withdrawal->load('user:id,name,email');

        return response()->json($withdrawal, 201);
    }

    public function show(AdminWithdrawalRequest $withdrawalRequest)
    {
        $withdrawalRequest->load('user:id,name,email');
        return response()->json($withdrawalRequest);
    }

    public function proofPdf(AdminWithdrawalRequest $withdrawalRequest)
    {
        $withdrawalRequest->load('user:id,name,email');

        $pdf = Pdf::loadView('admin.withdrawal-proof', [
            'withdrawal' => $withdrawalRequest,
            'generatedAt' => now(),
        ])->setPaper('a4');

        return $pdf->download('preuve-retrait-'.$withdrawalRequest->id.'.pdf');
    }
}
