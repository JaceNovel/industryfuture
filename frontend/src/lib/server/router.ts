import { Prisma } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { put } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  applyAuthCookies,
  clearAuthCookies,
  createAuthToken,
  getSessionUser,
  type SessionUser,
} from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import {
  constructFedaPayWebhookEvent,
  createFedaPaySession,
  extractFedaPayMetadata,
  isFedaPayConfigured,
  isFedaPayWebhookConfigured,
  mapFedaPayStatus,
  retrieveFedaPayTransaction,
} from "@/lib/server/fedapay";

const money = z.coerce.number().finite().nonnegative();

const registerSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().email().max(255),
  password: z.string().min(8).max(255),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const addressSchema = z.object({
  line1: z.string().trim().min(1).max(255),
  city: z.string().trim().min(1).max(255),
  postal_code: z.string().trim().min(1).max(50),
  country: z.string().trim().min(2).max(255),
});

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(5000),
  name: z.string().trim().min(1).max(120),
  email: z.string().email().max(180),
});

const categoryUpsertSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).optional().nullable(),
  icon: z.string().trim().max(255).optional().nullable(),
});

const productUpsertSchema = z.object({
  name: z.string().trim().min(1).max(255),
  slug: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(30000).optional().nullable(),
  price: money,
  compare_at_price: money.optional().nullable(),
  stock: z.coerce.number().int().min(0).max(999999).optional(),
  status: z.enum(["draft", "active"]).optional(),
  tag_delivery: z.enum(["PRET_A_ETRE_LIVRE", "SUR_COMMANDE"]).optional(),
  delivery_delay_days: z.coerce.number().int().min(0).max(365).optional().nullable(),
  sku: z.string().trim().max(255).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  featured: z.coerce.boolean().optional(),
  is_promo: z.coerce.boolean().optional(),
  categories: z.array(z.string()).optional(),
});

const couponSchema = z.object({
  name: z.string().trim().min(1).max(255),
  code: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).optional().nullable(),
  type: z.enum(["percent", "fixed", "shipping"]),
  amount: money,
  min_amount: money.optional().nullable(),
  max_discount: money.optional().nullable(),
  applies_to: z.enum(["all_products", "category", "product"]).default("all_products"),
  active: z.coerce.boolean().default(true),
  unique_per_user: z.coerce.boolean().optional(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
  usage_limit: z.coerce.number().int().min(1).optional().nullable(),
});

const groupedOfferSchema = z.object({
  title: z.string().trim().min(1).max(255),
  discount_percent: z.coerce.number().int().min(0).max(100),
  category_id: z.coerce.number().int().positive().optional().nullable(),
  product_ids: z.array(z.coerce.number().int().positive()).default([]),
  active: z.coerce.boolean().default(true),
});

const userCreateSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().email().max(255),
  password: z.string().min(8).max(255),
  role: z.string().trim().min(1).max(50).default("customer"),
});

const withdrawalSchema = z.object({
  provider: z.enum(["flooz", "tmoney"]),
  phone_number: z.string().trim().min(8).max(64),
  amount: money,
  note: z.string().trim().max(5000).optional().nullable(),
});

const importRequestPatchSchema = z.object({
  status: z.string().trim().min(1).max(50).optional(),
  admin_price: money.optional(),
  tracking_number: z.string().trim().max(255).optional().nullable(),
});

const checkoutSchema = z.object({
  shipping_address_id: z.coerce.number().int().positive().optional(),
  shipping_address: z
    .object({
      full_name: z.string().trim().min(1).max(255),
      line1: z.string().trim().min(1).max(255),
      line2: z.string().trim().max(255).optional().nullable(),
      city: z.string().trim().min(1).max(255),
      postal_code: z.string().trim().min(1).max(32),
      country: z.string().trim().min(2).max(2).optional(),
      phone: z.string().trim().max(64).optional().nullable(),
    })
    .optional(),
  customer_phone: z.string().trim().max(64).optional().nullable(),
  customer_country: z.string().trim().min(2).max(2).optional().nullable(),
});

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    images: { orderBy: { sort_order: "asc" } };
    category_products: { include: { category: true } };
  };
}>;

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    user: { select: { id: true; name: true; email: true } };
    items: { include: { product: { include: { images: true; category_products: { include: { category: true } } } } } };
    payments: true;
    shippingAddress: true;
  };
}>;

function ok(data: unknown, status = 200) {
  return NextResponse.json(serialize(data), { status });
}

function fail(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

function serialize<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

function toJsonInput(value: Record<string, unknown> | null | undefined) {
  return value ? (value as Prisma.InputJsonValue) : Prisma.JsonNull;
}

function isFormDataRequest(request: NextRequest) {
  return request.headers.get("content-type")?.includes("multipart/form-data") ?? false;
}

async function parseJson<T>(request: NextRequest, schema: z.ZodType<T>) {
  const body = await request.json().catch(() => null);
  return schema.parse(body);
}

function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function randomCode(length = 6) {
  return Math.random().toString(36).slice(2, 2 + length).toUpperCase();
}

async function uniqueSlug(baseValue: string, table: "product" | "category") {
  const base = slugify(baseValue) || `item-${randomCode(4).toLowerCase()}`;
  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing =
      table === "product"
        ? await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } })
        : await prisma.category.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function paginationFrom(request: NextRequest, defaults = { page: 1, perPage: 20, max: 100 }) {
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? defaults.page) || defaults.page);
  const rawPerPage = Number(request.nextUrl.searchParams.get("perPage") ?? defaults.perPage) || defaults.perPage;
  const perPage = Math.max(1, Math.min(defaults.max, rawPerPage));
  return { page, perPage, skip: (page - 1) * perPage };
}

function orderMetadata(tag_delivery: string, extra: Record<string, unknown> = {}) {
  const deliveryDays = tag_delivery === "PRET_A_ETRE_LIVRE" ? 3 : 7;
  return {
    tracking_number: `${randomCode(8)}-${randomCode(6)}`,
    order_number: `IF${Date.now()}${randomCode(4)}`,
    estimated_delivery: new Date(Date.now() + deliveryDays * 24 * 60 * 60 * 1000).toISOString(),
    ...extra,
  };
}

async function requireAuth(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return { response: fail("Unauthorized", 401), user: null };
  return { response: null, user };
}

async function requireAdmin(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response || !auth.user) return auth;
  if (auth.user.role !== "admin") return { response: fail("Forbidden", 403), user: null };
  return auth;
}

async function uploadFile(file: File, directory: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  }
  const safeName = `${directory}/${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, "")) || "file"}.${file.name.split(".").pop() ?? "bin"}`;
  const blob = await put(safeName, file, { access: "public" });
  return blob.url;
}

function mapProduct(product: ProductWithRelations | null) {
  if (!product) return null;
  return {
    ...product,
    categories: product.category_products.map((item) => item.category),
  };
}

function sortPaymentsByDate(payments: OrderWithRelations["payments"]) {
  return [...payments].sort((left, right) => {
    const leftTime = left.created_at instanceof Date ? left.created_at.getTime() : new Date(left.created_at ?? 0).getTime();
    const rightTime = right.created_at instanceof Date ? right.created_at.getTime() : new Date(right.created_at ?? 0).getTime();
    return rightTime - leftTime;
  });
}

function deriveOrderPaymentStatus(payments: OrderWithRelations["payments"]) {
  const sorted = sortPaymentsByDate(payments);
  if (sorted.some((payment) => payment.status === "completed")) return "completed";
  if (sorted.some((payment) => payment.status === "pending")) return "pending";
  if (sorted.some((payment) => payment.status === "failed")) return "failed";
  return "unpaid";
}

function mapOrder(order: OrderWithRelations | null) {
  if (!order) return null;
  const payments = sortPaymentsByDate(order.payments);
  return {
    ...order,
    payments,
    payment_status: deriveOrderPaymentStatus(payments),
    items: order.items.map((item) => ({
      ...item,
      product: mapProduct(item.product as ProductWithRelations | null),
    })),
    shipping_address: order.shippingAddress,
  };
}

async function getOrCreateCart(userId: number) {
  return prisma.cart.upsert({
    where: { user_id: userId },
    update: {},
    create: { user_id: userId },
  });
}

async function cartPayload(userId: number) {
  const cart = await prisma.cart.upsert({
    where: { user_id: userId },
    update: {},
    create: { user_id: userId },
    include: {
      items: {
        orderBy: { created_at: "asc" },
        include: {
          product: {
            include: {
              images: { orderBy: { sort_order: "asc" } },
              category_products: { include: { category: true } },
            },
          },
        },
      },
    },
  });

  return {
    ...cart,
    items: cart.items.map((item) => ({
      ...item,
      product: mapProduct(item.product as ProductWithRelations),
    })),
  };
}

async function setPaymentStatus(paymentId: number, status: "completed" | "failed" | "pending") {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: true },
  });
  if (!payment) return null;

  const metadata = ((payment.metadata as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;

  const updatedPayment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status,
      paid_at: status === "completed" ? new Date() : null,
      metadata: toJsonInput({
        ...metadata,
        ...(payment.provider === "mock" ? { mock: true } : {}),
      }),
    },
    include: { order: true },
  });

  const orderMeta = ((updatedPayment.order.metadata as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  if (status === "completed") {
    await prisma.order.update({
      where: { id: updatedPayment.order_id },
      data: {
        status: "preparing",
        metadata: {
          ...orderMeta,
          preparing_at: orderMeta.preparing_at ?? new Date().toISOString(),
          delivery_status: orderMeta.delivery_status ?? "pending",
        },
      },
    });

    const importRequestId = Number(metadata.import_request_id ?? 0);
    if (importRequestId > 0) {
      await prisma.importRequest.update({
        where: { id: importRequestId },
        data: { status: "paid", payment_id: updatedPayment.id },
      });
    }

    const cart = await prisma.cart.findUnique({ where: { user_id: updatedPayment.order.user_id }, select: { id: true } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cart_id: cart.id } });
    }
  }

  if (status === "failed") {
    await prisma.order.update({
      where: { id: updatedPayment.order_id },
      data: {
        status: "canceled",
        metadata: {
          ...orderMeta,
          canceled_at: orderMeta.canceled_at ?? new Date().toISOString(),
        },
      },
    });

    const importRequestId = Number(metadata.import_request_id ?? 0);
    if (importRequestId > 0) {
      await prisma.importRequest.update({
        where: { id: importRequestId },
        data: { status: "canceled", payment_id: updatedPayment.id },
      });
    }
  }

  return updatedPayment;
}

