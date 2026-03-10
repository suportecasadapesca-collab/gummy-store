declare global {
  interface Window {
    fbq: (...args: any[]) => void;
  }
}

function fbq(...args: any[]) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq(...args);
  }
}

export function pixelViewContent(params: { content_name: string; value: number; currency?: string }) {
  fbq("track", "ViewContent", { ...params, currency: params.currency ?? "BRL", content_type: "product" });
}

export function pixelAddToCart(params: { content_name: string; value: number; currency?: string }) {
  fbq("track", "AddToCart", { ...params, currency: params.currency ?? "BRL", content_type: "product" });
}

export function pixelInitiateCheckout(params: { value: number; num_items: number; currency?: string }) {
  fbq("track", "InitiateCheckout", { ...params, currency: params.currency ?? "BRL" });
}

export function pixelPurchase(params: { value: number; currency?: string }) {
  fbq("track", "Purchase", { ...params, currency: params.currency ?? "BRL" });
}
