import { Webhook } from "fedapay";

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
  last_error_code?: string;
};

type FedaPayRequestMethod = "GET" | "POST";

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

function getFedaPayApiKey() {
  return process.env.FEDAPAY_API_KEY?.trim() || process.env.FEDAPAY_SECRET_KEY?.trim() || "";
}

function getFedaPayEnvironment() {
  return (process.env.FEDAPAY_ENV?.trim().toLowerCase() || "sandbox") as "sandbox" | "live";
}

function getFedaPayBaseUrl() {
  return getFedaPayEnvironment() === "live" ? "https://api.fedapay.com" : "https://sandbox-api.fedapay.com";
}

function getFedaPayHeaders() {
  const apiKey = getFedaPayApiKey();
  if (!apiKey) {
    throw new Error("FedaPay is not configured.");
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "X-Version": "1.1.1",
    "X-Source": "FuturInd Server",
  };

  const accountId = process.env.FEDAPAY_ACCOUNT_ID?.trim();
  if (accountId) {
    headers["FedaPay-Account"] = accountId;
  }

  return headers;
}

async function fedapayRequest<T>(path: string, method: FedaPayRequestMethod, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${getFedaPayBaseUrl()}/v1${path}`, {
    method,
    headers: getFedaPayHeaders(),
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const record = isRecord(data) ? data : {};
    const message = typeof record.message === "string" && record.message.trim()
      ? record.message.trim()
      : `FedaPay request failed with status ${response.status}.`;
    const error = new Error(message) as Error & { response?: { status: number; data: unknown } };
    error.response = { status: response.status, data };
    throw error;
  }

  return data as T;
}

export function isFedaPayConfigured() {
  return Boolean(getFedaPayApiKey());
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
  if (!isFedaPayConfigured()) {
    throw new Error("FedaPay is not configured.");
  }

  const { firstname, lastname } = splitCustomerName(input.customer.name);
  const customerResponse = await fedapayRequest<{ "v1/customer"?: FedapayTransactionLike & { email?: string; phone?: string } }>("/customers", "POST", {
    firstname,
    lastname,
    email: input.customer.email,
    ...(sanitizePhoneNumber(input.customer.phone) ? { phone: sanitizePhoneNumber(input.customer.phone) } : {}),
  });
  const customer = isRecord(customerResponse) && isRecord(customerResponse["v1/customer"])
    ? (customerResponse["v1/customer"] as Record<string, unknown>)
    : null;
  const customerId = Number(customer?.id ?? 0);
  if (!customerId) {
    throw new Error("Unable to create FedaPay customer.");
  }

  const transactionResponse = await fedapayRequest<{ "v1/transaction"?: FedapayTransactionLike }>("/transactions", "POST", {
    description: input.description,
    amount: Math.round(Number(input.amount) || 0),
    currency: { iso: "XOF" },
    callback_url: input.callbackUrl,
    customer: { id: customerId },
    ...(input.customMetadata ? { custom_metadata: input.customMetadata } : {}),
    ...(input.merchantReference ? { merchant_reference: input.merchantReference } : {}),
  });
  const transaction = isRecord(transactionResponse) && isRecord(transactionResponse["v1/transaction"])
    ? (transactionResponse["v1/transaction"] as Record<string, unknown>)
    : null;
  const transactionId = Number(transaction?.id ?? 0);
  if (!transactionId) {
    throw new Error("Unable to create FedaPay transaction.");
  }

  const tokenObject = await fedapayRequest<{ token?: string; url?: string }>(`/transactions/${transactionId}/token`, "POST");

  let sendNowResponse: Record<string, unknown> | null = null;
  const autoSendMode = process.env.FEDAPAY_AUTO_SEND_MODE?.trim();
  const phoneNumber = sanitizePhoneNumber(input.customer.phone);
  const country = normalizeCountryCode(input.customer.country);
  if (autoSendMode && tokenObject.token && phoneNumber) {
    const response = await fedapayRequest<Record<string, unknown>>(`/${autoSendMode}`, "POST", {
      token: tokenObject.token,
      phone_number: {
        number: phoneNumber,
        country,
      },
    });
    sendNowResponse = isRecord(response) ? response : { value: response };
  }

  const typedTransaction = transaction as FedapayTransactionLike;
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
  if (!isFedaPayConfigured()) {
    throw new Error("FedaPay is not configured.");
  }

  const response = await fedapayRequest<{ "v1/transaction"?: Record<string, unknown> }>(`/transactions/${transactionId}`, "GET");
  if (isRecord(response) && isRecord(response["v1/transaction"])) {
    return response["v1/transaction"];
  }

  return response;
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