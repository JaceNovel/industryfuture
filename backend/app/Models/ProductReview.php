<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductReview extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'rating',
        'title',
        'body',
        'name',
        'email',
        'helpful_yes',
        'helpful_no',
    ];

    protected $casts = [
        'rating' => 'integer',
        'helpful_yes' => 'integer',
        'helpful_no' => 'integer',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
