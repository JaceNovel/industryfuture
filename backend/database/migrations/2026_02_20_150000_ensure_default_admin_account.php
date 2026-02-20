<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'admin@industry.space'],
            [
                'name' => 'Admin',
                'role' => 'admin',
                'password' => 'admin@industry.space',
            ]
        );
    }

    public function down(): void
    {
    }
};
