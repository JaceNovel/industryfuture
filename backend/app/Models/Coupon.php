<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'description',
        'type',
        'amount',
        'min_amount',
        'max_discount',
        'applies_to',
        'active',
        'unique_per_user',
        'starts_at',
        'ends_at',
        'usage_limit',
        'used_count',
    ];

    protected $casts = [
        'active' => 'boolean',
        'unique_per_user' => 'boolean',
        'amount' => 'decimal:2',
        'min_amount' => 'decimal:2',
        'max_discount' => 'decimal:2',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'usage_limit' => 'integer',
        'used_count' => 'integer',
    ];
}
