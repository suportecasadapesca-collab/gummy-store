import type { Handler } from "@netlify/functions";

const handler: Handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  console.log("[KorePay webhook]", event.body);
  return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };
};

export { handler };
