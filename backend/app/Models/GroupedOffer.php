<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GroupedOffer extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'discount_percent',
        'category_id',
        'active',
    ];

    protected $casts = [
        'discount_percent' => 'integer',
        'active' => 'boolean',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function products()
    {
        return $this->belongsToMany(Product::class, 'grouped_offer_product');
    }
}
