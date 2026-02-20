<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grouped_offers', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->unsignedInteger('discount_percent')->default(0);
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('grouped_offer_product', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grouped_offer_id')->constrained('grouped_offers')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['grouped_offer_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grouped_offer_product');
        Schema::dropIfExists('grouped_offers');
    }
};