function buildPaymentReturnUrl(orderId: number, paymentId: number, extra: Record<string, string> = {}) {
  const url = new URL(`${getAppUrl()}/payment/return`);
  url.searchParams.set("order_id", String(orderId));
  url.searchParams.set("payment_id", String(paymentId));
  for (const [key, value] of Object.entries(extra)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function canUseMockPayments() {
  if (process.env.ALLOW_MOCK_PAYMENTS?.trim() === "1" || process.env.ALLOW_MOCK_PAYMENTS?.trim()?.toLowerCase() === "true") {
    return true;
  }

  return process.env.NODE_ENV !== "production";
}

async function initializeHostedPayment(params: {
  paymentId: number;
  orderId: number;
  amount: number;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  customerCountry?: string | null;
  extraMetadata?: Record<string, unknown>;
}) {
  if (!isFedaPayConfigured()) {
    if (!canUseMockPayments()) {
      throw new Error("FedaPay is not configured on the server.");
    }

    const paymentUrl = buildPaymentReturnUrl(params.orderId, params.paymentId, { mock: "1" });
    return {
      provider: "mock" as const,
      paymentUrl,
      metadata: {
        ...(params.extraMetadata ?? {}),
        mode: "mock",
        payment_url: paymentUrl,
      },
    };
  }

  const session = await createFedaPaySession({
    amount: params.amount,
    description: params.description,
    callbackUrl: buildPaymentReturnUrl(params.orderId, params.paymentId),
    customer: {
      name: params.customerName,
      email: params.customerEmail,
      phone: params.customerPhone,
      country: params.customerCountry,
    },
    customMetadata: {
      payment_id: params.paymentId,
      order_id: params.orderId,
      ...(params.extraMetadata ?? {}),
    },
    merchantReference: `IF-${params.orderId}-${params.paymentId}`,
  });

  return {
    provider: session.provider,
    paymentUrl: session.paymentUrl,
    metadata: session.metadata,
  };
}

async function syncPaymentWithProvider(paymentId: number) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.provider !== "fedapay") {
    return payment;
  }

  const metadata = ((payment.metadata as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  const transactionId = metadata.fedapay_transaction_id;
  if (transactionId == null) {
    return payment;
  }

  const transaction = await retrieveFedaPayTransaction(transactionId as string | number);
  const nextStatus = mapFedaPayStatus((transaction as { status?: string }).status);

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      metadata: toJsonInput({
        ...metadata,
        ...extractFedaPayMetadata(transaction),
      }),
    },
  });

  if (nextStatus !== payment.status) {
    await setPaymentStatus(payment.id, nextStatus);
  }

  return prisma.payment.findUnique({ where: { id: payment.id } });
}

function getPaymentWebhookSignature(request: NextRequest) {
  return (
    request.headers.get("x-fedapay-signature") ??
    request.headers.get("fedapay-signature") ??
    request.headers.get("x-webhook-signature") ??
    request.headers.get("webhook-signature") ??
    request.headers.get("signature")
  );
}

function extractWebhookTransactionId(event: Record<string, unknown>) {
  const entity = asRecord(event.entity);
  const transaction = asRecord(entity?.transaction);
  const candidates = [
    event.object_id,
    entity?.id,
    entity?.transaction_id,
    transaction?.id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" || typeof candidate === "number") {
      return candidate;
    }
  }

  return null;
}

function extractWebhookPaymentId(event: Record<string, unknown>) {
  const entity = asRecord(event.entity);
  const customMetadata = asRecord(entity?.custom_metadata);
  const value = customMetadata?.payment_id;
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

async function findPaymentByFedapayTransactionId(transactionId: string | number) {
  return prisma.payment.findFirst({
    where: {
      provider: "fedapay",
      OR: [
        { metadata: { path: ["fedapay_transaction_id"], equals: transactionId } },
        { metadata: { path: ["fedapay_transaction_id"], equals: String(transactionId) } },
      ],
    },
  });
}

async function handlePaymentWebhook(request: NextRequest) {
  if (!isFedaPayWebhookConfigured()) {
    return fail("FedaPay webhook secret is not configured", 503);
  }

  const signatureHeader = getPaymentWebhookSignature(request);
  if (!signatureHeader) {
    return fail("Missing FedaPay webhook signature", 400);
  }

  const payload = await request.text();

  let event: Record<string, unknown>;
  try {
    event = constructFedaPayWebhookEvent(payload, signatureHeader);
  } catch {
    return fail("Invalid FedaPay webhook signature", 400);
  }

  const paymentId = extractWebhookPaymentId(event);
  if (paymentId) {
    const syncedPayment = await syncPaymentWithProvider(paymentId);
    return ok({ received: true, processed: Boolean(syncedPayment), payment_id: paymentId, event_type: event.type ?? null });
  }

  const transactionId = extractWebhookTransactionId(event);
  if (!transactionId) {
    return ok({ received: true, processed: false, event_type: event.type ?? null });
  }

  const payment = await findPaymentByFedapayTransactionId(transactionId);
  if (!payment) {
    return ok({ received: true, processed: false, transaction_id: transactionId, event_type: event.type ?? null });
  }

  await syncPaymentWithProvider(payment.id);
  return ok({ received: true, processed: true, payment_id: payment.id, transaction_id: transactionId, event_type: event.type ?? null });
}

async function createPdf(title: string, lines: string[]) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawText(title, {
    x: 48,
    y: 792,
    size: 20,
    font: bold,
    color: rgb(0.12, 0.14, 0.19),
  });

  let y = 758;
  for (const line of lines) {
    page.drawText(line, {
      x: 48,
      y,
      size: 11,
      font,
      color: rgb(0.22, 0.25, 0.29),
      maxWidth: 500,
    });
    y -= 18;
    if (y < 80) break;
  }

  return Buffer.from(await pdf.save());
}

