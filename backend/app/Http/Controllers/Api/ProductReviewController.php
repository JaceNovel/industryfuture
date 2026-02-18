<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductReview;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductReviewController extends Controller
{
    public function index(Request $request, string $slug)
    {
        $product = Product::query()
            ->where('slug', $slug)
            ->where('status', 'active')
            ->firstOrFail();

        $limit = (int) $request->query('limit', 5);
        $limit = max(1, min($limit, 50));

        $baseQuery = ProductReview::query()->where('product_id', $product->id);

        $total = (clone $baseQuery)->count();
        $average = (clone $baseQuery)->avg('rating');
        $average = $average ? round((float) $average, 1) : 0.0;

        $breakdownRaw = (clone $baseQuery)
            ->select('rating', DB::raw('count(*) as c'))
            ->groupBy('rating')
            ->pluck('c', 'rating');

        $breakdown = [5 => 0, 4 => 0, 3 => 0, 2 => 0, 1 => 0];
        foreach ($breakdownRaw as $rating => $count) {
            $r = (int) $rating;
            if (isset($breakdown[$r])) {
                $breakdown[$r] = (int) $count;
            }
        }

        $reviews = (clone $baseQuery)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        return response()->json([
            'data' => $reviews,
            'meta' => [
                'total' => $total,
                'average' => $average,
                'breakdown' => $breakdown,
                'limit' => $limit,
            ],
        ]);
    }

    public function store(Request $request, string $slug)
    {
        $product = Product::query()
            ->where('slug', $slug)
            ->where('status', 'active')
            ->firstOrFail();

        $validated = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'title' => ['required', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:5000'],
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:180'],
        ]);

        $review = ProductReview::create([
            'product_id' => $product->id,
            'rating' => $validated['rating'],
            'title' => $validated['title'],
            'body' => $validated['body'],
            'name' => $validated['name'],
            'email' => $validated['email'],
            'helpful_yes' => 0,
            'helpful_no' => 0,
        ]);

        return response()->json($review, 201);
    }
}
