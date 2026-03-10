declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    ttq: { track: (event: string, params?: Record<string, any>) => void };
  }
}

function fbq(...args: any[]) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq(...args);
  }
}

function ttq(event: string, params?: Record<string, any>) {
  if (typeof window !== "undefined" && window.ttq && typeof window.ttq.track === "function") {
    window.ttq.track(event, params);
  }
}

export function pixelViewContent(params: { content_name: string; value: number; currency?: string }) {
  fbq("track", "ViewContent", { ...params, currency: params.currency ?? "BRL", content_type: "product" });
  ttq("ViewContent", { value: params.value, currency: params.currency ?? "BRL", description: params.content_name });
}

export function pixelAddToCart(params: { content_name: string; value: number; currency?: string }) {
  fbq("track", "AddToCart", { ...params, currency: params.currency ?? "BRL", content_type: "product" });
  ttq("AddToCart", { value: params.value, currency: params.currency ?? "BRL", description: params.content_name });
}

export function pixelInitiateCheckout(params: { value: number; num_items: number; currency?: string }) {
  fbq("track", "InitiateCheckout", { ...params, currency: params.currency ?? "BRL" });
  ttq("InitiateCheckout", { value: params.value, currency: params.currency ?? "BRL" });
}

export function pixelCompleteRegistration() {
  fbq("track", "CompleteRegistration");
  ttq("CompleteRegistration");
}

export function pixelPurchase(params: { value: number; currency?: string }) {
  fbq("track", "Purchase", { ...params, currency: params.currency ?? "BRL" });
  ttq("CompletePayment", { value: params.value, currency: params.currency ?? "BRL" });
}
