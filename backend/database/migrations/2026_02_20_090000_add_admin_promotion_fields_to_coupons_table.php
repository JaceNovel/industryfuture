<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->string('name')->nullable()->after('id');
            $table->text('description')->nullable()->after('code');
            $table->decimal('min_amount', 10, 2)->nullable()->after('amount');
            $table->decimal('max_discount', 10, 2)->nullable()->after('min_amount');
            $table->string('applies_to')->default('all_products')->after('max_discount');
        });
    }

    public function down(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->dropColumn(['name', 'description', 'min_amount', 'max_discount', 'applies_to']);
        });
    }
};
