import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createPixTransaction, getTransaction } from "./korepay";
import { notifyUtmify, buildUtmifyPayload } from "./utmify";
import { sendTikTokEvent } from "./tiktok";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/pix/create", async (req: Request, res: Response) => {
    try {
      const { form, cartItems, shippingCost, total, utmParams } = req.body;

      if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ error: "Carrinho vazio" });
      }
      if (!form?.email || !form?.cpf || !form?.firstName) {
        return res.status(400).json({ error: "Dados do cliente incompletos" });
      }

      const amountCents = Math.round(total * 0.95 * 100);
      const pixValue = total * 0.95;

      const cpfClean   = form.cpf.replace(/\D/g, "");
      const phoneClean = (form.phone ?? "").replace(/\D/g, "");
      const cepClean   = (form.cep ?? "").replace(/\D/g, "");

      const address = {
        street: form.address ?? "",
        streetNumber: form.number ?? "s/n",
        complement: form.complement ?? undefined,
        neighborhood: form.neighborhood ?? "",
        zipCode: cepClean,
        city: form.city ?? "",
        state: form.state ?? "",
        country: "BR",
      };

      const result = await createPixTransaction({
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
        shipping: shippingCost > 0 ? {
          fee: Math.round(shippingCost * 100),
          address,
        } : undefined,
        externalRef: `gummy-${Date.now()}`,
        metadata: JSON.stringify({ source: "gummy-store" }),
        pix: {
          expirationDate: new Date(Date.now() + 30 * 60 * 1000).toISOString().split("T")[0],
        },
      });

      const transactionId = result?.id ?? result?.data?.id;
      const ip        = (req.headers["x-forwarded-for"] as string)?.split(",")[0] ?? req.ip ?? "";
      const userAgent = req.headers["user-agent"] ?? "";

      // Notify UTMify — waiting_payment
      notifyUtmify(buildUtmifyPayload({
        orderId: String(transactionId),
        status: "waiting_payment",
        amountCents,
        form,
        cartItems,
        utmParams: utmParams ?? {},
      }));

      // TikTok Events API — PlaceAnOrder
      sendTikTokEvent({
        event: "PlaceAnOrder",
        eventId: `order-${transactionId}`,
        value: pixValue,
        form: { email: form.email, phone: phoneClean, firstName: form.firstName, lastName: form.lastName },
        contents: cartItems.map((item: any) => ({
          content_id: String(item.id),
          content_name: item.name,
          quantity: item.quantity,
          price: item.currentPrice,
        })),
        ip,
        userAgent,
      });

      return res.json({
        id: transactionId,
        qrcode: result?.pix?.qrcode ?? result?.data?.pix?.qrcode,
        status: result?.status ?? result?.data?.status,
        amount: amountCents,
      });
    } catch (err: any) {
      console.error("[KorePay]", err.message);
      return res.status(500).json({ error: err.message ?? "Erro ao criar transação PIX" });
    }
  });

  app.get("/api/pix/status/:id", async (req: Request, res: Response) => {
    try {
      const result = await getTransaction(req.params.id);
      const data = result?.data ?? result;
      return res.json({ status: data?.status, id: data?.id });
    } catch (err: any) {
      console.error("[KorePay status]", err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // Called by frontend when polling detects payment approved
  app.post("/api/utmify/approve", async (req: Request, res: Response) => {
    try {
      const { orderId, form, cartItems, amountCents, utmParams } = req.body;
      const pixValue  = amountCents / 100;
      const ip        = (req.headers["x-forwarded-for"] as string)?.split(",")[0] ?? req.ip ?? "";
      const userAgent = req.headers["user-agent"] ?? "";

      await Promise.all([
        notifyUtmify(buildUtmifyPayload({
          orderId: String(orderId),
          status: "approved",
          amountCents,
          form,
          cartItems,
          utmParams: utmParams ?? {},
          approvedDate: new Date().toISOString().replace("T", " ").slice(0, 19),
        })),
        sendTikTokEvent({
          event: "CompletePayment",
          eventId: `paid-${orderId}`,
          value: pixValue,
          form: { email: form.email, phone: form.phone, firstName: form.firstName, lastName: form.lastName },
          contents: cartItems.map((item: any) => ({
            content_id: String(item.id),
            content_name: item.name,
            quantity: item.quantity,
            price: item.currentPrice,
          })),
          ip,
          userAgent,
        }),
      ]);

      return res.json({ ok: true });
    } catch (err: any) {
      console.error("[approve]", err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/pix/webhook", (req: Request, res: Response) => {
    console.log("[KorePay webhook]", JSON.stringify(req.body, null, 2));
    return res.json({ received: true });
  });

  return httpServer;
}