function formatPdfMoney(value: unknown) {
  const amount = Number(value ?? 0);
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number.isFinite(amount) ? amount : 0)} FCFA`;
}

function formatPdfDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatStatusLabel(status: string | null | undefined) {
  const normalized = String(status ?? "pending").toLowerCase();
  return {
    pending: "En attente",
    paid: "Payee",
    completed: "Payee",
    failed: "Echec",
    preparing: "En preparation",
    processing: "En traitement",
    shipped: "Expediee",
    delivered: "Livree",
    canceled: "Annulee",
    ready_for_pickup: "Pret pour retrait",
    out_for_delivery: "En cours de livraison",
  }[normalized] ?? normalized.replace(/_/g, " ");
}

function wrapPdfText(text: string, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, size: number, maxWidth: number) {
  const source = text.trim() || "-";
  const paragraphs = source.split(/\r?\n/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }

    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        current = next;
        continue;
      }

      if (current) {
        lines.push(current);
      }

      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        current = word;
        continue;
      }

      let chunk = "";
      for (const char of word) {
        const candidate = `${chunk}${char}`;
        if (chunk && font.widthOfTextAtSize(candidate, size) > maxWidth) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk = candidate;
        }
      }
      current = chunk;
    }

    if (current) lines.push(current);
  }

  return lines.length ? lines : ["-"];
}

async function createDeliveryNotePdf(order: OrderWithRelations) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  const meta = ((order.metadata as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  const shipping = order.shippingAddress;
  const payment = order.payments[0] ?? null;
  const deliveryStatus = typeof meta.delivery_status === "string" ? meta.delivery_status : null;
  const orderNumber = typeof meta.order_number === "string" && meta.order_number.trim() ? meta.order_number.trim() : `IF${order.id}`;
  const trackingNumber = typeof meta.tracking_number === "string" && meta.tracking_number.trim() ? meta.tracking_number.trim() : "-";
  const estimatedDelivery = typeof meta.estimated_delivery === "string" ? meta.estimated_delivery : null;
  const brand = "FuturInd";
  const pages: Array<ReturnType<PDFDocument["addPage"]>> = [];
  let page = pdf.addPage([pageWidth, pageHeight]);
  pages.push(page);
  let y = pageHeight - margin;

  const addPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]);
    pages.push(page);
    y = pageHeight - margin;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) addPage();
  };

  const drawTextLine = (text: string, options?: { x?: number; size?: number; font?: typeof regular; color?: ReturnType<typeof rgb> }) => {
    const size = options?.size ?? 11;
    page.drawText(text, {
      x: options?.x ?? margin,
      y,
      size,
      font: options?.font ?? regular,
      color: options?.color ?? rgb(0.17, 0.2, 0.24),
    });
  };

  const drawParagraph = (text: string, x: number, width: number, options?: { size?: number; font?: typeof regular; color?: ReturnType<typeof rgb>; lineHeight?: number }) => {
    const size = options?.size ?? 10.5;
    const font = options?.font ?? regular;
    const color = options?.color ?? rgb(0.17, 0.2, 0.24);
    const lineHeight = options?.lineHeight ?? size + 3;
    const lines = wrapPdfText(text, font, size, width);
    ensureSpace(lines.length * lineHeight + 2);
    for (const line of lines) {
      page.drawText(line, { x, y, size, font, color });
      y -= lineHeight;
    }
  };

  const drawLabelValue = (label: string, value: string, x: number, width: number) => {
    const labelSize = 9;
    const valueSize = 11;
    const labelLineHeight = 12;
    const valueLineHeight = 14;
    const valueLines = wrapPdfText(value, regular, valueSize, width);
    const blockHeight = labelLineHeight + valueLines.length * valueLineHeight + 6;
    ensureSpace(blockHeight);
    page.drawText(label, {
      x,
      y,
      size: labelSize,
      font: bold,
      color: rgb(0.47, 0.52, 0.6),
    });
    y -= labelLineHeight;
    for (const line of valueLines) {
      page.drawText(line, {
        x,
        y,
        size: valueSize,
        font: regular,
        color: rgb(0.15, 0.18, 0.22),
      });
      y -= valueLineHeight;
    }
    y -= 6;
  };

  const drawSectionTitle = (title: string) => {
    ensureSpace(28);
    page.drawText(title, {
      x: margin,
      y,
      size: 12,
      font: bold,
      color: rgb(0.1, 0.16, 0.27),
    });
    y -= 8;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: rgb(0.84, 0.87, 0.92),
    });
    y -= 18;
  };

  page.drawRectangle({
    x: margin,
    y: y - 74,
    width: contentWidth,
    height: 74,
    color: rgb(0.95, 0.97, 1),
    borderColor: rgb(0.83, 0.88, 0.96),
    borderWidth: 1,
  });
  drawTextLine(brand, { x: margin + 16, size: 18, font: bold, color: rgb(0.08, 0.18, 0.37) });
  y -= 24;
  drawTextLine("Bon de livraison", { x: margin + 16, size: 22, font: bold, color: rgb(0.1, 0.13, 0.18) });
  y -= 20;
  drawTextLine(`Commande ${orderNumber}`, { x: margin + 16, size: 11, font: regular, color: rgb(0.35, 0.39, 0.45) });
  page.drawText(`Genere le ${formatPdfDate(new Date())}`, {
    x: pageWidth - margin - 155,
    y: pageHeight - margin - 20,
    size: 10,
    font: regular,
    color: rgb(0.35, 0.39, 0.45),
  });
  y -= 42;

  drawSectionTitle("Informations commande");
  const columnGap = 24;
  const columnWidth = (contentWidth - columnGap) / 2;
  const leftStartY = y;
  drawLabelValue("Reference", `#${order.id}`, margin, columnWidth);
  drawLabelValue("Statut commande", formatStatusLabel(order.status), margin, columnWidth);
  drawLabelValue("Statut livraison", formatStatusLabel(deliveryStatus), margin, columnWidth);
  const leftEndY = y;

  y = leftStartY;
  const rightX = margin + columnWidth + columnGap;
  drawLabelValue("Paiement", formatStatusLabel(payment?.status), rightX, columnWidth);
  drawLabelValue("Montant total", formatPdfMoney(order.total), rightX, columnWidth);
  drawLabelValue("Date commande", formatPdfDate(order.created_at), rightX, columnWidth);
  drawLabelValue("Suivi", trackingNumber, rightX, columnWidth);
  const rightEndY = y;
  y = Math.min(leftEndY, rightEndY) - 6;

  drawSectionTitle("Destinataire");
  const shippingLines = [
    shipping?.full_name ?? order.user?.name ?? "-",
    shipping?.line1 ?? "-",
    shipping?.line2 ?? null,
    [shipping?.postal_code ?? "", shipping?.city ?? ""].filter(Boolean).join(" ") || null,
    shipping?.country ?? null,
    shipping?.phone ? `Tel: ${shipping.phone}` : null,
    order.user?.email ? `Email: ${order.user.email}` : null,
  ].filter((line): line is string => Boolean(line && line.trim()));
  drawParagraph(shippingLines.join("\n"), margin, contentWidth, { size: 11, lineHeight: 15 });
  y -= 4;

  drawSectionTitle("Articles");
  const colName = margin;
  const colQty = margin + 288;
  const colUnit = margin + 338;
  const colTotal = margin + 452;
  const headerHeight = 24;

  const drawTableHeader = () => {
    ensureSpace(headerHeight + 8);
    page.drawRectangle({
      x: margin,
      y: y - headerHeight + 6,
      width: contentWidth,
      height: headerHeight,
      color: rgb(0.94, 0.95, 0.97),
    });
    page.drawText("Produit", { x: colName + 8, y: y - 10, size: 10, font: bold, color: rgb(0.28, 0.32, 0.38) });
    page.drawText("Qté", { x: colQty, y: y - 10, size: 10, font: bold, color: rgb(0.28, 0.32, 0.38) });
    page.drawText("Prix de base", { x: colUnit, y: y - 10, size: 8.5, font: bold, color: rgb(0.28, 0.32, 0.38) });
    page.drawText("Total", { x: colTotal, y: y - 10, size: 10, font: bold, color: rgb(0.28, 0.32, 0.38) });
    y -= 28;
  };

  drawTableHeader();
  for (const item of order.items) {
    const nameLines = wrapPdfText(item.name, regular, 10.5, 260);
    const rowHeight = Math.max(22, nameLines.length * 13 + 8);
    ensureSpace(rowHeight + 10);
    if (y < margin + rowHeight + 20) {
      addPage();
      drawSectionTitle("Articles");
      drawTableHeader();
    }

    page.drawRectangle({
      x: margin,
      y: y - rowHeight + 4,
      width: contentWidth,
      height: rowHeight,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.91, 0.93, 0.95),
      borderWidth: 1,
    });

    let nameY = y - 11;
    for (const line of nameLines) {
      page.drawText(line, {
        x: colName + 8,
        y: nameY,
        size: 10.5,
        font: regular,
        color: rgb(0.14, 0.17, 0.22),
      });
      nameY -= 13;
    }

    page.drawText(String(item.qty), {
      x: colQty,
      y: y - 11,
      size: 10.5,
      font: regular,
      color: rgb(0.14, 0.17, 0.22),
    });
    page.drawText(formatPdfMoney(item.price), {
      x: colUnit,
      y: y - 11,
      size: 10.5,
      font: regular,
      color: rgb(0.14, 0.17, 0.22),
    });
    page.drawText(formatPdfMoney(item.total), {
      x: colTotal,
      y: y - 11,
      size: 10.5,
      font: bold,
      color: rgb(0.1, 0.13, 0.18),
    });
    y -= rowHeight + 8;
  }

  ensureSpace(140);
  page.drawRectangle({
    x: pageWidth - margin - 200,
    y: y - 96,
    width: 200,
    height: 96,
    color: rgb(0.96, 0.98, 0.94),
    borderColor: rgb(0.84, 0.9, 0.79),
    borderWidth: 1,
  });
  page.drawText("Prix de base / recapitulatif", {
    x: pageWidth - margin - 184,
    y: y - 16,
    size: 10,
    font: regular,
    color: rgb(0.35, 0.42, 0.29),
  });
  page.drawText(`Sous-total: ${formatPdfMoney(order.subtotal)}`, {
    x: pageWidth - margin - 184,
    y: y - 32,
    size: 9.5,
    font: regular,
    color: rgb(0.22, 0.28, 0.2),
  });
  page.drawText(`Livraison: ${formatPdfMoney(order.shipping_total)}`, {
    x: pageWidth - margin - 184,
    y: y - 46,
    size: 9.5,
    font: regular,
    color: rgb(0.22, 0.28, 0.2),
  });
  page.drawText(`Remise: ${formatPdfMoney(order.discount_total)}`, {
    x: pageWidth - margin - 184,
    y: y - 60,
    size: 9.5,
    font: regular,
    color: rgb(0.22, 0.28, 0.2),
  });
  page.drawText("Total commande", {
    x: pageWidth - margin - 184,
    y: y - 78,
    size: 10,
    font: regular,
    color: rgb(0.35, 0.42, 0.29),
  });
  page.drawText(formatPdfMoney(order.total), {
    x: pageWidth - margin - 184,
    y: y - 92,
    size: 15,
    font: bold,
    color: rgb(0.16, 0.31, 0.13),
  });
  y -= 116;

  drawSectionTitle("Suivi logistique");
  drawLabelValue("Mode de livraison", order.tag_delivery === "PRET_A_ETRE_LIVRE" ? "Pret a etre livre" : "Sur commande", margin, columnWidth);
  drawLabelValue("Livraison estimee", estimatedDelivery ? formatPdfDate(estimatedDelivery) : "-", rightX, columnWidth);
  y -= 4;
  drawParagraph(
    "Document genere depuis l'administration. A joindre au colis ou a transmettre au transporteur pour faciliter la remise.",
    margin,
    contentWidth,
    { size: 9.5, color: rgb(0.42, 0.46, 0.52), lineHeight: 13 },
  );

  pages.forEach((entry, index) => {
    entry.drawLine({
      start: { x: margin, y: 28 },
      end: { x: pageWidth - margin, y: 28 },
      thickness: 1,
      color: rgb(0.9, 0.92, 0.95),
    });
    entry.drawText(`Page ${index + 1}/${pages.length}`, {
      x: pageWidth - margin - 52,
      y: 14,
      size: 9,
      font: regular,
      color: rgb(0.46, 0.5, 0.57),
    });
  });

  return Buffer.from(await pdf.save());
}

async function resolveCategoryIds(values: string[] | undefined) {
  if (!values?.length) return [];
  const categories = await prisma.category.findMany({
    where: {
      OR: [
        { slug: { in: values } },
        { name: { in: values } },
      ],
    },
    select: { id: true },
  });
  return categories.map((category) => category.id);
}

