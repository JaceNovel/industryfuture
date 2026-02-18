<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('product_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->string('title', 120);
            $table->text('body');
            $table->string('name', 120);
            $table->string('email', 180);
            $table->unsignedInteger('helpful_yes')->default(0);
            $table->unsignedInteger('helpful_no')->default(0);
            $table->timestamps();

            $table->index(['product_id', 'created_at']);
            $table->index(['product_id', 'rating']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_reviews');
    }
};
