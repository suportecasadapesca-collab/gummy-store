import type { Handler } from "@netlify/functions";
import { createHash } from "crypto";

const UTMIFY_API   = "https://api.utmify.com.br/api-credentials/orders";
const TIKTOK_API   = "https://business-api.tiktok.com/open_api/v1.3/event/track/";
const TIKTOK_PIXEL = "D6O2NK3C77UDK3Q8U00G";
const UTMIFY_TOKEN = process.env.UTMIFY_TOKEN ?? "yLMxRXAUoKEgJcWhLzJ9myu08F4xAoJd0CjR";
const TIKTOK_TOKEN = process.env.TIKTOK_TOKEN ?? "3086afb3cb75cff65f1e2878ef451bc5aa5cb54f";

function sha256(v: string) { return createHash("sha256").update(v.trim().toLowerCase()).digest("hex"); }
function nowBR() { return new Date().toISOString().replace("T", " ").slice(0, 19); }

const handler: Handler = async (event) => {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const { orderId, form, cartItems, amountCents, utmParams } = JSON.parse(event.body || "{}");
    const gatewayFee = Math.round(amountCents * 0.05);
    const pixValue   = amountCents / 100;
    const ip = (event.headers["x-forwarded-for"] ?? "").split(",")[0];
    const ua = event.headers["user-agent"] ?? "";

    await Promise.all([
      // UTMify
      fetch(UTMIFY_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-token": UTMIFY_TOKEN },
        body: JSON.stringify({
          orderId: String(orderId), platform: "other", paymentMethod: "pix", status: "approved",
          createdAt: nowBR(), approvedDate: nowBR(),
          customer: { name: `${form.firstName} ${form.lastName ?? ""}`.trim(), email: form.email, phone: (form.phone ?? "").replace(/\D/g, ""), document: (form.cpf ?? "").replace(/\D/g, "") },
          products: cartItems.map((i: any) => ({ id: String(i.id), name: i.name, planId: null, planName: null, quantity: i.quantity, priceInCents: Math.round(i.currentPrice * 100) })),
          trackingParameters: { utm_source: utmParams?.utm_source ?? null, utm_medium: utmParams?.utm_medium ?? null, utm_campaign: utmParams?.utm_campaign ?? null, utm_term: utmParams?.utm_term ?? null, utm_content: utmParams?.utm_content ?? null, src: utmParams?.src ?? null },
          commission: { totalPriceInCents: amountCents, gatewayFeeInCents: gatewayFee, userCommissionInCents: amountCents - gatewayFee },
        }),
      }),
      // TikTok CompletePayment
      fetch(TIKTOK_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Access-Token": TIKTOK_TOKEN },
        body: JSON.stringify({
          pixel_code: TIKTOK_PIXEL, event_source: "web", event_source_id: TIKTOK_PIXEL,
          data: [{
            event: "CompletePayment",
            event_time: Math.floor(Date.now() / 1000),
            event_id: `paid-${orderId}`,
            user: {
              ...(form?.email     ? { email:        sha256(form.email) } : {}),
              ...(form?.phone     ? { phone_number: sha256((form.phone ?? "").replace(/\D/g, "")) } : {}),
              ...(form?.firstName ? { first_name:   sha256(form.firstName.toLowerCase()) } : {}),
              ...(form?.lastName  ? { last_name:    sha256((form.lastName ?? "").toLowerCase()) } : {}),
              ...(ip ? { ip } : {}),
              ...(ua ? { user_agent: ua } : {}),
            },
            page: { url: "https://gummy-store.netlify.app/checkout" },
            properties: {
              currency: "BRL", value: pixValue,
              contents: cartItems.map((i: any) => ({ content_id: String(i.id), content_name: i.name, quantity: i.quantity, price: i.currentPrice })),
            },
          }],
        }),
      }),
    ]);

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err: any) {
    console.error("[approve error]", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

export { handler };
