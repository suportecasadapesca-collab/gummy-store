const UTMIFY_API = "https://api.utmify.com.br/api-credentials/orders";
const UTMIFY_TOKEN = process.env.UTMIFY_TOKEN ?? "yLMxRXAUoKEgJcWhLzJ9myu08F4xAoJd0CjR";

export interface UtmParams {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  src?: string | null;
}

export interface UtmifyOrderPayload {
  orderId: string;
  platform: string;
  paymentMethod: string;
  status: "waiting_payment" | "approved" | "refunded" | "cancelled";
  createdAt: string;
  approvedDate: string | null;
  customer: { name: string; email: string; phone: string; document: string };
  products: Array<{ id: string; name: string; planId: null; planName: null; quantity: number; priceInCents: number }>;
  trackingParameters: { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; utm_term: string | null; utm_content: string | null; src: string | null };
  commission: { totalPriceInCents: number; gatewayFeeInCents: number; userCommissionInCents: number };
}

function nowBR(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

export async function notifyUtmify(payload: UtmifyOrderPayload): Promise<void> {
  try {
    const res = await fetch(UTMIFY_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-token": UTMIFY_TOKEN },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    console.log(`[UTMify] ${payload.status} → ${res.status}: ${text.slice(0, 200)}`);
  } catch (err: any) {
    console.error("[UTMify] Error:", err.message);
  }
}

export function buildUtmifyPayload(opts: {
  orderId: string;
  status: "waiting_payment" | "approved";
  amountCents: number;
  form: { firstName: string; lastName?: string; email: string; phone: string; cpf: string };
  cartItems: Array<{ id: number; name: string; currentPrice: number; quantity: number }>;
  utmParams: UtmParams;
  approvedDate?: string | null;
}): UtmifyOrderPayload {
  const gatewayFee = Math.round(opts.amountCents * 0.05);
  return {
    orderId: opts.orderId,
    platform: "other",
    paymentMethod: "pix",
    status: opts.status,
    createdAt: nowBR(),
    approvedDate: opts.approvedDate ?? null,
    customer: {
      name: `${opts.form.firstName} ${opts.form.lastName ?? ""}`.trim(),
      email: opts.form.email,
      phone: opts.form.phone.replace(/\D/g, ""),
      document: opts.form.cpf.replace(/\D/g, ""),
    },
    products: opts.cartItems.map((item) => ({
      id: String(item.id),
      name: item.name,
      planId: null,
      planName: null,
      quantity: item.quantity,
      priceInCents: Math.round(item.currentPrice * 100),
    })),
    trackingParameters: {
      utm_source:   opts.utmParams.utm_source   ?? null,
      utm_medium:   opts.utmParams.utm_medium   ?? null,
      utm_campaign: opts.utmParams.utm_campaign ?? null,
      utm_term:     opts.utmParams.utm_term     ?? null,
      utm_content:  opts.utmParams.utm_content  ?? null,
      src:          opts.utmParams.src          ?? null,
    },
    commission: {
      totalPriceInCents:    opts.amountCents,
      gatewayFeeInCents:    gatewayFee,
      userCommissionInCents: opts.amountCents - gatewayFee,
    },
  };
}
