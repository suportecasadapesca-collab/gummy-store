const KOREPAY_API = "https://api.korepay.com.br/v1";

function getAuthHeader() {
  const pub = process.env.KOREPAY_PUBLIC_KEY ?? "";
  const sec = process.env.KOREPAY_SECRET_KEY ?? "";
  return "Basic " + Buffer.from(`${pub}:${sec}`).toString("base64");
}

export interface KorePayPixRequest {
  amount: number;
  items: Array<{ title: string; quantity: number; unitPrice: number; tangible: boolean; externalRef?: string }>;
  customer: {
    name: string;
    email: string;
    phone: string;
    document: { type: "cpf" | "cnpj"; number: string };
    address: {
      street: string;
      streetNumber: string;
      complement?: string;
      neighborhood: string;
      zipCode: string;
      city: string;
      state: string;
      country: string;
    };
  };
  shipping?: {
    fee: number;
    address: {
      street: string;
      streetNumber: string;
      complement?: string;
      neighborhood: string;
      zipCode: string;
      city: string;
      state: string;
      country: string;
    };
  };
  postbackUrl?: string;
  externalRef?: string;
  metadata?: string;
  pix?: { expirationDate?: string };
}

export async function createPixTransaction(data: KorePayPixRequest) {
  const body = {
    paymentMethod: "pix",
    amount: data.amount,
    items: data.items,
    customer: data.customer,
    ...(data.shipping ? { shipping: data.shipping } : {}),
    ...(data.postbackUrl ? { postbackUrl: data.postbackUrl } : {}),
    ...(data.externalRef ? { externalRef: data.externalRef } : {}),
    ...(data.metadata ? { metadata: data.metadata } : {}),
    ...(data.pix ? { pix: data.pix } : {}),
  };

  const res = await fetch(`${KOREPAY_API}/transactions`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.message ?? `KorePay error ${res.status}`);
  }
  return json;
}

export async function getTransaction(id: string | number) {
  const res = await fetch(`${KOREPAY_API}/transactions/${id}`, {
    headers: { Authorization: getAuthHeader() },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.message ?? `KorePay error ${res.status}`);
  }
  return json;
}
