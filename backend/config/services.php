<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'payments' => [
        'frontend_url' => env('FRONTEND_URL', env('APP_URL', 'http://localhost:8000')),
    ],

    'fedapay' => [
        'secret_key' => env('FEDAPAY_SECRET_KEY'),
        // Expected values for the PHP SDK: 'sandbox' or 'production'
        'environment' => env('FEDAPAY_ENV', 'sandbox'),
        // Webhook endpoint secret (starts with whsec_...)
        'webhook_secret' => env('FEDAPAY_WEBHOOK_SECRET'),
        // Signature timestamp tolerance (seconds)
        'webhook_tolerance' => (int) env('FEDAPAY_WEBHOOK_TOLERANCE', 300),
    ],

];
