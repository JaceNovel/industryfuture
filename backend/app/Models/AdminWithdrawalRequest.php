<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdminWithdrawalRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'provider',
        'phone_number',
        'amount',
        'status',
        'requested_at',
        'processed_at',
        'note',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'requested_at' => 'datetime',
        'processed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
