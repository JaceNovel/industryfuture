<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'price',
        'compare_at_price',
        'stock',
        'status',
        'tag_delivery',
        'delivery_delay_days',
        'sku',
        'metadata',
        'featured',
        'is_promo',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'compare_at_price' => 'decimal:2',
        'featured' => 'boolean',
        'is_promo' => 'boolean',
        'metadata' => 'array',
        'stock' => 'integer',
        'delivery_delay_days' => 'integer',
    ];

    public function categories()
    {
        return $this->belongsToMany(Category::class);
    }

    public function images()
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    public function reviews()
    {
        return $this->hasMany(ProductReview::class)->orderByDesc('created_at');
    }
}
