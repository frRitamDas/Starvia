import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";

/**
 * Minimal Razorpay REST client (no SDK dependency).
 * Docs: https://razorpay.com/docs/api/
 *
 * All calls happen server-side with the key secret. The browser only ever
 * receives the public key id and an order/subscription id.
 */

const API_BASE = "https://api.razorpay.com/v1";

export class RazorpayError extends Error {
  status: number;
  detail?: string;
  constructor(message: string, status = 500, detail?: string) {
    super(message);
    this.name = "RazorpayError";
    this.status = status;
    this.detail = detail;
  }
}

function authHeader() {
  const keyId = serverEnv.razorpayKeyId;
  const keySecret = serverEnv.razorpayKeySecret;
  if (!keyId || !keySecret) {
    throw new RazorpayError("Razorpay is not configured for this deployment.", 501);
  }
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const raw = await response.text();
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const detail = (parsed as { error?: { description?: string } } | null)?.error?.description ?? raw;
    throw new RazorpayError(
      response.status === 401
        ? "Razorpay credentials were rejected."
        : "Payment provider request failed.",
      response.status,
      detail,
    );
  }
  return parsed as T;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt?: string | null;
  notes?: Record<string, string>;
}

export interface RazorpaySubscription {
  id: string;
  plan_id: string;
  status: string;
  current_start?: number | null;
  current_end?: number | null;
  charge_at?: number | null;
  ended_at?: number | null;
  quantity: number;
  notes?: Record<string, string>;
}

export interface RazorpayPayment {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  email?: string;
  contact?: string;
  created_at?: number;
}

/** One-time order (used for monthly passes without a stored card). */
export async function createOrder(input: {
  amountInPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  return call<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: Math.round(input.amountInPaise),
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes ?? {},
      payment_capture: 1,
    }),
  });
}

/** Recurring subscription (used when RAZORPAY_PLAN_* ids are configured). */
export async function createSubscription(input: {
  planId: string;
  totalCount?: number;
  notes?: Record<string, string>;
}): Promise<RazorpaySubscription> {
  return call<RazorpaySubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: input.planId,
      total_count: input.totalCount ?? 120,
      quantity: 1,
      customer_notify: 1,
      notes: input.notes ?? {},
    }),
  });
}

export async function fetchSubscription(subscriptionId: string): Promise<RazorpaySubscription> {
  return call<RazorpaySubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

export async function fetchPayment(paymentId: string): Promise<RazorpayPayment> {
  return call<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

export async function cancelSubscription(
  subscriptionId: string,
  options: { atCycleEnd?: boolean } = {},
): Promise<RazorpaySubscription> {
  return call<RazorpaySubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancel_at_cycle_end: options.atCycleEnd ? 1 : 0 }),
  });
}

/* ------------------------------------------------------------------ */
/* Signature verification — always server-side, always constant-time   */
/* ------------------------------------------------------------------ */

function safeCompare(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

/** Verifies the checkout handshake for a one-time order. */
export function verifyPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = serverEnv.razorpayKeySecret;
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
  return safeCompare(expected, input.signature);
}

/** Verifies the checkout handshake for a recurring subscription. */
export function verifySubscriptionSignature(input: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
}): boolean {
  const secret = serverEnv.razorpayKeySecret;
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`${input.paymentId}|${input.subscriptionId}`)
    .digest("hex");
  return safeCompare(expected, input.signature);
}

/** Verifies a Razorpay webhook body against the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = serverEnv.razorpayWebhookSecret;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeCompare(expected, signature);
}