async function handleAuthRoutes(request: NextRequest, segments: string[]) {
  if (request.method === "POST" && segments[1] === "register") {
    const payload = await parseJson(request, registerSchema);
    const existing = await prisma.user.findUnique({ where: { email: payload.email } });
    if (existing) return fail("Email already exists", 422);

    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        role: "customer",
        password: await hash(payload.password, 10),
      },
      select: { id: true, name: true, email: true, role: true, email_verified_at: true, created_at: true, updated_at: true },
    });

    const token = await createAuthToken(user);
    const response = ok({ token, user }, 201);
    applyAuthCookies(response, token, user);
    return response;
  }

  if (request.method === "POST" && segments[1] === "login") {
    const payload = await parseJson(request, loginSchema);
    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    if (!user || !(await compare(payload.password, user.password))) {
      return fail("Invalid credentials", 422);
    }

    const publicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      email_verified_at: user.email_verified_at,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
    const token = await createAuthToken(publicUser);
    const response = ok({ token, user: publicUser });
    applyAuthCookies(response, token, publicUser);
    return response;
  }

  if (request.method === "POST" && segments[1] === "logout") {
    const auth = await requireAuth(request);
    if (auth.response) return auth.response;
    const response = ok({ message: "Logged out" });
    clearAuthCookies(response);
    return response;
  }

  if (request.method === "GET" && segments[1] === "me") {
    const auth = await requireAuth(request);
    if (auth.response || !auth.user) return auth.response;
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { id: true, name: true, email: true, role: true, email_verified_at: true, created_at: true, updated_at: true },
    });
    return ok(user);
  }

  return fail("Not found", 404);
}

async function handleProducts(request: NextRequest, segments: string[]) {
  if (request.method === "GET" && segments.length === 1) {
    const { page, perPage, skip } = paginationFrom(request, { page: 1, perPage: 24, max: 100 });
    const search = request.nextUrl.searchParams.get("search")?.trim();
    const category = request.nextUrl.searchParams.get("category")?.trim();
    const minPrice = request.nextUrl.searchParams.get("minPrice");
    const maxPrice = request.nextUrl.searchParams.get("maxPrice");
    const tag = request.nextUrl.searchParams.get("tag")?.trim();
    const sort = request.nextUrl.searchParams.get("sort") ?? "newest";
    const promo = request.nextUrl.searchParams.get("promo");

    const where: Prisma.ProductWhereInput = { status: "active" };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }
    if (category) {
      where.category_products = { some: { category: { slug: category } } };
    }
    if (minPrice || maxPrice) {
      where.price = {
        ...(minPrice ? { gte: new Prisma.Decimal(Number(minPrice)) } : {}),
        ...(maxPrice ? { lte: new Prisma.Decimal(Number(maxPrice)) } : {}),
      };
    }
    if (tag) where.tag_delivery = tag;
    if (promo === "1" || promo === "true") where.is_promo = true;

    let orderBy: Prisma.ProductOrderByWithRelationInput[] = [{ created_at: "desc" }];
    if (sort === "price_asc") orderBy = [{ price: "asc" }];
    if (sort === "price_desc") orderBy = [{ price: "desc" }];
    if (sort === "featured") orderBy = [{ featured: "desc" }, { created_at: "desc" }];
    if (sort === "promo") orderBy = [{ is_promo: "desc" }, { created_at: "desc" }];

    const [total, rows] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: perPage,
        include: {
          images: { orderBy: { sort_order: "asc" } },
          category_products: { include: { category: true } },
        },
      }),
    ]);

    return ok({
      data: rows.map((row) => mapProduct(row as ProductWithRelations)),
      current_page: page,
      last_page: Math.max(1, Math.ceil(total / perPage)),
      per_page: perPage,
      total,
    });
  }

  if (request.method === "GET" && segments.length === 2) {
    const product = await prisma.product.findFirst({
      where: { slug: segments[1], status: "active" },
      include: {
        images: { orderBy: { sort_order: "asc" } },
        category_products: { include: { category: true } },
      },
    });
    if (!product) return fail("Not found", 404);
    return ok(mapProduct(product as ProductWithRelations));
  }

  if (segments[2] === "reviews" && request.method === "GET") {
    const product = await prisma.product.findFirst({ where: { slug: segments[1], status: "active" }, select: { id: true } });
    if (!product) return fail("Not found", 404);
    const limit = Math.max(1, Math.min(50, Number(request.nextUrl.searchParams.get("limit") ?? 5) || 5));
    const [reviews, total, aggregate, grouped] = await Promise.all([
      prisma.productReview.findMany({ where: { product_id: product.id }, orderBy: { created_at: "desc" }, take: limit }),
      prisma.productReview.count({ where: { product_id: product.id } }),
      prisma.productReview.aggregate({ where: { product_id: product.id }, _avg: { rating: true } }),
      prisma.productReview.groupBy({ by: ["rating"], where: { product_id: product.id }, _count: { _all: true } }),
    ]);

    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const entry of grouped) breakdown[entry.rating] = entry._count._all;

    return ok({
      data: reviews,
      meta: {
        total,
        average: Number((aggregate._avg.rating ?? 0).toFixed?.(1) ?? aggregate._avg.rating ?? 0),
        breakdown,
        limit,
      },
    });
  }

  if (segments[2] === "reviews" && request.method === "POST") {
    const product = await prisma.product.findFirst({ where: { slug: segments[1], status: "active" }, select: { id: true } });
    if (!product) return fail("Not found", 404);
    const payload = await parseJson(request, reviewSchema);
    const review = await prisma.productReview.create({ data: { product_id: product.id, ...payload } });
    return ok(review, 201);
  }

  return fail("Not found", 404);
}

async function handleCategories(request: NextRequest, segments: string[]) {
  if (request.method === "GET" && segments.length === 1) {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, icon: true, description: true, image_url: true },
    });
    return ok(categories);
  }
  return fail("Not found", 404);
}

async function handleAddresses(request: NextRequest, user: SessionUser, segments: string[]) {
  if (request.method === "GET" && segments.length === 1) {
    const addresses = await prisma.address.findMany({
      where: { user_id: user.id },
      orderBy: [{ is_default: "desc" }, { created_at: "desc" }],
    });
    return ok(addresses);
  }

  if (request.method === "POST" && segments.length === 1) {
    const payload = await parseJson(request, addressSchema);
    const hasDefault = await prisma.address.count({ where: { user_id: user.id, is_default: true } });
    const address = await prisma.address.create({
      data: {
        user_id: user.id,
        type: "shipping",
        full_name: user.name,
        line1: payload.line1,
        city: payload.city,
        postal_code: payload.postal_code,
        country: payload.country.toUpperCase(),
        is_default: hasDefault === 0,
      },
    });
    return ok(address, 201);
  }

  if (segments.length === 2) {
    const addressId = Number(segments[1]);
    if (!Number.isInteger(addressId)) return fail("Not found", 404);
    const address = await prisma.address.findFirst({ where: { id: addressId, user_id: user.id } });
    if (!address) return fail("Not found", 404);

    if (request.method === "PATCH") {
      const payload = await parseJson(request, addressSchema);
      const updated = await prisma.address.update({
        where: { id: addressId },
        data: {
          line1: payload.line1,
          city: payload.city,
          postal_code: payload.postal_code,
          country: payload.country.toUpperCase(),
        },
      });
      return ok(updated);
    }

    if (request.method === "DELETE") {
      const wasDefault = address.is_default;
      await prisma.address.delete({ where: { id: addressId } });
      if (wasDefault) {
        const latest = await prisma.address.findFirst({ where: { user_id: user.id }, orderBy: { created_at: "desc" } });
        if (latest) {
          await prisma.address.update({ where: { id: latest.id }, data: { is_default: true } });
        }
      }
      return ok({ ok: true });
    }
  }

  return fail("Not found", 404);
}

async function handleCart(request: NextRequest, user: SessionUser) {
  if (request.method === "GET") {
    return ok(await cartPayload(user.id));
  }

  const payload = await parseJson(
    request,
    z.object({
      product_id: z.coerce.number().int().positive(),
      qty: z.coerce.number().int().min(0).optional(),
    }),
  );

  const product = await prisma.product.findUnique({ where: { id: payload.product_id }, select: { id: true } });
  if (!product) return fail("Product not found", 404);

  const cart = await getOrCreateCart(user.id);
  const existing = await prisma.cartItem.findFirst({ where: { cart_id: cart.id, product_id: payload.product_id } });

  if (request.method === "POST") {
    const qty = payload.qty && payload.qty > 0 ? payload.qty : 1;
    if (existing) {
      await prisma.cartItem.update({ where: { id: existing.id }, data: { qty: existing.qty + qty } });
    } else {
      await prisma.cartItem.create({ data: { cart_id: cart.id, product_id: payload.product_id, qty } });
    }
    return ok(await cartPayload(user.id));
  }

  if (request.method === "PATCH") {
    if (!existing) return fail("Item not found", 404);
    if ((payload.qty ?? 0) === 0) {
      await prisma.cartItem.delete({ where: { id: existing.id } });
    } else {
      await prisma.cartItem.update({ where: { id: existing.id }, data: { qty: payload.qty ?? existing.qty } });
    }
    return ok(await cartPayload(user.id));
  }

  if (request.method === "DELETE") {
    if (existing) {
      await prisma.cartItem.delete({ where: { id: existing.id } });
    }
    return ok(await cartPayload(user.id));
  }

  return fail("Not found", 404);
}

