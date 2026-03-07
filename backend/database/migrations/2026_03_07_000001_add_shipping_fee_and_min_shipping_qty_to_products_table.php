<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('shipping_fee', 10, 2)->default(0)->after('compare_at_price');
            $table->unsignedInteger('min_shipping_qty')->nullable()->after('shipping_fee');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['shipping_fee', 'min_shipping_qty']);
        });
    }
};
