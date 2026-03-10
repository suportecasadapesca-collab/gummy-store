import type { Handler } from "@netlify/functions";

const KOREPAY_API = "https://api.korepay.com.br/v1";

function getAuthHeader() {
  const pub = process.env.KOREPAY_PUBLIC_KEY ?? "";
  const sec = process.env.KOREPAY_SECRET_KEY ?? "";
  return "Basic " + Buffer.from(`${pub}:${sec}`).toString("base64");
}

const handler: Handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { form, cartItems, shippingCost, total } = JSON.parse(event.body || "{}");

    if (!cartItems || cartItems.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Carrinho vazio" }) };
    }
    if (!form?.email || !form?.cpf || !form?.firstName) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Dados do cliente incompletos" }) };
    }

    const amountCents = Math.round(total * 0.95 * 100);
    const cpfClean   = form.cpf.replace(/\D/g, "");
    const phoneClean = (form.phone ?? "").replace(/\D/g, "");
    const cepClean   = (form.cep ?? "").replace(/\D/g, "");

    const address = {
      street: form.address ?? "",
      streetNumber: form.number ?? "s/n",
      complement: form.complement || undefined,
      neighborhood: form.neighborhood ?? "",
      zipCode: cepClean,
      city: form.city ?? "",
      state: form.state ?? "",
      country: "BR",
    };

    const payload = {
      paymentMethod: "pix",
      amount: amountCents,
      items: cartItems.map((item: any) => ({
        title: item.name,
        quantity: item.quantity,
        unitPrice: Math.round(item.currentPrice * 100),
        tangible: true,
        externalRef: String(item.id),
      })),
      customer: {
        name: `${form.firstName} ${form.lastName ?? ""}`.trim(),
        email: form.email,
        phone: phoneClean,
        document: { type: "cpf", number: cpfClean },
        address,
      },
      ...(shippingCost > 0 ? { shipping: { fee: Math.round(shippingCost * 100), address } } : {}),
      externalRef: `gummy-${Date.now()}`,
      metadata: JSON.stringify({ source: "gummy-store" }),
      pix: {
        expirationDate: new Date(Date.now() + 30 * 60 * 1000).toISOString().split("T")[0],
      },
    };

    const res = await fetch(`${KOREPAY_API}/transactions`, {
      method: "POST",
      headers: { Authorization: getAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json() as any;
    if (!res.ok) throw new Error(json?.message ?? `KorePay error ${res.status}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        id: json?.id ?? json?.data?.id,
        qrcode: json?.pix?.qrcode ?? json?.data?.pix?.qrcode,
        status: json?.status ?? json?.data?.status,
        amount: amountCents,
      }),
    };
  } catch (err: any) {
    console.error("[KorePay]", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message ?? "Erro ao criar transação PIX" }) };
  }
};

export { handler };
