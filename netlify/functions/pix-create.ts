import type { Handler } from "@netlify/functions";

const KOREPAY_API   = "https://api.korepay.com.br/v1";
const UTMIFY_API    = "https://api.utmify.com.br/api-credentials/orders";
const UTMIFY_TOKEN  = process.env.UTMIFY_TOKEN ?? "yLMxRXAUoKEgJcWhLzJ9myu08F4xAoJd0CjR";

function getAuthHeader() {
  const pub = process.env.KOREPAY_PUBLIC_KEY ?? "";
  const sec = process.env.KOREPAY_SECRET_KEY ?? "";
  return "Basic " + Buffer.from(`${pub}:${sec}`).toString("base64");
}

function nowBR() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

async function notifyUtmify(orderId: string, amountCents: number, form: any, cartItems: any[], utmParams: any) {
  try {
    const gatewayFee = Math.round(amountCents * 0.05);
    await fetch(UTMIFY_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-token": UTMIFY_TOKEN },
      body: JSON.stringify({
        orderId,
        platform: "other",
        paymentMethod: "pix",
        status: "waiting_payment",
        createdAt: nowBR(),
        approvedDate: null,
        customer: {
          name: `${form.firstName} ${form.lastName ?? ""}`.trim(),
          email: form.email,
          phone: (form.phone ?? "").replace(/\D/g, ""),
          document: (form.cpf ?? "").replace(/\D/g, ""),
        },
        products: cartItems.map((item: any) => ({
          id: String(item.id),
          name: item.name,
          planId: null,
          planName: null,
          quantity: item.quantity,
          priceInCents: Math.round(item.currentPrice * 100),
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
  } catch (err: any) {
    console.error("[UTMify]", err.message);
  }
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
    const { form, cartItems, shippingCost, total, utmParams } = JSON.parse(event.body || "{}");

    if (!cartItems || cartItems.length === 0) return { statusCode: 400, headers, body: JSON.stringify({ error: "Carrinho vazio" }) };
    if (!form?.email || !form?.cpf || !form?.firstName) return { statusCode: 400, headers, body: JSON.stringify({ error: "Dados do cliente incompletos" }) };

    const amountCents = Math.round(total * 0.95 * 100);
    const cpfClean    = form.cpf.replace(/\D/g, "");
    const phoneClean  = (form.phone ?? "").replace(/\D/g, "");
    const cepClean    = (form.cep ?? "").replace(/\D/g, "");

    const address = {
      street: form.address ?? "", streetNumber: form.number ?? "s/n",
      complement: form.complement || undefined, neighborhood: form.neighborhood ?? "",
      zipCode: cepClean, city: form.city ?? "", state: form.state ?? "", country: "BR",
    };

    const payload = {
      paymentMethod: "pix", amount: amountCents,
      items: cartItems.map((item: any) => ({ title: item.name, quantity: item.quantity, unitPrice: Math.round(item.currentPrice * 100), tangible: true, externalRef: String(item.id) })),
      customer: { name: `${form.firstName} ${form.lastName ?? ""}`.trim(), email: form.email, phone: phoneClean, document: { type: "cpf", number: cpfClean }, address },
      ...(shippingCost > 0 ? { shipping: { fee: Math.round(shippingCost * 100), address } } : {}),
      externalRef: `gummy-${Date.now()}`,
      metadata: JSON.stringify({ source: "gummy-store" }),
      pix: { expirationDate: new Date(Date.now() + 30 * 60 * 1000).toISOString().split("T")[0] },
    };

    const res  = await fetch(`${KOREPAY_API}/transactions`, { method: "POST", headers: { Authorization: getAuthHeader(), "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const json = await res.json() as any;
    if (!res.ok) throw new Error(json?.message ?? `KorePay error ${res.status}`);

    const transactionId = json?.id ?? json?.data?.id;

    // Notify UTMify (fire and forget)
    notifyUtmify(String(transactionId), amountCents, form, cartItems, utmParams ?? {});

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ id: transactionId, qrcode: json?.pix?.qrcode ?? json?.data?.pix?.qrcode, status: json?.status ?? json?.data?.status, amount: amountCents }),
    };
  } catch (err: any) {
    console.error("[KorePay]", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message ?? "Erro ao criar transação PIX" }) };
  }
};

export { handler };