async function handleCheckout(request: NextRequest, user: SessionUser) {
  const payload = await parseJson(request, checkoutSchema);
  const cart = await prisma.cart.findUnique({
    where: { user_id: user.id },
    include: { items: { include: { product: true } } },
  });
  if (!cart || cart.items.length === 0) return fail("Cart is empty", 422);

  let shippingAddressId: number | null = null;
  let createdAddressId: number | null = null;
  if (payload.shipping_address_id) {
    const address = await prisma.address.findFirst({ where: { id: payload.shipping_address_id, user_id: user.id } });
    if (!address) return fail("Address not found", 404);
    shippingAddressId = address.id;
  } else if (payload.shipping_address) {
    const address = await prisma.address.create({
      data: {
        user_id: user.id,
        type: "shipping",
        full_name: payload.shipping_address.full_name,
        line1: payload.shipping_address.line1,
        line2: payload.shipping_address.line2 ?? null,
        city: payload.shipping_address.city,
        postal_code: payload.shipping_address.postal_code,
        country: (payload.shipping_address.country ?? "BJ").toUpperCase(),
        phone: payload.shipping_address.phone ?? null,
        is_default: false,
      },
    });
    shippingAddressId = address.id;
    createdAddressId = address.id;
  } else {
    const fallback = await prisma.address.findFirst({
      where: { user_id: user.id },
      orderBy: [{ is_default: "desc" }, { created_at: "desc" }],
    });
    if (!fallback) return fail("Shipping address is required", 422);
    shippingAddressId = fallback.id;
  }

  const subtotal = cart.items.reduce((sum, item) => sum + Number(item.product.price) * item.qty, 0);
  const tagDelivery = cart.items.some((item) => item.product.tag_delivery === "PRET_A_ETRE_LIVRE")
    ? "PRET_A_ETRE_LIVRE"
    : "SUR_COMMANDE";

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        user_id: user.id,
        status: "pending",
        tag_delivery: tagDelivery,
        shipping_address_id: shippingAddressId,
        subtotal,
        discount_total: 0,
        shipping_total: 0,
        total: subtotal,
        metadata: orderMetadata(tagDelivery),
      },
    });

    for (const item of cart.items) {
      await tx.orderItem.create({
        data: {
          order_id: order.id,
          product_id: item.product_id,
          name: item.product.name,
          sku: item.product.sku,
          price: item.product.price,
          qty: item.qty,
          total: new Prisma.Decimal(Number(item.product.price) * item.qty),
        },
      });
    }

    const payment = await tx.payment.create({
      data: {
        order_id: order.id,
        provider: isFedaPayConfigured() ? "fedapay" : "mock",
        status: "pending",
        amount: subtotal,
        metadata: toJsonInput({}),
      },
    });

    return { orderId: order.id, paymentId: payment.id };
  });

  const paymentSession = await initializeHostedPayment({
    paymentId: result.paymentId,
    orderId: result.orderId,
    amount: subtotal,
    description: `Paiement commande #${result.orderId}`,
    customerName: user.name,
    customerEmail: user.email,
    customerPhone: payload.customer_phone ?? payload.shipping_address?.phone ?? null,
    customerCountry: payload.customer_country ?? payload.shipping_address?.country ?? null,
    extraMetadata: { type: "order" },
  });

  await prisma.payment.update({
    where: { id: result.paymentId },
    data: {
      provider: paymentSession.provider,
      metadata: toJsonInput(paymentSession.metadata),
    },
  });

  const order = await prisma.order.findUnique({
    where: { id: result.orderId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: { include: { product: { include: { images: true, category_products: { include: { category: true } } } } } },
      payments: true,
      shippingAddress: true,
    },
  });

  if (!order) {
    if (createdAddressId) await prisma.address.deleteMany({ where: { id: createdAddressId } });
    return fail("Unable to create order", 500);
  }

  return ok({ order: mapOrder(order as OrderWithRelations), payment_url: paymentSession.paymentUrl }, 201);
}

async function handleOrders(request: NextRequest, user: SessionUser, segments: string[]) {
  if (request.method === "GET" && segments.length === 1) {
    const { page, perPage, skip } = paginationFrom(request);
    const [total, orders] = await Promise.all([
      prisma.order.count({ where: { user_id: user.id } }),
      prisma.order.findMany({
        where: { user_id: user.id },
        orderBy: { created_at: "desc" },
        skip,
        take: perPage,
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: { include: { product: { include: { images: true, category_products: { include: { category: true } } } } } },
          payments: true,
          shippingAddress: true,
        },
      }),
    ]);
    return ok({
      data: orders.map((order) => mapOrder(order as OrderWithRelations)),
      current_page: page,
      last_page: Math.max(1, Math.ceil(total / perPage)),
      total,
    });
  }

  const orderId = Number(segments[1]);
  if (!Number.isInteger(orderId)) return fail("Not found", 404);
  const order = await prisma.order.findFirst({
    where: { id: orderId, user_id: user.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: { include: { product: { include: { images: true, category_products: { include: { category: true } } } } } },
      payments: true,
      shippingAddress: true,
    },
  });
  if (!order) return fail("Forbidden", 403);

  if (request.method === "GET" && segments.length === 2) {
    return ok(mapOrder(order as OrderWithRelations));
  }

  if (request.method === "POST" && segments[2] === "pay") {
    let payment = order.payments.find((entry) => entry.status === "pending") ?? null;
    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          order_id: order.id,
          provider: isFedaPayConfigured() ? "fedapay" : "mock",
          status: "pending",
          amount: order.total,
          metadata: toJsonInput({}),
        },
      });
    }

    const paymentSession = await initializeHostedPayment({
      paymentId: payment.id,
      orderId: order.id,
      amount: Number(order.total),
      description: `Paiement commande #${order.id}`,
      customerName: order.user.name,
      customerEmail: order.user.email,
      customerPhone: order.shippingAddress?.phone ?? null,
      customerCountry: order.shippingAddress?.country ?? null,
      extraMetadata: { type: "order" },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        provider: paymentSession.provider,
        metadata: toJsonInput({
          ...(((payment.metadata as Record<string, unknown> | null) ?? {}) as Record<string, unknown>),
          ...paymentSession.metadata,
        }),
      },
    });
    return ok({ payment_url: paymentSession.paymentUrl, payment_id: payment.id, order_id: order.id }, 201);
  }

  return fail("Not found", 404);
}

async function handleImportRequests(request: NextRequest, user: SessionUser, segments: string[]) {
  if (request.method === "GET" && segments.length === 1) {
    const { page, perPage, skip } = paginationFrom(request);
    const [total, items] = await Promise.all([
      prisma.importRequest.count({ where: { user_id: user.id } }),
      prisma.importRequest.findMany({
        where: { user_id: user.id },
        orderBy: { created_at: "desc" },
        skip,
        take: perPage,
        include: { payment: true },
      }),
    ]);
    return ok({
      data: items,
      current_page: page,
      last_page: Math.max(1, Math.ceil(total / perPage)),
      total,
    });
  }

  if (request.method === "POST" && segments.length === 1) {
    if (!isFormDataRequest(request)) return fail("Expected multipart form-data", 415);
    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const shipping_mode = String(formData.get("shipping_mode") ?? "air").trim();
    const desired_delay_days = String(formData.get("desired_delay_days") ?? "").trim();
    const photo = formData.get("photo");

    if (!name) return fail("Name is required", 422);
    if (!["air", "sea"].includes(shipping_mode)) return fail("Invalid shipping mode", 422);

    let photo_url: string | null = null;
    if (photo instanceof File && photo.size > 0) {
      photo_url = await uploadFile(photo, "imports");
    }

    const item = await prisma.importRequest.create({
      data: {
        user_id: user.id,
        status: "pending",
        shipping_mode,
        desired_delay_days: desired_delay_days ? Number(desired_delay_days) : null,
        name,
        description: description || null,
        photo_url,
        tracking_number: `${randomCode(8)}-${randomCode(6)}`,
      },
      include: { payment: true },
    });

    return ok(item, 201);
  }

  const importRequestId = Number(segments[1]);
  if (!Number.isInteger(importRequestId)) return fail("Not found", 404);
  const item = await prisma.importRequest.findFirst({ where: { id: importRequestId, user_id: user.id }, include: { payment: true } });
  if (!item) return fail("Forbidden", 403);

  if (request.method === "GET" && segments.length === 2) {
    return ok(item);
  }

  if (request.method === "POST" && segments[2] === "pay") {
    if (!["priced", "awaiting_payment"].includes(item.status)) {
      return fail("This request is not ready for payment.", 409);
    }
    if (item.admin_price == null || Number(item.admin_price) < 1) {
      return fail("Price is not set yet.", 409);
    }

    const order = await prisma.order.create({
      data: {
        user_id: user.id,
        status: "pending",
        tag_delivery: "SUR_COMMANDE",
        subtotal: item.admin_price,
        discount_total: 0,
        shipping_total: 0,
        total: item.admin_price,
        metadata: orderMetadata("SUR_COMMANDE", {
          type: "import_request",
          import_request_id: item.id,
          tracking_number: item.tracking_number ?? `${randomCode(8)}-${randomCode(6)}`,
        }),
      },
    });
    const payment = await prisma.payment.create({
      data: {
        order_id: order.id,
        provider: isFedaPayConfigured() ? "fedapay" : "mock",
        status: "pending",
        amount: item.admin_price,
        metadata: toJsonInput({ type: "import_request", import_request_id: item.id }),
      },
    });
    const paymentSession = await initializeHostedPayment({
      paymentId: payment.id,
      orderId: order.id,
      amount: Number(item.admin_price),
      description: `Paiement service d'import #${item.id}`,
      customerName: user.name,
      customerEmail: user.email,
      extraMetadata: { type: "import_request", import_request_id: item.id },
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        provider: paymentSession.provider,
        metadata: toJsonInput({
          type: "import_request",
          import_request_id: item.id,
          ...paymentSession.metadata,
        }),
      },
    });
    await prisma.importRequest.update({
      where: { id: item.id },
      data: {
        payment_id: payment.id,
        status: "awaiting_payment",
        tracking_number: item.tracking_number ?? String((order.metadata as Record<string, unknown>)?.tracking_number ?? `${randomCode(8)}-${randomCode(6)}`),
      },
    });

    return ok({ payment_url: paymentSession.paymentUrl, payment_id: payment.id, import_request_id: item.id }, 201);
  }

  return fail("Not found", 404);
}

