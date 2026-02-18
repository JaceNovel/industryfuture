<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::query()
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'icon', 'description', 'image_url']);

        return response()->json($categories);
    }
}
