<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductReviewController;
use App\Http\Controllers\Api\ReverseGeocodeController;
use App\Http\Controllers\Api\TrackingController;
use App\Http\Controllers\Api\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Api\Admin\CouponController as AdminCouponController;
use App\Http\Controllers\Api\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Api\Admin\ProductImageController as AdminProductImageController;
use App\Http\Controllers\Api\Admin\ProductImportController as AdminProductImportController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\Admin\GroupedOfferController as AdminGroupedOfferController;
use App\Http\Controllers\Api\Admin\WithdrawalRequestController as AdminWithdrawalRequestController;
use App\Http\Controllers\Api\Admin\NotificationController as AdminNotificationController;

Route::get('/health', HealthController::class);

Route::get('/categories', [CategoryController::class, 'index']);

Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{slug}', [ProductController::class, 'show']);
Route::get('/products/{slug}/reviews', [ProductReviewController::class, 'index']);
Route::post('/products/{slug}/reviews', [ProductReviewController::class, 'store']);

Route::get('/tracking/{number}', TrackingController::class);

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/addresses', [AddressController::class, 'index']);
    Route::post('/addresses', [AddressController::class, 'store']);
    Route::patch('/addresses/{address}', [AddressController::class, 'update']);
    Route::delete('/addresses/{address}', [AddressController::class, 'destroy']);

    Route::get('/geocode/reverse', ReverseGeocodeController::class);

    Route::get('/cart', [CartController::class, 'show']);
    Route::post('/cart', [CartController::class, 'add']);
    Route::patch('/cart', [CartController::class, 'update']);
    Route::delete('/cart', [CartController::class, 'remove']);

    Route::post('/checkout', [CheckoutController::class, 'store']);

    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);

    Route::prefix('admin')->middleware('role:admin')->group(function () {
        Route::apiResource('categories', AdminCategoryController::class);
        Route::apiResource('products', AdminProductController::class);
        Route::post('import/products', [AdminProductImportController::class, 'store']);
        Route::apiResource('coupons', AdminCouponController::class);
        Route::apiResource('grouped-offers', AdminGroupedOfferController::class);
        Route::apiResource('users', AdminUserController::class)->only(['index', 'store', 'show', 'destroy']);
        Route::apiResource('withdrawal-requests', AdminWithdrawalRequestController::class)->only(['index', 'store', 'show']);
        Route::get('notifications', [AdminNotificationController::class, 'index']);

        Route::get('products/{product}/images', [AdminProductImageController::class, 'index']);
        Route::post('products/{product}/images', [AdminProductImageController::class, 'store']);
        Route::patch('product-images/{productImage}', [AdminProductImageController::class, 'update']);
        Route::delete('product-images/{productImage}', [AdminProductImageController::class, 'destroy']);

        Route::get('orders', [AdminOrderController::class, 'index']);
        Route::get('orders/{order}', [AdminOrderController::class, 'show']);
        Route::patch('orders/{order}', [AdminOrderController::class, 'update']);
        Route::get('orders/{order}/delivery-note', [AdminOrderController::class, 'deliveryNote']);

        Route::get('withdrawal-requests/{withdrawalRequest}/proof-pdf', [AdminWithdrawalRequestController::class, 'proofPdf']);
    });
});
