import type { Handler } from "@netlify/functions";

const UTMIFY_API   = "https://api.utmify.com.br/api-credentials/orders";
const UTMIFY_TOKEN = process.env.UTMIFY_TOKEN ?? "yLMxRXAUoKEgJcWhLzJ9myu08F4xAoJd0CjR";

function nowBR() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

const handler: Handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const { orderId, form, cartItems, amountCents, utmParams } = JSON.parse(event.body || "{}");
    const gatewayFee = Math.round(amountCents * 0.05);

    const res = await fetch(UTMIFY_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-token": UTMIFY_TOKEN },
      body: JSON.stringify({
        orderId: String(orderId),
        platform: "other",
        paymentMethod: "pix",
        status: "approved",
        createdAt: nowBR(),
        approvedDate: nowBR(),
        customer: {
          name: `${form.firstName} ${form.lastName ?? ""}`.trim(),
          email: form.email,
          phone: (form.phone ?? "").replace(/\D/g, ""),
          document: (form.cpf ?? "").replace(/\D/g, ""),
        },
        products: cartItems.map((item: any) => ({
          id: String(item.id), name: item.name, planId: null, planName: null,
          quantity: item.quantity, priceInCents: Math.round(item.currentPrice * 100),
        })),
        trackingParameters: {
          utm_source:   utmParams?.utm_source   ?? null,
          utm_medium:   utmParams?.utm_medium   ?? null,
          utm_campaign: utmParams?.utm_campaign ?? null,
          utm_term:     utmParams?.utm_term     ?? null,
          utm_content:  utmParams?.utm_content  ?? null,
          src:          utmParams?.src          ?? null,
        },
        commission: {
          totalPriceInCents:     amountCents,
          gatewayFeeInCents:     gatewayFee,
          userCommissionInCents: amountCents - gatewayFee,
        },
      }),
    });
    const text = await res.text();
    console.log("[UTMify approve]", res.status, text.slice(0, 200));
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err: any) {
    console.error("[UTMify approve error]", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

export { handler };