async function handleAdmin(request: NextRequest, user: SessionUser, segments: string[]) {
  const resource = segments[1];

  if (resource === "categories") {
    if (request.method === "GET" && segments.length === 2) {
      const data = await prisma.category.findMany({ orderBy: { name: "asc" } });
      return ok({ data });
    }

    if (request.method === "POST" && segments.length === 2) {
      if (!isFormDataRequest(request)) return fail("Expected multipart form-data", 415);
      const formData = await request.formData();
      const payload = categoryUpsertSchema.parse({
        name: formData.get("name"),
        description: formData.get("description"),
        icon: formData.get("icon"),
      });
      const image = formData.get("image");
      const image_url = image instanceof File && image.size > 0 ? await uploadFile(image, "categories") : null;
      const category = await prisma.category.create({
        data: {
          name: payload.name,
          slug: await uniqueSlug(payload.name, "category"),
          description: payload.description ?? null,
          icon: payload.icon ?? null,
          image_url,
        },
      });
      return ok(category, 201);
    }

    const categoryId = Number(segments[2]);
    if (!Number.isInteger(categoryId)) return fail("Not found", 404);

    if (request.method === "GET") {
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) return fail("Not found", 404);
      return ok(category);
    }

    if (request.method === "PATCH") {
      if (!isFormDataRequest(request)) return fail("Expected multipart form-data", 415);
      const current = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!current) return fail("Not found", 404);
      const formData = await request.formData();
      const payload = categoryUpsertSchema.parse({
        name: formData.get("name"),
        description: formData.get("description"),
        icon: formData.get("icon"),
      });
      const image = formData.get("image");
      const image_url = image instanceof File && image.size > 0 ? await uploadFile(image, "categories") : current.image_url;
      const category = await prisma.category.update({
        where: { id: categoryId },
        data: {
          name: payload.name,
          slug: current.name === payload.name ? current.slug : await uniqueSlug(payload.name, "category"),
          description: payload.description ?? null,
          icon: payload.icon ?? null,
          image_url,
        },
      });
      return ok(category);
    }

    if (request.method === "DELETE") {
      await prisma.category.delete({ where: { id: categoryId } }).catch(() => null);
      return ok({ ok: true });
    }
  }

  if (resource === "products") {
    if (request.method === "GET" && segments.length === 2) {
      const { page, perPage, skip } = paginationFrom(request, { page: 1, perPage: 50, max: 100 });
      const search = request.nextUrl.searchParams.get("search")?.trim();
      const where: Prisma.ProductWhereInput = search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
            ],
          }
        : {};
      const [total, rows] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          orderBy: { created_at: "desc" },
          skip,
          take: perPage,
          include: {
            images: { orderBy: { sort_order: "asc" } },
            category_products: { include: { category: true } },
          },
        }),
      ]);
      return ok({ data: rows.map((row) => mapProduct(row as ProductWithRelations)), current_page: page, last_page: Math.max(1, Math.ceil(total / perPage)), total });
    }

    if (request.method === "POST" && segments.length === 2) {
      const payload = await parseJson(request, productUpsertSchema);
      const categoryIds = await resolveCategoryIds(payload.categories);
      const product = await prisma.product.create({
        data: {
          name: payload.name,
          slug: await uniqueSlug(payload.slug ?? payload.name, "product"),
          description: payload.description ?? null,
          price: payload.price,
          compare_at_price: payload.compare_at_price ?? null,
          stock: payload.stock ?? 999,
          status: payload.status ?? "active",
          tag_delivery: payload.tag_delivery ?? "SUR_COMMANDE",
          delivery_delay_days: payload.delivery_delay_days ?? null,
          sku: payload.sku ?? null,
          metadata: toJsonInput(payload.metadata ?? null),
          featured: payload.featured ?? false,
          is_promo: payload.is_promo ?? false,
          category_products: categoryIds.length ? { createMany: { data: categoryIds.map((category_id) => ({ category_id })) } } : undefined,
        },
        include: {
          images: { orderBy: { sort_order: "asc" } },
          category_products: { include: { category: true } },
        },
      });
      return ok(mapProduct(product as ProductWithRelations), 201);
    }

    const productId = Number(segments[2]);
    if (!Number.isInteger(productId)) return fail("Not found", 404);

    if (request.method === "GET" && segments.length === 3) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          images: { orderBy: { sort_order: "asc" } },
          category_products: { include: { category: true } },
        },
      });
      if (!product) return fail("Not found", 404);
      return ok(mapProduct(product as ProductWithRelations));
    }

    if (request.method === "PATCH" && segments.length === 3) {
      const current = await prisma.product.findUnique({ where: { id: productId } });
      if (!current) return fail("Not found", 404);
      const payload = await parseJson(request, productUpsertSchema.partial().extend({ name: z.string().trim().min(1).max(255).optional() }));
      const categoryIds = payload.categories ? await resolveCategoryIds(payload.categories) : null;
      const product = await prisma.$transaction(async (tx) => {
        if (categoryIds) {
          await tx.categoryProduct.deleteMany({ where: { product_id: productId } });
          if (categoryIds.length) {
            await tx.categoryProduct.createMany({ data: categoryIds.map((category_id) => ({ product_id: productId, category_id })) });
          }
        }

        return tx.product.update({
          where: { id: productId },
          data: {
            ...(payload.name ? { name: payload.name } : {}),
            ...(payload.slug ? { slug: await uniqueSlug(payload.slug, "product") } : {}),
            ...(payload.description !== undefined ? { description: payload.description ?? null } : {}),
            ...(payload.price !== undefined ? { price: payload.price } : {}),
            ...(payload.compare_at_price !== undefined ? { compare_at_price: payload.compare_at_price ?? null } : {}),
            ...(payload.stock !== undefined ? { stock: payload.stock } : {}),
            ...(payload.status ? { status: payload.status } : {}),
            ...(payload.tag_delivery ? { tag_delivery: payload.tag_delivery } : {}),
            ...(payload.delivery_delay_days !== undefined ? { delivery_delay_days: payload.delivery_delay_days ?? null } : {}),
            ...(payload.sku !== undefined ? { sku: payload.sku ?? null } : {}),
            ...(payload.metadata !== undefined ? { metadata: toJsonInput(payload.metadata ?? null) } : {}),
            ...(payload.featured !== undefined ? { featured: payload.featured } : {}),
            ...(payload.is_promo !== undefined ? { is_promo: payload.is_promo } : {}),
          },
          include: {
            images: { orderBy: { sort_order: "asc" } },
            category_products: { include: { category: true } },
          },
        });
      });
      return ok(mapProduct(product as ProductWithRelations));
    }

    if (request.method === "DELETE" && segments.length === 3) {
      await prisma.product.delete({ where: { id: productId } }).catch(() => null);
      return ok({ ok: true });
    }

    if (request.method === "POST" && segments[3] === "images") {
      if (!isFormDataRequest(request)) return fail("Expected multipart form-data", 415);
      const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, name: true } });
      if (!product) return fail("Not found", 404);
      const formData = await request.formData();
      const image = formData.get("image");
      if (!(image instanceof File) || image.size === 0) return fail("Image is required", 422);
      const url = await uploadFile(image, "products");
      const record = await prisma.productImage.create({
        data: {
          product_id: product.id,
          url,
          alt: String(formData.get("alt") ?? `${product.name} image`).trim() || `${product.name} image`,
          sort_order: Number(formData.get("sort_order") ?? 0) || 0,
        },
      });
      return ok(record, 201);
    }
  }

  if (resource === "product-images") {
    const imageId = Number(segments[2]);
    if (!Number.isInteger(imageId)) return fail("Not found", 404);

    if (request.method === "PATCH") {
      const payload = await parseJson(request, z.object({ alt: z.string().trim().max(255).optional().nullable(), sort_order: z.coerce.number().int().min(0).optional() }));
      const image = await prisma.productImage.update({
        where: { id: imageId },
        data: {
          ...(payload.alt !== undefined ? { alt: payload.alt ?? null } : {}),
          ...(payload.sort_order !== undefined ? { sort_order: payload.sort_order } : {}),
        },
      });
      return ok(image);
    }

    if (request.method === "DELETE") {
      await prisma.productImage.delete({ where: { id: imageId } }).catch(() => null);
      return ok({ ok: true });
    }
  }

  if (resource === "orders") {
    if (request.method === "GET" && segments.length === 2) {
      const rows = await prisma.order.findMany({
        orderBy: { created_at: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: { include: { product: { include: { images: true, category_products: { include: { category: true } } } } } },
          payments: true,
          shippingAddress: true,
        },
      });
      return ok({ data: rows.map((row) => mapOrder(row as OrderWithRelations)) });
    }

    const orderId = Number(segments[2]);
    if (!Number.isInteger(orderId)) return fail("Not found", 404);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: { include: { images: true, category_products: { include: { category: true } } } } } },
        payments: true,
        shippingAddress: true,
      },
    });
    if (!order) return fail("Not found", 404);

    if (request.method === "GET" && segments.length === 3) {
      return ok(mapOrder(order as OrderWithRelations));
    }

    if (request.method === "PATCH" && segments.length === 3) {
      const payload = await parseJson(
        request,
        z.object({
          status: z.string().trim().min(1).max(50).optional(),
          tag_delivery: z.string().trim().min(1).max(50).optional(),
          delivery_status: z.string().trim().min(1).max(50).optional(),
          payment_status: z.enum(["completed", "failed", "pending"]).optional(),
        }),
      );

      if (payload.payment_status && order.payments[0]) {
        await setPaymentStatus(order.payments[0].id, payload.payment_status);
      }

      const currentMetadata = ((order.metadata as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          ...(payload.status ? { status: payload.status } : {}),
          ...(payload.tag_delivery ? { tag_delivery: payload.tag_delivery } : {}),
          ...(payload.delivery_status
            ? {
                metadata: {
                  ...currentMetadata,
                  delivery_status: payload.delivery_status,
                  ...(payload.delivery_status === "delivered" ? { delivered_at: new Date().toISOString() } : {}),
                  ...(payload.delivery_status === "out_for_delivery" ? { shipped_at: new Date().toISOString() } : {}),
                },
              }
            : {}),
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: { include: { product: { include: { images: true, category_products: { include: { category: true } } } } } },
          payments: true,
          shippingAddress: true,
        },
      });
      return ok(mapOrder(updated as OrderWithRelations));
    }

    if (request.method === "GET" && segments[3] === "delivery-note") {
      const pdf = await createDeliveryNotePdf(order as OrderWithRelations);
      return new NextResponse(pdf, { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=bon-livraison-${order.id}.pdf` } });
    }
  }

  if (resource === "users") {
    if (request.method === "GET" && segments.length === 2) {
      const users = await prisma.user.findMany({
        orderBy: { created_at: "desc" },
        include: { orders: { select: { total: true } }, addresses: { select: { country: true, city: true } } },
      });
      return ok({
        data: users.map((entry) => ({
          id: entry.id,
          name: entry.name,
          email: entry.email,
          location: entry.addresses[0] ? `${entry.addresses[0].city ?? ""} ${entry.addresses[0].country ?? ""}`.trim() : null,
          status: "active",
          spent_total: entry.orders.reduce((sum, order) => sum + Number(order.total), 0),
          orders_count: entry.orders.length,
          role: entry.role,
          created_at: entry.created_at,
        })),
      });
    }

    if (request.method === "POST" && segments.length === 2) {
      const payload = await parseJson(request, userCreateSchema);
      const userRecord = await prisma.user.create({
        data: {
          name: payload.name,
          email: payload.email,
          role: payload.role,
          password: await hash(payload.password, 10),
        },
      });
      return ok(userRecord, 201);
    }

    const userId = Number(segments[2]);
    if (!Number.isInteger(userId)) return fail("Not found", 404);

    if (request.method === "GET") {
      const userRecord = await prisma.user.findUnique({
        where: { id: userId },
        include: { orders: { select: { total: true } } },
      });
      if (!userRecord) return fail("Not found", 404);
      return ok({
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.role,
        status: "active",
        spent_total: userRecord.orders.reduce((sum, order) => sum + Number(order.total), 0),
        orders_count: userRecord.orders.length,
        created_at: userRecord.created_at,
      });
    }

    if (request.method === "DELETE") {
      await prisma.user.delete({ where: { id: userId } }).catch(() => null);
      return ok({ ok: true });
    }
  }

  if (resource === "withdrawal-requests") {
    if (request.method === "GET" && segments.length === 2) {
      const data = await prisma.adminWithdrawalRequest.findMany({
        orderBy: { created_at: "desc" },
        include: { user: { select: { name: true, email: true } } },
      });
      return ok({ data });
    }

    if (request.method === "POST" && segments.length === 2) {
      const payload = await parseJson(request, withdrawalSchema);
      const record = await prisma.adminWithdrawalRequest.create({
        data: {
          user_id: user.id,
          provider: payload.provider,
          phone_number: payload.phone_number,
          amount: payload.amount,
          note: payload.note ?? null,
          requested_at: new Date(),
          status: "pending",
        },
        include: { user: { select: { name: true, email: true } } },
      });
      return ok(record, 201);
    }

    const requestId = Number(segments[2]);
    if (!Number.isInteger(requestId)) return fail("Not found", 404);

    if (request.method === "GET" && segments.length === 3) {
      const record = await prisma.adminWithdrawalRequest.findUnique({
        where: { id: requestId },
        include: { user: { select: { name: true, email: true } } },
      });
      if (!record) return fail("Not found", 404);
      return ok(record);
    }

    if (request.method === "GET" && segments[3] === "proof-pdf") {
      const record = await prisma.adminWithdrawalRequest.findUnique({
        where: { id: requestId },
        include: { user: { select: { name: true, email: true } } },
      });
      if (!record) return fail("Not found", 404);
      const pdf = await createPdf(`Preuve de retrait #${record.id}`, [
        `Utilisateur: ${record.user?.name ?? "-"}`,
        `Email: ${record.user?.email ?? "-"}`,
        `Réseau: ${record.provider}`,
        `Numéro: ${record.phone_number}`,
        `Montant: ${Number(record.amount).toLocaleString("fr-FR")} FCFA`,
        `Statut: ${record.status}`,
        `Date: ${(record.requested_at ?? record.created_at).toISOString()}`,
        `Note: ${record.note ?? "-"}`,
      ]);
      return new NextResponse(pdf, { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=preuve-retrait-${record.id}.pdf` } });
    }
  }

  if (resource === "coupons") {
    if (request.method === "GET" && segments.length === 2) {
      const data = await prisma.coupon.findMany({ orderBy: { created_at: "desc" } });
      return ok({ data });
    }

    if (request.method === "POST" && segments.length === 2) {
      const payload = await parseJson(request, couponSchema);
      const coupon = await prisma.coupon.create({
        data: {
          ...payload,
          code: payload.code.toUpperCase(),
          starts_at: payload.starts_at ? new Date(payload.starts_at) : null,
          ends_at: payload.ends_at ? new Date(payload.ends_at) : null,
          unique_per_user: payload.unique_per_user ?? false,
        },
      });
      return ok(coupon, 201);
    }

    const couponId = Number(segments[2]);
    if (!Number.isInteger(couponId)) return fail("Not found", 404);

    if (request.method === "GET") {
      const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
      if (!coupon) return fail("Not found", 404);
      return ok(coupon);
    }

    if (request.method === "PATCH") {
      const payload = await parseJson(request, couponSchema.partial());
      const coupon = await prisma.coupon.update({
        where: { id: couponId },
        data: {
          ...(payload.name !== undefined ? { name: payload.name } : {}),
          ...(payload.code !== undefined ? { code: payload.code.toUpperCase() } : {}),
          ...(payload.description !== undefined ? { description: payload.description ?? null } : {}),
          ...(payload.type !== undefined ? { type: payload.type } : {}),
          ...(payload.amount !== undefined ? { amount: payload.amount } : {}),
          ...(payload.min_amount !== undefined ? { min_amount: payload.min_amount ?? null } : {}),
          ...(payload.max_discount !== undefined ? { max_discount: payload.max_discount ?? null } : {}),
          ...(payload.applies_to !== undefined ? { applies_to: payload.applies_to } : {}),
          ...(payload.active !== undefined ? { active: payload.active } : {}),
          ...(payload.unique_per_user !== undefined ? { unique_per_user: payload.unique_per_user } : {}),
          ...(payload.starts_at !== undefined ? { starts_at: payload.starts_at ? new Date(payload.starts_at) : null } : {}),
          ...(payload.ends_at !== undefined ? { ends_at: payload.ends_at ? new Date(payload.ends_at) : null } : {}),
          ...(payload.usage_limit !== undefined ? { usage_limit: payload.usage_limit ?? null } : {}),
        },
      });
      return ok(coupon);
    }

    if (request.method === "DELETE") {
      await prisma.coupon.delete({ where: { id: couponId } }).catch(() => null);
      return ok({ ok: true });
    }
  }

  if (resource === "grouped-offers") {
    if (request.method === "GET" && segments.length === 2) {
      const data = await prisma.groupedOffer.findMany({
        orderBy: { created_at: "desc" },
        include: { category: { select: { id: true, name: true } }, products: { include: { product: { select: { id: true, name: true } } } } },
      });
      return ok({
        data: data.map((offer) => ({
          ...offer,
          products: offer.products.map((item) => item.product),
        })),
      });
    }

    if (request.method === "POST" && segments.length === 2) {
      const payload = await parseJson(request, groupedOfferSchema);
      const offer = await prisma.groupedOffer.create({
        data: {
          title: payload.title,
          discount_percent: payload.discount_percent,
          category_id: payload.category_id ?? null,
          active: payload.active,
          products: payload.product_ids.length
            ? { createMany: { data: payload.product_ids.map((product_id) => ({ product_id })) } }
            : undefined,
        },
        include: { category: { select: { id: true, name: true } }, products: { include: { product: { select: { id: true, name: true } } } } },
      });
      return ok({ ...offer, products: offer.products.map((item) => item.product) }, 201);
    }

    const offerId = Number(segments[2]);
    if (!Number.isInteger(offerId)) return fail("Not found", 404);

    if (request.method === "PATCH") {
      const payload = await parseJson(request, groupedOfferSchema.partial());
      const offer = await prisma.$transaction(async (tx) => {
        if (payload.product_ids) {
          await tx.groupedOfferProduct.deleteMany({ where: { grouped_offer_id: offerId } });
          if (payload.product_ids.length) {
            await tx.groupedOfferProduct.createMany({ data: payload.product_ids.map((product_id) => ({ grouped_offer_id: offerId, product_id })) });
          }
        }

        return tx.groupedOffer.update({
          where: { id: offerId },
          data: {
            ...(payload.title !== undefined ? { title: payload.title } : {}),
            ...(payload.discount_percent !== undefined ? { discount_percent: payload.discount_percent } : {}),
            ...(payload.category_id !== undefined ? { category_id: payload.category_id ?? null } : {}),
            ...(payload.active !== undefined ? { active: payload.active } : {}),
          },
          include: { category: { select: { id: true, name: true } }, products: { include: { product: { select: { id: true, name: true } } } } },
        });
      });
      return ok({ ...offer, products: offer.products.map((item) => item.product) });
    }

    if (request.method === "DELETE") {
      await prisma.groupedOffer.delete({ where: { id: offerId } }).catch(() => null);
      return ok({ ok: true });
    }
  }

  if (resource === "import-requests") {
    if (request.method === "GET" && segments.length === 2) {
      const data = await prisma.importRequest.findMany({
        orderBy: { created_at: "desc" },
        include: { payment: true, user: { select: { id: true, name: true, email: true } } },
      });
      return ok({ data });
    }

    const requestId = Number(segments[2]);
    if (!Number.isInteger(requestId)) return fail("Not found", 404);

    if (request.method === "GET") {
      const item = await prisma.importRequest.findUnique({
        where: { id: requestId },
        include: { payment: true, user: { select: { id: true, name: true, email: true } } },
      });
      if (!item) return fail("Not found", 404);
      return ok(item);
    }

    if (request.method === "PATCH") {
      const payload = await parseJson(request, importRequestPatchSchema);
      const item = await prisma.importRequest.update({
        where: { id: requestId },
        data: {
          ...(payload.status !== undefined ? { status: payload.status } : {}),
          ...(payload.admin_price !== undefined ? { admin_price: payload.admin_price } : {}),
          ...(payload.tracking_number !== undefined ? { tracking_number: payload.tracking_number ?? null } : {}),
        },
        include: { payment: true, user: { select: { id: true, name: true, email: true } } },
      });
      return ok(item);
    }
  }

  if (resource === "notifications" && request.method === "GET") {
    const since = request.nextUrl.searchParams.get("since");
    const sinceDate = since ? new Date(since) : null;

    const [orders, users, withdrawals] = await Promise.all([
      prisma.order.findMany({
        where: sinceDate ? { created_at: { gt: sinceDate } } : undefined,
        orderBy: { created_at: "desc" },
        take: 10,
        include: { user: { select: { name: true } } },
      }),
      prisma.user.findMany({
        where: sinceDate ? { created_at: { gt: sinceDate } } : undefined,
        orderBy: { created_at: "desc" },
        take: 10,
        select: { id: true, name: true, created_at: true },
      }),
      prisma.adminWithdrawalRequest.findMany({
        where: sinceDate ? { created_at: { gt: sinceDate } } : undefined,
        orderBy: { created_at: "desc" },
        take: 10,
        include: { user: { select: { name: true } } },
      }),
    ]);

    const data = [
      ...orders.map((item) => ({ id: `order-${item.id}`, created_at: item.created_at, title: "Nouvelle commande", message: `Commande #${item.id} par ${item.user?.name ?? "Client"}`, href: `/admin/orders/${item.id}` })),
      ...users.map((item) => ({ id: `user-${item.id}`, created_at: item.created_at, title: "Nouvel utilisateur", message: `${item.name} vient de créer un compte`, href: `/admin/users/${item.id}` })),
      ...withdrawals.map((item) => ({ id: `withdrawal-${item.id}`, created_at: item.created_at, title: "Demande de retrait", message: `${item.user?.name ?? "Admin"} a demandé ${Number(item.amount).toLocaleString("fr-FR")} FCFA`, href: "/admin/settings" })),
    ]
      .sort((left, right) => +new Date(right.created_at) - +new Date(left.created_at))
      .slice(0, 20);

    return ok({ data, unread_count: data.length, server_time: new Date().toISOString() });
  }

  if (resource === "import" && segments[2] === "products") {
    return fail("Bulk product import is not implemented yet.", 501);
  }

  return fail("Not found", 404);
}

