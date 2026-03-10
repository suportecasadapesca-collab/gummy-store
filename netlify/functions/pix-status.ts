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
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const id = event.queryStringParameters?.id;
  if (!id) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing transaction ID" }) };
  }

  try {
    const res = await fetch(`${KOREPAY_API}/transactions/${id}`, {
      headers: { Authorization: getAuthHeader() },
    });
    const json = await res.json() as any;
    if (!res.ok) throw new Error(json?.message ?? `KorePay error ${res.status}`);
    const data = json?.data ?? json;
    return { statusCode: 200, headers, body: JSON.stringify({ status: data?.status, id: data?.id }) };
  } catch (err: any) {
    console.error("[KorePay status]", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

export { handler };
