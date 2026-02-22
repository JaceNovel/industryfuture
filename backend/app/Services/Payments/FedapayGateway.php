<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\Payment;
use FedaPay\FedaPay;
use FedaPay\Transaction;
use FedaPay\Webhook;
use Illuminate\Support\Str;
use RuntimeException;

class FedapayGateway
{
    private static bool $booted = false;

    public function isConfigured(): bool
    {
        return (string) config('services.fedapay.secret_key') !== '';
    }

    public function boot(): void
    {
        if (self::$booted) {
            return;
        }

        $secretKey = (string) config('services.fedapay.secret_key');
        if ($secretKey === '') {
            throw new RuntimeException('Payment gateway is not configured (missing FEDAPAY_SECRET_KEY).');
        }

        FedaPay::setApiKey($secretKey);
        FedaPay::setEnvironment((string) config('services.fedapay.environment', 'sandbox'));

        self::$booted = true;
    }

    /**
     * @param array{firstname?:string,lastname?:string,email?:string,phone_number?:array{number?:string,country?:string}} $customer
     * @return array{payment_url:string,token:string|null,transaction_id:int,reference:string|null,merchant_reference:string}
     */
    public function createPaymentLink(Order $order, Payment $payment, array $customer = []): array
    {
        $this->boot();

        $frontendUrl = rtrim((string) config('services.payments.frontend_url', ''), '/');
        if ($frontendUrl === '') {
            throw new RuntimeException('Payment frontend URL is not configured (missing FRONTEND_URL).');
        }

        $amount = (int) round((float) $order->total);
        if ($amount < 1) {
            throw new RuntimeException('Invalid payment amount.');
        }

        $merchantReference = sprintf(
            'ORD-%d-PAY-%d-%s',
            (int) $order->id,
            (int) $payment->id,
            Str::upper(Str::random(6))
        );

        $callbackUrl = $frontendUrl . '/payment/return?order_id=' . (int) $order->id . '&payment_id=' . (int) $payment->id;

        $payload = [
            'description' => 'Paiement commande #' . (int) $order->id,
            'amount' => $amount,
            'currency' => ['iso' => 'XOF'],
            'callback_url' => $callbackUrl,
            'merchant_reference' => $merchantReference,
            'custom_metadata' => [
                'order_id' => (int) $order->id,
                'payment_id' => (int) $payment->id,
            ],
        ];

        if (!empty($customer)) {
            $payload['customer'] = $customer;
        }

        $transaction = Transaction::create($payload);
        $tokenObject = $transaction->generateToken();

        $url = (string) ($tokenObject->url ?? '');
        if ($url === '') {
            throw new RuntimeException('Failed to generate payment URL.');
        }

        return [
            'payment_url' => $url,
            'token' => isset($tokenObject->token) ? (string) $tokenObject->token : null,
            'transaction_id' => (int) $transaction->id,
            'reference' => isset($transaction->reference) ? (string) $transaction->reference : null,
            'merchant_reference' => $merchantReference,
        ];
    }

    public function constructWebhookEvent(string $payload, ?string $signatureHeader)
    {
        $this->boot();

        $secret = (string) config('services.fedapay.webhook_secret');
        if ($secret === '') {
            throw new RuntimeException('Webhook secret is not configured (missing FEDAPAY_WEBHOOK_SECRET).');
        }

        $tolerance = (int) config('services.fedapay.webhook_tolerance', 300);
        return Webhook::constructEvent($payload, (string) $signatureHeader, $secret, $tolerance);
    }

    public function retrieveTransaction(int $transactionId)
    {
        $this->boot();
        return Transaction::retrieve($transactionId);
    }
}
