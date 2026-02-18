<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->longText('description')->nullable();
            $table->decimal('price', 10, 2)->default(0);
            $table->decimal('compare_at_price', 10, 2)->nullable();
            $table->unsignedInteger('stock')->default(999);
            $table->string('status')->default('draft')->index();
            $table->string('tag_delivery')->default('SUR_COMMANDE')->index();
            $table->unsignedInteger('delivery_delay_days')->nullable();
            $table->string('sku')->nullable()->index();
            $table->json('metadata')->nullable();
            $table->boolean('featured')->default(false)->index();
            $table->timestamps();

            $table->index(['price']);
            $table->index(['created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
