<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'type',
        'amount',
        'active',
        'starts_at',
        'ends_at',
        'usage_limit',
        'used_count',
    ];

    protected $casts = [
        'active' => 'boolean',
        'amount' => 'decimal:2',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'usage_limit' => 'integer',
        'used_count' => 'integer',
    ];
}
