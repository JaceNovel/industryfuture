<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ImportRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'status',
        'shipping_mode',
        'desired_delay_days',
        'name',
        'description',
        'photo_url',
        'admin_price',
        'payment_id',
        'tracking_number',
        'metadata',
    ];

    protected $casts = [
        'desired_delay_days' => 'integer',
        'admin_price' => 'decimal:2',
        'metadata' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }
}
