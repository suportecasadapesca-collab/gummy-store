import type { Handler } from "@netlify/functions";
import { createHash } from "crypto";

const KOREPAY_API   = "https://api.korepay.com.br/v1";
const UTMIFY_API    = "https://api.utmify.com.br/api-credentials/orders";
const TIKTOK_API    = "https://business-api.tiktok.com/open_api/v1.3/event/track/";
const TIKTOK_PIXEL  = "D6O2NK3C77UDK3Q8U00G";
const UTMIFY_TOKEN  = process.env.UTMIFY_TOKEN  ?? "yLMxRXAUoKEgJcWhLzJ9myu08F4xAoJd0CjR";
const TIKTOK_TOKEN  = process.env.TIKTOK_TOKEN  ?? "3086afb3cb75cff65f1e2878ef451bc5aa5cb54f";

function sha256(v: string) { return createHash("sha256").update(v.trim().toLowerCase()).digest("hex"); }
function getAuthHeader() {
  return "Basic " + Buffer.from(`${process.env.KOREPAY_PUBLIC_KEY ?? ""}:${process.env.KOREPAY_SECRET_KEY ?? ""}`).toString("base64");
}
function nowBR() { return new Date().toISOString().replace("T", " ").slice(0, 19); }

async function notifyUtmify(orderId: string, amountCents: number, form: any, cartItems: any[], utmParams: any) {
  try {
    const gatewayFee = Math.round(amountCents * 0.05);
    await fetch(UTMIFY_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-token": UTMIFY_TOKEN },
      body: JSON.stringify({
        orderId, platform: "other", paymentMethod: "pix", status: "waiting_payment",
        createdAt: nowBR(), approvedDate: null,
        customer: { name: `${form.firstName} ${form.lastName ?? ""}`.trim(), email: form.email, phone: (form.phone ?? "").replace(/\D/g, ""), document: (form.cpf ?? "").replace(/\D/g, "") },
        products: cartItems.map((i: any) => ({ id: String(i.id), name: i.name, planId: null, planName: null, quantity: i.quantity, priceInCents: Math.round(i.currentPrice * 100) })),
        trackingParameters: { utm_source: utmParams?.utm_source ?? null, utm_medium: utmParams?.utm_medium ?? null, utm_campaign: utmParams?.utm_campaign ?? null, utm_term: utmParams?.utm_term ?? null, utm_content: utmParams?.utm_content ?? null, src: utmParams?.src ?? null },
        commission: { totalPriceInCents: amountCents, gatewayFeeInCents: gatewayFee, userCommissionInCents: amountCents - gatewayFee },
      }),
    });
  } catch (err: any) { console.error("[UTMify]", err.message); }
}

async function sendTikTokEvent(orderId: string, value: number, form: any, cartItems: any[], ip: string, ua: string) {
  try {
    const user: Record<string, string> = {};
    if (form?.email)     user.email        = sha256(form.email);
    if (form?.phone)     user.phone_number = sha256((form.phone ?? "").replace(/\D/g, ""));
    if (form?.firstName) user.first_name   = sha256(form.firstName.toLowerCase());
    if (form?.lastName)  user.last_name    = sha256((form.lastName ?? "").toLowerCase());
    if (ip) user.ip = ip;
    if (ua) user.user_agent = ua;

    await fetch(TIKTOK_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Access-Token": TIKTOK_TOKEN },
      body: JSON.stringify({
        pixel_code: TIKTOK_PIXEL, event_source: "web", event_source_id: TIKTOK_PIXEL,
        data: [{ event: "PlaceAnOrder", event_time: Math.floor(Date.now() / 1000), event_id: `order-${orderId}`, user,
          page: { url: "https://gummy-store.netlify.app/checkout" },
          properties: { currency: "BRL", value, contents: cartItems.map((i: any) => ({ content_id: String(i.id), content_name: i.name, quantity: i.quantity, price: i.currentPrice })) } }],
      }),
    });
  } catch (err: any) { console.error("[TikTok]", err.message); }
}

const handler: Handler = async (event) => {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const { form, cartItems, shippingCost, total, utmParams } = JSON.parse(event.body || "{}");
    if (!cartItems || cartItems.length === 0) return { statusCode: 400, headers, body: JSON.stringify({ error: "Carrinho vazio" }) };
    if (!form?.email || !form?.cpf || !form?.firstName) return { statusCode: 400, headers, body: JSON.stringify({ error: "Dados do cliente incompletos" }) };

    const amountCents = Math.round(total * 0.95 * 100);
    const pixValue    = total * 0.95;
    const cpfClean    = form.cpf.replace(/\D/g, "");
    const phoneClean  = (form.phone ?? "").replace(/\D/g, "");
    const cepClean    = (form.cep ?? "").replace(/\D/g, "");
    const address     = { street: form.address ?? "", streetNumber: form.number ?? "s/n", complement: form.complement || undefined, neighborhood: form.neighborhood ?? "", zipCode: cepClean, city: form.city ?? "", state: form.state ?? "", country: "BR" };

    const korepayRes = await fetch(`${KOREPAY_API}/transactions`, {
      method: "POST",
      headers: { Authorization: getAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentMethod: "pix", amount: amountCents,
        items: cartItems.map((i: any) => ({ title: i.name, quantity: i.quantity, unitPrice: Math.round(i.currentPrice * 100), tangible: true, externalRef: String(i.id) })),
        customer: { name: `${form.firstName} ${form.lastName ?? ""}`.trim(), email: form.email, phone: phoneClean, document: { type: "cpf", number: cpfClean }, address },
        ...(shippingCost > 0 ? { shipping: { fee: Math.round(shippingCost * 100), address } } : {}),
        externalRef: `gummy-${Date.now()}`, metadata: JSON.stringify({ source: "gummy-store" }),
        pix: { expirationDate: new Date(Date.now() + 30 * 60 * 1000).toISOString().split("T")[0] },
      }),
    });
    const json = await korepayRes.json() as any;
    if (!korepayRes.ok) throw new Error(json?.message ?? `KorePay error ${korepayRes.status}`);

    const transactionId = json?.id ?? json?.data?.id;
    const ip = (event.headers["x-forwarded-for"] ?? "").split(",")[0];
    const ua = event.headers["user-agent"] ?? "";

    notifyUtmify(String(transactionId), amountCents, form, cartItems, utmParams ?? {});
    sendTikTokEvent(String(transactionId), pixValue, form, cartItems, ip, ua);

    return { statusCode: 200, headers, body: JSON.stringify({ id: transactionId, qrcode: json?.pix?.qrcode ?? json?.data?.pix?.qrcode, status: json?.status ?? json?.data?.status, amount: amountCents }) };
  } catch (err: any) {
    console.error("[KorePay]", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message ?? "Erro ao criar transação PIX" }) };
  }
};

export { handler };
