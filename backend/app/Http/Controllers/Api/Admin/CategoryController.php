<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index()
    {
        return response()->json(Category::query()->orderBy('name')->paginate(50));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:64'],
            'description' => ['nullable', 'string'],
            'image_url' => ['nullable', 'string', 'max:2048'],
        ]);

        $slugBase = $validated['slug'] ?? Str::slug($validated['name']);
        $slug = $this->uniqueSlug($slugBase);

        $category = Category::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'icon' => $validated['icon'] ?? null,
            'description' => $validated['description'] ?? null,
            'image_url' => $validated['image_url'] ?? null,
        ]);

        return response()->json($category, 201);
    }

    public function show(Category $category)
    {
        return response()->json($category);
    }

    public function update(Request $request, Category $category)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:64'],
            'description' => ['nullable', 'string'],
            'image_url' => ['nullable', 'string', 'max:2048'],
        ]);

        if (array_key_exists('slug', $validated)) {
            $slug = $this->uniqueSlug($validated['slug'], $category->id);
            $validated['slug'] = $slug;
        }

        $category->fill($validated);
        $category->save();

        return response()->json($category);
    }

    public function destroy(Category $category)
    {
        $category->delete();
        return response()->json(['message' => 'Deleted']);
    }

    private function uniqueSlug(string $base, ?int $ignoreId = null): string
    {
        $slug = Str::slug($base);
        $try = $slug;
        $i = 2;

        while (Category::query()
            ->where('slug', $try)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists()) {
            $try = $slug.'-'.$i;
            $i++;
        }

        return $try;
    }
}
