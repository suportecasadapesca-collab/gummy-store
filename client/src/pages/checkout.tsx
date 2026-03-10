import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import logoImg from "/logo.png";
import { pixelInitiateCheckout, pixelPurchase, pixelCompleteRegistration } from "@/lib/pixel";
import { getUtmParams } from "@/lib/utmify";
import { ChevronRight, Lock, Tag, QrCode, ChevronDown, ChevronUp, Check, Copy, Loader2, AlertCircle } from "lucide-react";

type CartItem = {
  id: number;
  name: string;
  image: string;
  currentPrice: number;
  originalPrice: number;
  quantity: number;
};

function formatPrice(price: number) {
  return price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCpf(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

function formatCep(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 8);
  return d.replace(/(\d{5})(\d)/, "$1-$2");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidCpf(cpf: string) {
  const d = cpf.replace(/\D/g, "");
  return d.length === 11;
}

type FormErrors = Partial<Record<string, string>>;

const SHIPPING_OPTIONS = [
  { id: "standard", label: "Transportadora • 7-12 dias úteis", price: 0, tag: "Grátis" },
  { id: "express", label: "SEDEX • 3-5 dias úteis", price: 24.90, tag: null },
  { id: "express2", label: "PAC • 5-8 dias úteis", price: 14.90, tag: null },
];

const PAID_STATUSES = ["approved", "paid"];

const STEPS = ["Carrinho", "Informações", "Envio", "Pagamento"];

const CHECKOUT_UPSELLS = [
  {
    id: 200,
    name: "Gummy Hair® ZERO - 180 g",
    image: "https://www.gummy.com.br/cdn/shop/files/1_hair_zero.png?v=1761838045&width=600",
    originalPrice: 119.00,
    currentPrice: 89.00,
    discount: 25,
    badge: "MAIS VENDIDO",
  },
  {
    id: 201,
    name: "Gummy® Vinagre de Maçã - 180 g",
    image: "https://www.gummy.com.br/cdn/shop/files/1_acv.png?v=1756320474&width=600",
    originalPrice: 59.00,
    currentPrice: 38.70,
    discount: 34,
    badge: null,
  },
];

const ORDER_BUMP = {
  id: 202,
  name: "Gummy Night® - Sono + Relaxamento 180 g",
  image: "https://www.gummy.com.br/cdn/shop/files/3_night.png?v=1768412856&width=600",
  originalPrice: 89.00,
  currentPrice: 49.00,
  discount: 45,
  description: "Dorme melhor, acorda renovada. Combinação perfeita com Hair!",
};

export default function Checkout() {
  const [, setLocation] = useLocation();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [step, setStep] = useState(1);
  const [orderSummaryOpen, setOrderSummaryOpen] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState("standard");
  const [couponCode, setCouponCode] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [orderBumpAdded, setOrderBumpAdded] = useState(false);
  const [addedUpsells, setAddedUpsells] = useState<Set<number>>(new Set());
  const [transitioning, setTransitioning] = useState(false);

  // PIX state
  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState("");
  const [pixTransactionId, setPixTransactionId] = useState<number | null>(null);
  const [pixQrcode, setPixQrcode] = useState("");
  const [pixStatus, setPixStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState({
    email: "",
    newsletter: false,
    firstName: "",
    lastName: "",
    cpf: "",
    address: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    cep: "",
    phone: "",
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("gummy_cart");
      if (saved) {
        const items: CartItem[] = JSON.parse(saved);
        setCartItems(items);
        const total = items.reduce((s, i) => s + i.currentPrice * i.quantity, 0);
        pixelInitiateCheckout({ value: total, num_items: items.reduce((s, i) => s + i.quantity, 0) });
      }
    } catch {
      setCartItems([]);
    }
  }, []);

  // Poll PIX status
  useEffect(() => {
    if (!pixTransactionId || PAID_STATUSES.includes(pixStatus)) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/pix/status/${pixTransactionId}`);
        const data = await res.json();
        if (data.status) setPixStatus(data.status);
        if (PAID_STATUSES.includes(data.status)) {
          clearInterval(pollRef.current!);
          const pixValue = cartItems.reduce((s, i) => s + i.currentPrice * i.quantity, 0) * 0.95;
          pixelPurchase({ value: pixValue });
          fetch("/api/utmify/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: pixTransactionId,
              form,
              cartItems,
              amountCents: Math.round(pixValue * 100),
              utmParams: getUtmParams(),
            }),
          }).catch(() => {});
          setTimeout(() => {
            setOrderPlaced(true);
            localStorage.removeItem("gummy_cart");
          }, 1200);
        }
      } catch {
        // keep polling
      }
    }, 3000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pixTransactionId, pixStatus]);

  const shippingCost = SHIPPING_OPTIONS.find((s) => s.id === selectedShipping)?.price ?? 0;
  const subtotal = cartItems.reduce((s, i) => s + i.currentPrice * i.quantity, 0);
  const total = subtotal + shippingCost;
  const pixTotal = total * 0.95;
  const originalTotal = cartItems.reduce((s, i) => s + i.originalPrice * i.quantity, 0);
  const savings = originalTotal - subtotal;

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // Clear error on change
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });

    if (name === "cpf") { setForm((prev) => ({ ...prev, cpf: formatCpf(value) })); return; }
    if (name === "phone") { setForm((prev) => ({ ...prev, phone: formatPhone(value) })); return; }
    if (name === "cep") { setForm((prev) => ({ ...prev, cep: formatCep(value) })); return; }

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const validateStep1 = (): boolean => {
    const e: FormErrors = {};
    if (!form.email) e.email = "E-mail obrigatório";
    else if (!isValidEmail(form.email)) e.email = "E-mail inválido";
    if (!form.firstName.trim()) e.firstName = "Nome obrigatório";
    if (!form.lastName.trim()) e.lastName = "Sobrenome obrigatório";
    if (!form.cpf) e.cpf = "CPF obrigatório";
    else if (!isValidCpf(form.cpf)) e.cpf = "CPF incompleto (11 dígitos)";
    if (!form.cep || form.cep.replace(/\D/g, "").length < 8) e.cep = "CEP inválido";
    if (!form.address.trim()) e.address = "Endereço obrigatório";
    if (!form.number.trim()) e.number = "Número obrigatório";
    if (!form.neighborhood.trim()) e.neighborhood = "Bairro obrigatório";
    if (!form.city.trim()) e.city = "Cidade obrigatória";
    if (!form.state) e.state = "Selecione o estado";
    if (!form.phone || form.phone.replace(/\D/g, "").length < 10) e.phone = "Telefone inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const inputClass = (field: string) =>
    `w-full border rounded-lg px-4 py-3 text-sm focus:outline-none bg-white transition-colors ${
      errors[field]
        ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-400"
        : "border-gray-300 focus:border-[#E31C79] focus:ring-1 focus:ring-[#E31C79]"
    }`;

  const fieldError = (field: string) =>
    errors[field] ? <p className="text-xs text-red-500 mt-1">{errors[field]}</p> : null;

  const goToStep = (n: number) => {
    setTransitioning(true);
    setTimeout(() => {
      setStep(n);
      window.scrollTo({ top: 0, behavior: "instant" });
      setTransitioning(false);
    }, 1500);
  };

  const addUpsellToCart = (upsell: { id: number; name: string; image: string; originalPrice: number; currentPrice: number }) => {
    setCartItems((prev) => {
      const exists = prev.find((i) => i.id === upsell.id);
      if (exists) return prev;
      return [...prev, { ...upsell, quantity: 1 }];
    });
    setAddedUpsells((prev) => new Set(prev).add(upsell.id));
  };

  const toggleOrderBump = () => {
    if (!orderBumpAdded) {
      addUpsellToCart(ORDER_BUMP);
      setOrderBumpAdded(true);
    } else {
      setCartItems((prev) => prev.filter((i) => i.id !== ORDER_BUMP.id));
      setOrderBumpAdded(false);
    }
  };

  const handleCreatePix = async () => {
    setPixLoading(true);
    setPixError("");
    try {
      const utmParams = getUtmParams();
      const res = await fetch("/api/pix/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form, cartItems, shippingCost, total, utmParams }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar PIX");
      setPixTransactionId(data.id);
      setPixQrcode(data.qrcode);
      setPixStatus(data.status ?? "waiting_payment");
      setOrderNumber(`GUM${data.id}`);
    } catch (err: any) {
      setPixError(err.message ?? "Não foi possível gerar o PIX. Tente novamente.");
    } finally {
      setPixLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(pixQrcode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const qrImageUrl = pixQrcode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(pixQrcode)}`
    : null;

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-[#f6f6f6] flex flex-col items-center justify-center px-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <img src={logoImg} alt="Gummy" className="h-12 mb-8" />
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#E31C79" }}>
            <Check size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-[#232323] mb-2">Pedido confirmado!</h1>
          <p className="text-gray-500 text-sm mb-6">
            Seu pagamento PIX foi aprovado. Você receberá um e-mail de confirmação em breve.
          </p>
          <p className="text-xs text-gray-400 mb-6">
            Número do pedido: <span className="font-bold text-[#232323]">#{orderNumber}</span>
          </p>
          <button
            onClick={() => setLocation("/")}
            className="w-full py-3 rounded-full text-white font-black text-sm"
            style={{ backgroundColor: "#E31C79" }}
          >
            Continuar comprando
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f6f6]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Step transition overlay */}
      {transitioning && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-5">
          <img src={logoImg} alt="Gummy" className="h-12 opacity-90" />
          <div className="flex gap-2">
            <span className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: "#E31C79", animationDelay: "0ms" }} />
            <span className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: "#E31C79", animationDelay: "150ms" }} />
            <span className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: "#E31C79", animationDelay: "300ms" }} />
          </div>
          <p className="text-xs text-gray-400 font-medium">Aguarde um momento…</p>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" onClick={(e) => { e.preventDefault(); setLocation("/"); }}>
            <img src={logoImg} alt="Gummy" className="h-10 w-auto" />
          </a>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Lock size={12} />
            <span>Compra segura</span>
          </div>
        </div>
      </header>

      {/* Mobile order summary toggle */}
      <button
        data-testid="btn-mobile-summary-toggle"
        className="w-full flex items-center justify-between px-4 py-3 bg-[#fafafa] border-b border-gray-200 lg:hidden"
        onClick={() => setOrderSummaryOpen(!orderSummaryOpen)}
      >
        <div className="flex items-center gap-2 text-[#E31C79] font-semibold text-sm">
          {orderSummaryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span>Mostrar resumo do pedido</span>
        </div>
        <span className="font-black text-[#232323] text-sm">R$ {formatPrice(pixTotal)}</span>
      </button>

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 sm:py-8 flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* LEFT: Form */}
        <div className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-xs text-gray-400 mb-6 flex-wrap">
            {STEPS.map((s, i) => (
              <span key={s} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={10} />}
                <span
                  className={`font-semibold ${i === step ? "text-[#232323]" : i < step ? "text-[#E31C79] cursor-pointer hover:underline" : "text-gray-400"}`}
                  onClick={() => { if (i < step && i > 0) goToStep(i); }}
                >
                  {s}
                </span>
              </span>
            ))}
          </nav>

          {/* Step 1: Information */}
          {step === 1 && (
            <div data-testid="step-information">
              <h2 className="text-base font-black text-[#232323] mb-4">Contato</h2>
              <div className="space-y-3 mb-6">
                <div>
                  <input
                    data-testid="input-email"
                    name="email"
                    type="email"
                    placeholder="E-mail *"
                    value={form.email}
                    onChange={handleFormChange}
                    className={inputClass("email")}
                  />
                  {fieldError("email")}
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    name="newsletter"
                    checked={form.newsletter}
                    onChange={handleFormChange}
                    className="accent-[#E31C79]"
                  />
                  Quero receber novidades e promoções por e-mail
                </label>
              </div>

              <h2 className="text-base font-black text-[#232323] mb-4">Dados pessoais</h2>
              <div className="space-y-3 mb-6">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      data-testid="input-firstname"
                      name="firstName"
                      placeholder="Nome *"
                      value={form.firstName}
                      onChange={handleFormChange}
                      className={inputClass("firstName")}
                    />
                    {fieldError("firstName")}
                  </div>
                  <div>
                    <input
                      data-testid="input-lastname"
                      name="lastName"
                      placeholder="Sobrenome *"
                      value={form.lastName}
                      onChange={handleFormChange}
                      className={inputClass("lastName")}
                    />
                    {fieldError("lastName")}
                  </div>
                </div>
                <div>
                  <input
                    data-testid="input-cpf"
                    name="cpf"
                    placeholder="CPF * (000.000.000-00)"
                    value={form.cpf}
                    onChange={handleFormChange}
                    maxLength={14}
                    className={inputClass("cpf")}
                  />
                  {fieldError("cpf")}
                </div>
                <div>
                  <input
                    data-testid="input-phone"
                    name="phone"
                    placeholder="Telefone * (00) 00000-0000"
                    value={form.phone}
                    onChange={handleFormChange}
                    maxLength={15}
                    className={inputClass("phone")}
                  />
                  {fieldError("phone")}
                </div>
              </div>

              <h2 className="text-base font-black text-[#232323] mb-4">Endereço de entrega</h2>
              <div className="space-y-3">
                <div>
                  <input
                    data-testid="input-cep"
                    name="cep"
                    placeholder="CEP * (00000-000)"
                    value={form.cep}
                    onChange={handleFormChange}
                    maxLength={9}
                    className={inputClass("cep")}
                  />
                  {fieldError("cep")}
                </div>
                <div>
                  <input
                    data-testid="input-address"
                    name="address"
                    placeholder="Endereço *"
                    value={form.address}
                    onChange={handleFormChange}
                    className={inputClass("address")}
                  />
                  {fieldError("address")}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <input
                      name="number"
                      placeholder="Número *"
                      value={form.number}
                      onChange={handleFormChange}
                      className={inputClass("number")}
                    />
                    {fieldError("number")}
                  </div>
                  <div className="col-span-2">
                    <input
                      name="complement"
                      placeholder="Complemento (opcional)"
                      value={form.complement}
                      onChange={handleFormChange}
                      className={inputClass("complement")}
                    />
                  </div>
                </div>
                <div>
                  <input
                    name="neighborhood"
                    placeholder="Bairro *"
                    value={form.neighborhood}
                    onChange={handleFormChange}
                    className={inputClass("neighborhood")}
                  />
                  {fieldError("neighborhood")}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <input
                      name="city"
                      placeholder="Cidade *"
                      value={form.city}
                      onChange={handleFormChange}
                      className={inputClass("city")}
                    />
                    {fieldError("city")}
                  </div>
                  <div>
                    <select
                      name="state"
                      value={form.state}
                      onChange={handleFormChange}
                      className={`w-full border rounded-lg px-3 py-3 text-sm focus:outline-none bg-white transition-colors ${errors.state ? "border-red-400 focus:border-red-500" : "border-gray-300 focus:border-[#E31C79]"} ${!form.state ? "text-gray-400" : "text-[#232323]"}`}
                    >
                      <option value="">UF *</option>
                      {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                    {fieldError("state")}
                  </div>
                </div>
              </div>

              {Object.keys(errors).length > 0 && (
                <div className="flex items-center gap-2 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  Preencha todos os campos obrigatórios antes de continuar.
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between mt-6 gap-3">
                <a href="/" onClick={(e) => { e.preventDefault(); setLocation("/"); }} className="text-[#E31C79] text-sm hover:underline flex items-center justify-center sm:justify-start gap-1">
                  ← Retornar ao carrinho
                </a>
                <button
                  data-testid="btn-continue-shipping"
                  onClick={() => { if (validateStep1()) { pixelCompleteRegistration(); goToStep(2); } }}
                  className="w-full sm:w-auto px-8 py-3 rounded-full text-white font-black text-sm hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#E31C79" }}
                >
                  Continuar para envio
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Shipping */}
          {step === 2 && (
            <div data-testid="step-shipping">
              <div className="bg-white border border-gray-200 rounded-xl mb-4 divide-y divide-gray-100 text-sm">
                <div className="flex items-center justify-between px-4 py-3 gap-2">
                  <div className="flex gap-2 min-w-0">
                    <span className="text-gray-400 flex-shrink-0">Contato</span>
                    <span className="text-[#232323] font-medium truncate">{form.email || "—"}</span>
                  </div>
                  <button onClick={() => goToStep(1)} className="text-[#E31C79] hover:underline text-xs flex-shrink-0">Alterar</button>
                </div>
                <div className="flex items-center justify-between px-4 py-3 gap-2">
                  <div className="flex gap-2 min-w-0">
                    <span className="text-gray-400 flex-shrink-0">Envio</span>
                    <span className="text-[#232323] font-medium truncate">{[form.address, form.number, form.city, form.state].filter(Boolean).join(", ") || "—"}</span>
                  </div>
                  <button onClick={() => goToStep(1)} className="text-[#E31C79] hover:underline text-xs flex-shrink-0">Alterar</button>
                </div>
              </div>

              <h2 className="text-base font-black text-[#232323] mb-4">Método de envio</h2>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
                {SHIPPING_OPTIONS.map((opt, i) => (
                  <label
                    key={opt.id}
                    data-testid={`shipping-${opt.id}`}
                    className={`flex items-center justify-between px-4 py-4 cursor-pointer transition-colors hover:bg-pink-50 ${i < SHIPPING_OPTIONS.length - 1 ? "border-b border-gray-100" : ""} ${selectedShipping === opt.id ? "bg-pink-50" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedShipping === opt.id ? "border-[#E31C79]" : "border-gray-300"}`}>
                        {selectedShipping === opt.id && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#E31C79" }} />}
                      </div>
                      <input type="radio" name="shipping" value={opt.id} checked={selectedShipping === opt.id} onChange={() => setSelectedShipping(opt.id)} className="sr-only" />
                      <span className="text-sm text-[#232323]">{opt.label}</span>
                    </div>
                    {opt.tag ? (
                      <span className="text-sm font-bold text-green-600">{opt.tag}</span>
                    ) : (
                      <span className="text-sm font-bold text-[#232323]">R$ {formatPrice(opt.price)}</span>
                    )}
                  </label>
                ))}
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                <button onClick={() => goToStep(1)} className="text-[#E31C79] text-sm hover:underline flex items-center justify-center sm:justify-start gap-1">
                  ← Retornar às informações
                </button>
                <button
                  data-testid="btn-continue-payment"
                  onClick={() => goToStep(3)}
                  className="w-full sm:w-auto px-8 py-3 rounded-full text-white font-black text-sm hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#E31C79" }}
                >
                  Continuar para pagamento
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div data-testid="step-payment">
              {/* Summaries */}
              <div className="bg-white border border-gray-200 rounded-xl mb-4 divide-y divide-gray-100 text-sm">
                <div className="flex items-center justify-between px-4 py-3 gap-2">
                  <div className="flex gap-2 min-w-0">
                    <span className="text-gray-400 flex-shrink-0">Contato</span>
                    <span className="text-[#232323] font-medium truncate">{form.email || "—"}</span>
                  </div>
                  <button onClick={() => goToStep(1)} className="text-[#E31C79] hover:underline text-xs flex-shrink-0">Alterar</button>
                </div>
                <div className="flex items-center justify-between px-4 py-3 gap-2">
                  <div className="flex gap-2 min-w-0">
                    <span className="text-gray-400 flex-shrink-0">Endereço</span>
                    <span className="text-[#232323] font-medium truncate">{[form.address, form.number, form.city, form.state].filter(Boolean).join(", ") || "—"}</span>
                  </div>
                  <button onClick={() => goToStep(1)} className="text-[#E31C79] hover:underline text-xs flex-shrink-0">Alterar</button>
                </div>
                <div className="flex items-center justify-between px-4 py-3 gap-2">
                  <div className="flex gap-2 min-w-0">
                    <span className="text-gray-400 flex-shrink-0">Envio</span>
                    <span className="text-[#232323] font-medium truncate">{SHIPPING_OPTIONS.find((s) => s.id === selectedShipping)?.label.split(" •")[0]}</span>
                  </div>
                  <button onClick={() => goToStep(2)} className="text-[#E31C79] hover:underline text-xs flex-shrink-0">Alterar</button>
                </div>
              </div>

              {/* Order Bump */}
              {!pixQrcode && (
                <button
                  data-testid="btn-order-bump"
                  onClick={toggleOrderBump}
                  className={`w-full text-left mb-4 rounded-2xl border-2 p-4 transition-all ${
                    orderBumpAdded
                      ? "border-green-500 bg-green-50"
                      : "border-dashed border-[#E31C79] bg-[#fff8fb] hover:bg-[#ffeef7]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center mt-0.5 ${orderBumpAdded ? "border-green-500 bg-green-500" : "border-[#E31C79]"}`}>
                      {orderBumpAdded && <Check size={14} className="text-white" />}
                    </div>
                    <img
                      src={ORDER_BUMP.image}
                      alt={ORDER_BUMP.name}
                      className="w-16 h-16 object-contain bg-[#FFEDF4] rounded-xl p-1 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-black bg-[#E31C79] text-white px-2 py-0.5 rounded-full">
                          OFERTA EXCLUSIVA -{ORDER_BUMP.discount}%
                        </span>
                        <span className="text-[10px] font-black bg-amber-400 text-white px-2 py-0.5 rounded-full">
                          SÓ NESTE PEDIDO
                        </span>
                      </div>
                      <p className="text-sm font-black text-[#232323] leading-tight">{ORDER_BUMP.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{ORDER_BUMP.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-gray-400 line-through">R$ {formatPrice(ORDER_BUMP.originalPrice)}</span>
                        <span className="text-lg font-black text-[#E31C79]">R$ {formatPrice(ORDER_BUMP.currentPrice)}</span>
                      </div>
                    </div>
                  </div>
                  <p className={`text-xs font-bold text-center mt-3 py-1.5 rounded-full ${orderBumpAdded ? "bg-green-500 text-white" : "bg-[#E31C79] text-white"}`}>
                    {orderBumpAdded ? "✓ Adicionado ao pedido!" : "✔ Sim! Quero adicionar ao meu pedido com desconto"}
                  </p>
                </button>
              )}

              <h2 className="text-base font-black text-[#232323] mb-1">Pagamento via Pix</h2>
              <p className="text-xs text-gray-500 mb-4">Todas as transações são seguras e criptografadas.</p>

              {/* Error */}
              {pixError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{pixError}</span>
                </div>
              )}

              {/* QR Code — shown after PIX creation */}
              {pixQrcode ? (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6" data-testid="pix-qrcode-block">
                  <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border-b border-green-100">
                    <QrCode size={16} className="text-green-600" />
                    <span className="text-sm font-bold text-green-700">PIX gerado com sucesso!</span>
                    {PAID_STATUSES.includes(pixStatus) ? (
                      <span className="ml-auto text-xs font-black bg-green-600 text-white px-2 py-0.5 rounded-full">Pago ✓</span>
                    ) : (
                      <span className="ml-auto text-xs text-green-600 font-semibold animate-pulse">Aguardando pagamento…</span>
                    )}
                  </div>
                  <div className="p-5 text-center">
                    {qrImageUrl && (
                      <img
                        src={qrImageUrl}
                        alt="QR Code PIX"
                        data-testid="img-pix-qrcode"
                        className="w-48 h-48 mx-auto mb-4 rounded-xl border border-gray-200"
                      />
                    )}
                    <p className="text-sm font-bold text-[#232323] mb-1">Escaneie com o app do seu banco</p>
                    <p className="text-xs text-gray-500 mb-4">Ou copie o código abaixo para pagar com Pix Copia e Cola</p>

                    {/* Copy-paste */}
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-4">
                      <p
                        data-testid="text-pix-code"
                        className="flex-1 text-xs text-gray-600 font-mono truncate text-left"
                      >
                        {pixQrcode}
                      </p>
                      <button
                        data-testid="btn-copy-pix"
                        onClick={handleCopy}
                        className="flex items-center gap-1 text-xs font-bold text-white px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors"
                        style={{ backgroundColor: copied ? "#16a34a" : "#E31C79" }}
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? "Copiado!" : "Copiar"}
                      </button>
                    </div>

                    <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                      <p className="text-xs font-bold text-green-700">
                        Total Pix (5% OFF): <span className="text-base">R$ {formatPrice(pixTotal)}</span>
                      </p>
                      <p className="text-xs text-green-600 mt-0.5">Você economizou R$ {formatPrice(total * 0.05)} com Pix!</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Pre-generation preview */
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6" data-testid="payment-pix">
                  <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 bg-green-50">
                    <div className="w-4 h-4 rounded-full border-2 border-green-600 flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-green-600" />
                    </div>
                    <QrCode size={18} className="text-green-600" />
                    <span className="text-sm font-bold text-green-700">Pix</span>
                    <span className="ml-auto bg-green-600 text-white text-xs font-black px-2 py-0.5 rounded-full">5% OFF</span>
                  </div>
                  <div className="p-5 text-center">
                    <div className="w-36 h-36 mx-auto mb-4 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                      <QrCode size={60} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-bold text-[#232323] mb-1">Pague com Pix</p>
                    <p className="text-xs text-gray-500 mb-4">Clique em "Gerar PIX" para criar seu QR Code. Aprovação em até 1 minuto.</p>
                    <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                      <p className="text-xs font-bold text-green-700">Total com Pix: <span className="text-base">R$ {formatPrice(pixTotal)}</span></p>
                      <p className="text-xs text-green-600 mt-0.5">Você economiza R$ {formatPrice(total * 0.05)} com Pix!</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between mt-2 gap-3">
                {!pixQrcode && (
                  <button onClick={() => goToStep(2)} className="text-[#E31C79] text-sm hover:underline flex items-center justify-center sm:justify-start gap-1">
                    ← Retornar ao envio
                  </button>
                )}
                {!pixQrcode ? (
                  <button
                    data-testid="btn-place-order"
                    onClick={handleCreatePix}
                    disabled={pixLoading}
                    className="w-full sm:w-auto sm:ml-auto px-8 py-3 rounded-full text-white font-black text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ backgroundColor: "#E31C79" }}
                  >
                    {pixLoading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Gerando PIX…
                      </>
                    ) : (
                      <>
                        <Lock size={14} />
                        Gerar PIX e Finalizar
                      </>
                    )}
                  </button>
                ) : !PAID_STATUSES.includes(pixStatus) ? (
                  <div className="w-full text-center py-3 rounded-full border-2 border-green-200 bg-green-50 text-green-700 font-bold text-sm flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Aguardando confirmação do pagamento…
                  </div>
                ) : (
                  <div className="w-full text-center py-3 rounded-full bg-green-600 text-white font-black text-sm flex items-center justify-center gap-2">
                    <Check size={16} />
                    Pagamento confirmado! Redirecionando…
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Order summary */}
        <div className={`lg:w-[380px] flex-shrink-0 ${!orderSummaryOpen ? "hidden lg:block" : "block"}`}>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden sticky top-6">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-black text-sm text-[#232323] mb-4">Resumo do pedido</h3>
              {cartItems.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum produto no carrinho.</p>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} data-testid={`checkout-item-${item.id}`} className="flex gap-3">
                      <div className="relative flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-14 h-14 object-contain bg-[#FFEDF4] rounded-xl p-1"
                          onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/56x56/FFEDF4/E31C79?text=G"; }}
                        />
                        <span
                          className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
                          style={{ backgroundColor: "#E31C79" }}
                        >
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#232323] line-clamp-2 leading-tight">{item.name}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {item.originalPrice !== item.currentPrice && (
                          <p className="text-xs text-gray-400 line-through">R$ {formatPrice(item.originalPrice * item.quantity)}</p>
                        )}
                        <p className="text-sm font-black text-[#232323]">R$ {formatPrice(item.currentPrice * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Coupon */}
            <div className="px-5 py-4 border-b border-gray-100">
              <button
                data-testid="btn-toggle-coupon"
                onClick={() => setCouponOpen(!couponOpen)}
                className="flex items-center gap-2 text-sm text-[#E31C79] font-semibold hover:underline"
              >
                <Tag size={14} />
                Adicionar código de desconto
              </button>
              {couponOpen && (
                <div className="flex gap-2 mt-3">
                  <input
                    data-testid="input-coupon"
                    placeholder="Código de desconto"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E31C79]"
                  />
                  <button
                    data-testid="btn-apply-coupon"
                    className="px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90"
                    style={{ backgroundColor: "#E31C79" }}
                  >
                    Aplicar
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar Upsells */}
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-xs font-black text-[#232323] mb-3 uppercase tracking-wide">⚡ Adicione com desconto exclusivo</p>
              <div className="space-y-3">
                {CHECKOUT_UPSELLS.filter((u) => !cartItems.find((c) => c.id === u.id)).map((upsell) => (
                  <div
                    key={upsell.id}
                    data-testid={`upsell-card-${upsell.id}`}
                    className="flex items-center gap-3 bg-[#fff8fb] border border-[#ffd6ea] rounded-xl p-3"
                  >
                    <img
                      src={upsell.image}
                      alt={upsell.name}
                      className="w-14 h-14 object-contain bg-[#FFEDF4] rounded-lg p-1 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      {upsell.badge && (
                        <span className="inline-block text-[10px] font-black bg-[#E31C79] text-white px-1.5 py-0.5 rounded-full mb-1">
                          {upsell.badge}
                        </span>
                      )}
                      <p className="text-xs font-bold text-[#232323] leading-tight line-clamp-2">{upsell.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs text-gray-400 line-through">R$ {formatPrice(upsell.originalPrice)}</span>
                        <span className="text-sm font-black text-[#E31C79]">R$ {formatPrice(upsell.currentPrice)}</span>
                        <span className="text-[10px] font-black bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">-{upsell.discount}%</span>
                      </div>
                    </div>
                    <button
                      data-testid={`btn-add-upsell-${upsell.id}`}
                      onClick={() => addUpsellToCart(upsell)}
                      className="flex-shrink-0 text-xs font-black text-white px-3 py-2 rounded-full hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: "#E31C79" }}
                    >
                      + Adicionar
                    </button>
                  </div>
                ))}
                {CHECKOUT_UPSELLS.every((u) => cartItems.find((c) => c.id === u.id)) && (
                  <p className="text-xs text-green-600 font-semibold text-center py-1">✓ Todos os itens adicionados!</p>
                )}
              </div>
            </div>

            {/* Totals */}
            <div className="px-5 py-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span className="text-[#232323] font-semibold">R$ {formatPrice(subtotal)}</span>
              </div>
              {savings > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Você economizou</span>
                  <span className="font-bold">− R$ {formatPrice(savings)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-500">
                <span>Frete</span>
                {shippingCost === 0 ? (
                  <span className="text-green-600 font-semibold">Grátis</span>
                ) : (
                  <span className="text-[#232323] font-semibold">R$ {formatPrice(shippingCost)}</span>
                )}
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Desconto Pix (5%)</span>
                <span className="font-bold">− R$ {formatPrice(total * 0.05)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-100">
                <span className="font-black text-[#232323]">Total Pix</span>
                <div className="text-right">
                  <p className="font-black text-xl text-[#232323]">R$ {formatPrice(pixTotal)}</p>
                  <p className="text-xs text-gray-400">aprovação em até 1 min</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center py-6 text-xs text-gray-400 border-t border-gray-200 mt-8">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="#" className="hover:text-[#E31C79]">Política de Privacidade</a>
          <a href="#" className="hover:text-[#E31C79]">Termos de Uso</a>
          <a href="#" className="hover:text-[#E31C79]">Política de Reembolso</a>
        </div>
      </footer>
    </div>
  );
}
