import { createHash } from "crypto";

const TIKTOK_API     = "https://business-api.tiktok.com/open_api/v1.3/event/track/";
const TIKTOK_PIXEL   = "D6O2NK3C77UDK3Q8U00G";
const TIKTOK_TOKEN   = process.env.TIKTOK_TOKEN ?? "3086afb3cb75cff65f1e2878ef451bc5aa5cb54f";

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export async function sendTikTokEvent(opts: {
  event: "PlaceAnOrder" | "CompletePayment" | "InitiateCheckout" | "AddToCart" | "ViewContent";
  eventId: string;
  value: number;
  currency?: string;
  form?: { email?: string; phone?: string; firstName?: string; lastName?: string };
  contents?: Array<{ content_id: string; content_name: string; quantity: number; price: number }>;
  ip?: string;
  userAgent?: string;
  pageUrl?: string;
}): Promise<void> {
  try {
    const user: Record<string, string> = {};
    if (opts.form?.email)     user["email"]      = sha256(opts.form.email);
    if (opts.form?.phone)     user["phone_number"] = sha256(opts.form.phone.replace(/\D/g, ""));
    if (opts.form?.firstName) user["first_name"]  = sha256(opts.form.firstName.toLowerCase());
    if (opts.form?.lastName)  user["last_name"]   = sha256((opts.form.lastName ?? "").toLowerCase());
    if (opts.ip)              user["ip"]          = opts.ip;
    if (opts.userAgent)       user["user_agent"]  = opts.userAgent;

    const body = {
      pixel_code: TIKTOK_PIXEL,
      event_source: "web",
      event_source_id: TIKTOK_PIXEL,
      data: [
        {
          event: opts.event,
          event_time: Math.floor(Date.now() / 1000),
          event_id: opts.eventId,
          user,
          page: { url: opts.pageUrl ?? "https://gummy-store.netlify.app/checkout" },
          properties: {
            currency: opts.currency ?? "BRL",
            value: opts.value,
            contents: opts.contents ?? [],
          },
        },
      ],
    };

    const res = await fetch(TIKTOK_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Access-Token": TIKTOK_TOKEN },
      body: JSON.stringify(body),
    });
    const json = await res.json() as any;
    console.log(`[TikTok] ${opts.event} → ${res.status}: ${json?.message ?? JSON.stringify(json).slice(0, 100)}`);
  } catch (err: any) {
    console.error("[TikTok]", err.message);
  }
}