async function handleTracking(request: NextRequest, segments: string[]) {
  const trackingNumber = decodeURIComponent(segments[1] ?? "").trim();
  if (!trackingNumber) return fail("Invalid tracking number", 422);

  const orders = await prisma.order.findMany({
    where: { metadata: { path: ["tracking_number"], equals: trackingNumber } },
    orderBy: { created_at: "desc" },
    take: 1,
  });
  const order = orders[0];
  if (!order) return fail("Order not found", 404);

  const meta = ((order.metadata as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  const createdAt = order.created_at;
  const estimatedDelivery = typeof meta.estimated_delivery === "string"
    ? meta.estimated_delivery
    : new Date(createdAt.getTime() + (order.tag_delivery === "PRET_A_ETRE_LIVRE" ? 3 : 7) * 24 * 60 * 60 * 1000).toISOString();
  const status = String(order.status ?? "pending").toLowerCase();

  return ok({
    tracking_number: trackingNumber,
    order_number: String(meta.order_number ?? `IF${order.id}`),
    status: order.status,
    order_date: createdAt.toISOString(),
    estimated_delivery: estimatedDelivery,
    steps: [
      { key: "received", label: "Commande reçue", date: createdAt.toISOString() },
      { key: "preparing", label: "En préparation", date: ["preparing", "processing", "shipped", "delivered"].includes(status) ? String(meta.preparing_at ?? null) : null },
      { key: "shipped", label: "Expédié", date: ["shipped", "delivered"].includes(status) ? String(meta.shipped_at ?? null) : null },
      { key: "delivered", label: "Livré", date: status === "delivered" ? String(meta.delivered_at ?? null) : null },
    ],
  });
}

async function handleReverseGeocode(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lon = request.nextUrl.searchParams.get("lon");
  if (!lat || !lon) return fail("Missing coordinates", 422);

  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1`, {
    headers: {
      "User-Agent": "IndustrieDeLAvenir/1.0 (support@futurind.space)",
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) return fail("Geocoding failed", 502);

  const payload = (await response.json()) as { address?: Record<string, string>; name?: string; display_name?: string };
  const address = payload.address ?? {};
  const line1 = `${address.house_number ? `${address.house_number} ` : ""}${address.road ?? address.pedestrian ?? address.neighbourhood ?? address.suburb ?? ""}`.trim() || (payload.name ?? payload.display_name?.split(",")[0] ?? "").trim();
  return ok({
    line1,
    city: address.city ?? address.town ?? address.village ?? address.municipality ?? address.county ?? "",
    postal_code: address.postcode ?? "",
    country: address.country_code?.toUpperCase() ?? address.country ?? "",
  });
}

async function handlePaymentReturnStatus(request: NextRequest) {
  const orderId = Number(request.nextUrl.searchParams.get("order_id"));
  const paymentId = Number(request.nextUrl.searchParams.get("payment_id"));
  const mock = request.nextUrl.searchParams.get("mock") === "1";
  if (!Number.isInteger(orderId) || !Number.isInteger(paymentId)) return fail("Invalid parameters", 422);

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.order_id !== orderId) return fail("Not found", 404);
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return fail("Not found", 404);

  if (payment.provider === "mock" && mock && payment.status === "pending") {
    await setPaymentStatus(payment.id, "completed");
  }

  if (payment.provider === "fedapay") {
    await syncPaymentWithProvider(payment.id);
  }

  const [freshOrder, freshPayment] = await Promise.all([
    prisma.order.findUnique({ where: { id: orderId } }),
    prisma.payment.findUnique({ where: { id: paymentId } }),
  ]);

  return ok({
    order_id: orderId,
    payment_id: paymentId,
    order_status: freshOrder?.status ?? order.status,
    payment_status: freshPayment?.status ?? payment.status,
  });
}

export async function handleApiRequest(request: NextRequest, path: string[]) {
  try {
    if (path.length === 0) return fail("Not found", 404);
    if (path[0] === "health" && request.method === "GET") {
      return ok({ status: "ok", timestamp: new Date().toISOString() });
    }
    if (path[0] === "webhooks" && path[1] === "payments" && request.method === "POST") {
      return handlePaymentWebhook(request);
    }
    if (path[0] === "payment" && path[1] === "return-status" && request.method === "GET") {
      return handlePaymentReturnStatus(request);
    }
    if (path[0] === "tracking" && request.method === "GET") {
      return handleTracking(request, path);
    }
    if (path[0] === "categories") return handleCategories(request, path);
    if (path[0] === "products") return handleProducts(request, path);
    if (path[0] === "auth") return handleAuthRoutes(request, path);

    if (path[0] === "geocode" && path[1] === "reverse" && request.method === "GET") {
      const auth = await requireAuth(request);
      if (auth.response) return auth.response;
      return handleReverseGeocode(request);
    }

    if (["addresses", "cart", "checkout", "orders", "import-requests"].includes(path[0])) {
      const auth = await requireAuth(request);
      if (auth.response || !auth.user) return auth.response;
      if (path[0] === "addresses") return handleAddresses(request, auth.user, path);
      if (path[0] === "cart") return handleCart(request, auth.user);
      if (path[0] === "checkout" && request.method === "POST") return handleCheckout(request, auth.user);
      if (path[0] === "orders") return handleOrders(request, auth.user, path);
      if (path[0] === "import-requests") return handleImportRequests(request, auth.user, path);
    }

    if (path[0] === "admin") {
      const auth = await requireAdmin(request);
      if (auth.response || !auth.user) return auth.response;
      return handleAdmin(request, auth.user, path);
    }

    return fail("Not found", 404);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Validation error", 422);
    }
    if (error instanceof Error) {
      return fail(error.message, 500);
    }
    return fail("Unexpected server error", 500);
  }
}