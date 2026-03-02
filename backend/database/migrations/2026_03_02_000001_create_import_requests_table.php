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
        Schema::create('import_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->string('status')->default('pending')->index();
            $table->string('shipping_mode')->default('air')->index(); // air | sea
            $table->unsignedInteger('desired_delay_days')->nullable();

            $table->string('name');
            $table->longText('description')->nullable();

            $table->string('photo_url')->nullable();

            $table->decimal('admin_price', 10, 2)->nullable();
            $table->foreignId('payment_id')->nullable();

            $table->string('tracking_number')->nullable()->index();

            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('import_requests');
    }
};
