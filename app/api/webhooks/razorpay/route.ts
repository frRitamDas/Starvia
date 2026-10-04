import { NextResponse } from "next/server";

import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { handleWebhookEvent } from "@/lib/payments/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Razorpay webhook receiver.
 *
 * Configure in Razorpay Dashboard → Settings → Webhooks:
 *   URL:    https://<your-domain>/api/webhooks/razorpay
 *   Events: payment.captured, payment.failed, subscription.activated,
 *           subscription.authenticated, subscription.charged,
 *           subscription.pending, subscription.halted, subscription.cancelled,
 *           subscription.completed, subscription.expired
 *   Secret: RAZORPAY_WEBHOOK_SECRET
 *
 * The raw body is used for signature verification (never re-serialised JSON),
 * and every handler is idempotent so retries are safe.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    // 401 tells Razorpay the delivery failed without leaking why.
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  let event: { event?: string; payload?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  try {
    const result = await handleWebhookEvent({
      event: event.event ?? "unknown",
      payload: event.payload,
    });
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error("[webhook:razorpay]", error);
    // 500 makes Razorpay retry the delivery.
    return NextResponse.json({ ok: false, error: "processing_failed" }, { status: 500 });
  }
}
