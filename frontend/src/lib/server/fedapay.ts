import { Customer, FedaPay, Transaction, Webhook } from "fedapay";

export type PaymentProviderStatus = "completed" | "failed" | "pending";

export type FedapayWebhookEvent = Record<string, unknown>;

type FedapayCustomerInput = {
  name: string;
  email: string;
  phone?: string | null;
  country?: string | null;
};

type FedapayTransactionInput = {
  amount: number;
  description: string;
  callbackUrl: string;
  customer: FedapayCustomerInput;
  customMetadata?: Record<string, unknown>;
  merchantReference?: string;
};

export type FedapayCheckoutSession = {
  provider: "fedapay" | "mock";
  paymentUrl: string;
  metadata: Record<string, unknown>;
};

type FedapayTransactionLike = {
  id?: number | string;
  reference?: string;
  status?: string;
  transaction_key?: string;
  receipt_url?: string;
  approved_at?: string;
  canceled_at?: string;
  declined_at?: string;
  updated_at?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function splitCustomerName(fullName: string) {
  const normalized = fullName.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return { firstname: "Client", lastname: "IndustryFuture" };
  }

  const parts = normalized.split(" ");
  const firstname = parts.shift() ?? "Client";
  const lastname = parts.join(" ") || "IndustryFuture";
  return { firstname, lastname };
}

function sanitizePhoneNumber(value: string | null | undefined) {
  const cleaned = String(value ?? "").replace(/[^\d+]/g, "").trim();
  return cleaned || null;
}

function normalizeCountryCode(value: string | null | undefined) {
  const cleaned = String(value ?? "BJ").trim().toUpperCase().replace(/[^A-Z]/g, "");
  return cleaned.length === 2 ? cleaned : "BJ";
}

function setupFedaPay() {
  const apiKey = process.env.FEDAPAY_API_KEY?.trim() || process.env.FEDAPAY_SECRET_KEY?.trim();
  if (!apiKey) return false;

  FedaPay.setApiKey(apiKey);
  FedaPay.setEnvironment((process.env.FEDAPAY_ENV?.trim() || "sandbox") as "sandbox" | "live");

  const accountId = process.env.FEDAPAY_ACCOUNT_ID?.trim();
  if (accountId) {
    FedaPay.setAccountId(accountId);
  }

  return true;
}

export function isFedaPayConfigured() {
  return Boolean(process.env.FEDAPAY_API_KEY?.trim() || process.env.FEDAPAY_SECRET_KEY?.trim());
}

export function isFedaPayWebhookConfigured() {
  return Boolean(process.env.FEDAPAY_WEBHOOK_SECRET?.trim());
}

function getFedaPayWebhookSecret() {
  return process.env.FEDAPAY_WEBHOOK_SECRET?.trim() || "";
}

function getFedaPayWebhookTolerance() {
  const rawValue = Number(process.env.FEDAPAY_WEBHOOK_TOLERANCE ?? Webhook.DEFAULT_TOLERANCE);
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return Webhook.DEFAULT_TOLERANCE;
  }

  return rawValue;
}

export function constructFedaPayWebhookEvent(payload: string, signatureHeader: string): FedapayWebhookEvent {
  const secret = getFedaPayWebhookSecret();
  if (!secret) {
    throw new Error("FedaPay webhook secret is not configured.");
  }

  return Webhook.constructEvent(payload, signatureHeader, secret, getFedaPayWebhookTolerance()) as FedapayWebhookEvent;
}

export function mapFedaPayStatus(status: string | null | undefined): PaymentProviderStatus {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (["approved", "paid", "completed", "transferred"].includes(normalized)) return "completed";
  if (["canceled", "cancelled", "declined", "failed", "expired", "refunded"].includes(normalized)) return "failed";
  return "pending";
}

export async function createFedaPaySession(input: FedapayTransactionInput): Promise<FedapayCheckoutSession> {
  if (!setupFedaPay()) {
    throw new Error("FedaPay is not configured.");
  }

  const { firstname, lastname } = splitCustomerName(input.customer.name);
  const customer = await Customer.create({
    firstname,
    lastname,
    email: input.customer.email,
    ...(sanitizePhoneNumber(input.customer.phone) ? { phone: sanitizePhoneNumber(input.customer.phone) } : {}),
  });

  const transaction = await Transaction.create({
    description: input.description,
    amount: Math.round(Number(input.amount) || 0),
    currency: { iso: "XOF" },
    callback_url: input.callbackUrl,
    customer: { id: (customer as unknown as { id?: number }).id },
    ...(input.customMetadata ? { custom_metadata: input.customMetadata } : {}),
    ...(input.merchantReference ? { merchant_reference: input.merchantReference } : {}),
  });

  const tokenObject = (await transaction.generateToken()) as unknown as { token?: string; url?: string };

  let sendNowResponse: Record<string, unknown> | null = null;
  const autoSendMode = process.env.FEDAPAY_AUTO_SEND_MODE?.trim();
  const phoneNumber = sanitizePhoneNumber(input.customer.phone);
  const country = normalizeCountryCode(input.customer.country);
  if (autoSendMode && tokenObject.token && phoneNumber) {
    const response = await transaction.sendNowWithToken(autoSendMode, tokenObject.token, {
      phone_number: {
        number: phoneNumber,
        country,
      },
    });
    sendNowResponse = isRecord(response) ? response : { value: response };
  }

  const typedTransaction = transaction as unknown as FedapayTransactionLike;
  return {
    provider: "fedapay",
    paymentUrl: String(tokenObject.url ?? input.callbackUrl),
    metadata: {
      mode: "fedapay",
      fedapay_transaction_id: typedTransaction.id ?? null,
      fedapay_reference: typedTransaction.reference ?? null,
      fedapay_status: typedTransaction.status ?? "pending",
      fedapay_transaction_key: typedTransaction.transaction_key ?? null,
      fedapay_payment_token: tokenObject.token ?? null,
      payment_url: tokenObject.url ?? input.callbackUrl,
      ...(sendNowResponse ? { fedapay_send_now_response: sendNowResponse } : {}),
      ...(input.customMetadata ?? {}),
    },
  };
}

export async function retrieveFedaPayTransaction(transactionId: number | string) {
  if (!setupFedaPay()) {
    throw new Error("FedaPay is not configured.");
  }

  return Transaction.retrieve(transactionId);
}

export function extractFedaPayMetadata(transaction: unknown) {
  const data = (isRecord(transaction) ? transaction : {}) as Record<string, unknown>;
  return {
    fedapay_status: typeof data.status === "string" ? data.status : "pending",
    fedapay_reference: typeof data.reference === "string" ? data.reference : null,
    fedapay_transaction_key: typeof data.transaction_key === "string" ? data.transaction_key : null,
    fedapay_receipt_url: typeof data.receipt_url === "string" ? data.receipt_url : null,
    fedapay_last_error_code: typeof data.last_error_code === "string" ? data.last_error_code : null,
    fedapay_approved_at: typeof data.approved_at === "string" ? data.approved_at : null,
    fedapay_canceled_at: typeof data.canceled_at === "string" ? data.canceled_at : null,
    fedapay_declined_at: typeof data.declined_at === "string" ? data.declined_at : null,
    fedapay_updated_at: typeof data.updated_at === "string" ? data.updated_at : null,
  };
}