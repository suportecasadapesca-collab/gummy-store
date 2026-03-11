import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import logoImg from "/logo.png";
import { pixelViewContent, pixelAddToCart } from "@/lib/pixel";
import { Search, Bell, User, Heart, ShoppingCart, ChevronRight, ChevronLeft, Star, Truck, Shield, Award, Instagram, Menu, X, Play, Minus, Plus, Tag, MapPin, Lock } from "lucide-react";

type CartItem = {
  id: number;
  name: string;
  image: string;
  currentPrice: number;
  originalPrice: number;
  quantity: number;
};

const FREE_SHIPPING_THRESHOLD = 50;

const UPSELL_PRODUCT = {
  id: 9,
  name: "1 – Gummy Hair® ZERO - 180 g",
  image: "https://www.gummy.com.br/cdn/shop/files/1_hair_zero.png?v=1761838045&width=600",
  originalPrice: 129.00,
  currentPrice: 62.30,
  discountPct: 31,
};

function CartDrawer({ items, onClose, onUpdate, onRemove, onAddUpsell, onCheckout }: {
  items: CartItem[];
  onClose: () => void;
  onUpdate: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
  onAddUpsell: () => void;
  onCheckout: () => void;
}) {
  const total = items.reduce((s, i) => s + i.currentPrice * i.quantity, 0);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - total);
  const progress = Math.min(100, (total / FREE_SHIPPING_THRESHOLD) * 100);
  const upsellAlreadyAdded = items.some((i) => i.id === UPSELL_PRODUCT.id);

  return (
    <>
      <div
        data-testid="cart-overlay"
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <div
        data-testid="cart-drawer"
        className="fixed right-0 top-0 h-full w-full max-w-[400px] bg-white z-50 flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-black text-lg text-[#232323]">Seu carrinho</h2>
          <button
            data-testid="btn-close-cart"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Free shipping bar */}
          <div className="px-5 pt-4 pb-3">
            {remaining === 0 ? (
              <p className="text-sm font-bold text-[#E31C79] mb-2">Você qualifica-se para frete grátis! 🎉</p>
            ) : (
              <p className="text-sm font-semibold text-[#232323] mb-2">
                Falta <span className="text-[#E31C79] font-black">R$ {formatPrice(remaining)}</span> para frete grátis!
              </p>
            )}
            <div className="w-full bg-pink-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, backgroundColor: "#E31C79" }}
              />
            </div>
            {remaining === 0 && (
              <div className="flex justify-end mt-1">
                <Heart size={14} fill="#E31C79" className="text-[#E31C79]" />
              </div>
            )}
          </div>

          {/* Cart items */}
          <div className="px-5 flex flex-col gap-4">
            {items.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">Seu carrinho está vazio</p>
            ) : (
              items.map((item) => (
                <div key={item.id} data-testid={`cart-item-${item.id}`} className="flex gap-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-contain bg-[#FFEDF4] rounded-xl flex-shrink-0 p-1"
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/64x64/FFEDF4/E31C79?text=G"; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-semibold text-[#232323] leading-tight line-clamp-2">{item.name}</p>
                      <button
                        data-testid={`btn-remove-${item.id}`}
                        onClick={() => onRemove(item.id)}
                        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <X size={12} className="text-gray-400" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-gray-200 rounded-full overflow-hidden">
                        <button
                          data-testid={`btn-decrease-${item.id}`}
                          onClick={() => onUpdate(item.id, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                          <Minus size={11} className="text-gray-600" />
                        </button>
                        <span data-testid={`qty-${item.id}`} className="w-7 text-center text-xs font-bold text-[#232323]">{item.quantity}</span>
                        <button
                          data-testid={`btn-increase-${item.id}`}
                          onClick={() => onUpdate(item.id, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                          <Plus size={11} className="text-gray-600" />
                        </button>
                      </div>
                      <div className="text-right">
                        {item.originalPrice !== item.currentPrice && (
                          <p className="text-xs text-gray-400 line-through">R$ {formatPrice(item.originalPrice * item.quantity)}</p>
                        )}
                        <p className="text-sm font-black text-[#E31C79]">R$ {formatPrice(item.currentPrice * item.quantity)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Upsell */}
          {!upsellAlreadyAdded && items.length > 0 && (
            <div className="mx-5 mt-5 rounded-2xl overflow-hidden" style={{ backgroundColor: "#FFEDF4" }}>
              <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: "#E31C79" }}>
                <span className="text-white text-xs font-black">Leve junto com</span>
                <span className="bg-white text-xs font-black px-2 py-0.5 rounded-full" style={{ color: "#E31C79" }}>
                  {UPSELL_PRODUCT.discountPct}% OFF
                </span>
              </div>
              <div className="p-3 flex items-center gap-3">
                <img
                  src={UPSELL_PRODUCT.image}
                  alt={UPSELL_PRODUCT.name}
                  className="w-12 h-12 object-contain flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/48x48/FFEDF4/E31C79?text=G"; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#232323] line-clamp-2">{UPSELL_PRODUCT.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-gray-400 line-through">R$ {formatPrice(UPSELL_PRODUCT.originalPrice)}</span>
                    <span className="text-sm font-black text-[#E31C79]">R$ {formatPrice(UPSELL_PRODUCT.currentPrice)}</span>
                  </div>
                </div>
                <button
                  data-testid="btn-upsell-add"
                  onClick={onAddUpsell}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#E31C79" }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 pt-4 pb-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Tag size={14} />
              <span>Cupom</span>
            </div>
            <button className="text-[#E31C79] font-semibold text-xs flex items-center gap-0.5 hover:underline">
              Inserir código <ChevronRight size={12} />
            </button>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <MapPin size={14} />
              <span>Frete</span>
            </div>
            <button className="text-[#E31C79] font-semibold text-xs flex items-center gap-0.5 hover:underline">
              Calcule seu frete <ChevronRight size={12} />
            </button>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-semibold text-[#232323]">Total:</span>
            <span data-testid="cart-total" className="text-base font-black text-[#232323]">R$ {formatPrice(total)}</span>
          </div>
          <button
            data-testid="btn-checkout"
            onClick={onCheckout}
            className="w-full py-3.5 rounded-full text-white font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#E31C79" }}
          >
            <Lock size={15} />
            FINALIZAR COMPRA
          </button>
          <button
            data-testid="btn-continue-shopping"
            onClick={onClose}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Continuar comprando
          </button>
        </div>
      </div>
    </>
  );
}

const PRODUCTS = {
  ofertas: [
    {
      id: 0,
      name: "Kit Gummy® Hair + Night + ACV",
      image: "/kit-trio-clean.png",
      originalPrice: 447.00,
      currentPrice: 90.93,
      installments: "6x R$ 21,65",
      badge: "70% OFF",
      badgeColor: "#E31C79",
    },
    {
      id: 1,
      name: "6 Gummy® Hair - 180g",
      image: "https://www.gummy.com.br/cdn/shop/files/3_Hair_Tutti-Frutti_3709fbaa-95ae-4e00-bbe1-e098d388a41b.png?v=1756309538&width=600",
      originalPrice: 774.00,
      currentPrice: 162.40,
      installments: "6x R$ 38,67",
      badge: "70% OFF",
      badgeColor: "#E31C79",
    },
    {
      id: 2,
      name: "Kit Gummy® Trio Hair",
      image: "https://www.gummy.com.br/cdn/shop/files/3_Hair_Tutti-Frutti_3709fbaa-95ae-4e00-bbe1-e098d388a41b.png?v=1756309538&width=600",
      originalPrice: 446.00,
      currentPrice: 124.60,
      installments: "6x R$ 29,67",
      badge: "60% OFF",
      badgeColor: "#E31C79",
    },
    {
      id: 3,
      name: "Kit Gummy® Bem-Estar Diário",
      image: "https://www.gummy.com.br/cdn/shop/files/3_acv.png?v=1768412998&width=600",
      originalPrice: 347.00,
      currentPrice: 121.80,
      installments: "6x R$ 29,00",
      badge: "50% OFF",
      badgeColor: "#E31C79",
    },
    {
      id: 4,
      name: "Kit Gummy® Metabolismo e Sono",
      image: "https://www.gummy.com.br/cdn/shop/files/3_night.png?v=1768412856&width=600",
      originalPrice: 387.00,
      currentPrice: 81.20,
      installments: "6x R$ 19,33",
      badge: "70% OFF",
      badgeColor: "#E31C79",
    },
    {
      id: 5,
      name: "Gummy® Hair - Mix Sabores 180g",
      image: "https://www.gummy.com.br/cdn/shop/files/3_Hair_Tutti-Frutti_3709fbaa-95ae-4e00-bbe1-e098d388a41b.png?v=1756309538&width=600",
      originalPrice: 467.00,
      currentPrice: 130.90,
      installments: "6x R$ 31,17",
      badge: "60% OFF",
      badgeColor: "#E31C79",
    },
    {
      id: 6,
      name: "Kit Gummy® Trio Cuidado Completo",
      image: "https://www.gummy.com.br/cdn/shop/files/linha-magic-pink-completa.png?v=1754428077&width=600",
      originalPrice: 337.00,
      currentPrice: 117.60,
      installments: "6x R$ 28,00",
      badge: "50% OFF",
      badgeColor: "#E31C79",
    },
  ],
  cabelo: [
    {
      id: 7,
      name: "Gummy Hair® - Tutti-Frutti 180 g",
      image: "https://www.gummy.com.br/cdn/shop/files/1_hair_tutti_445b93d2-de50-49e3-9d24-ce9e8a0eb11a.png?v=1761846819&width=600",
      originalPrice: 149.00,
      currentPrice: 31.29,
      installments: "6x R$ 7,45",
      badge: "70% OFF",
      badgeColor: "#E31C79",
    },
    {
      id: 8,
      name: "Gummy Hair® - Morango 180 g",
      image: "https://www.gummy.com.br/cdn/shop/files/1_hair_tutti_445b93d2-de50-49e3-9d24-ce9e8a0eb11a.png?v=1761846819&width=600",
      originalPrice: 149.00,
      currentPrice: 41.72,
      installments: "6x R$ 9,93",
      badge: "60% OFF",
      badgeColor: "#E31C79",
    },
    {
      id: 9,
      name: "Gummy Hair® ZERO - 180 g",
      image: "https://www.gummy.com.br/cdn/shop/files/1_hair_zero.png?v=1761838045&width=600",
      originalPrice: 149.00,
      currentPrice: 52.15,
      installments: "6x R$ 12,42",
      badge: "50% OFF",
      badgeColor: "#E31C79",
    },
    {
      id: 10,
      name: "Gummy Hair® - Melancia 180 g",
      image: "https://www.gummy.com.br/cdn/shop/files/1_hair_tutti_445b93d2-de50-49e3-9d24-ce9e8a0eb11a.png?v=1761846819&width=600",
      originalPrice: 149.00,
      currentPrice: 31.29,
      installments: "6x R$ 7,45",
      badge: "70% OFF",
      badgeColor: "#E31C79",
    },
    {
      id: 11,
      name: "6 Gummy® Hair - 180g",
      image: "https://www.gummy.com.br/cdn/shop/files/3_Hair_Tutti-Frutti_3709fbaa-95ae-4e00-bbe1-e098d388a41b.png?v=1756309538&width=600",
      originalPrice: 774.00,
      currentPrice: 217.00,
      installments: "6x R$ 51,67",
      badge: "60% OFF",
      badgeColor: "#E31C79",
    },
    {
      id: 12,
      name: "Kit Gummy® Trio Hair",
      image: "https://www.gummy.com.br/cdn/shop/files/3_Hair_Tutti-Frutti_3709fbaa-95ae-4e00-bbe1-e098d388a41b.png?v=1756309538&width=600",
      originalPrice: 446.00,
      currentPrice: 156.10,
      installments: "6x R$ 37,17",
      badge: "50% OFF",
      badgeColor: "#E31C79",
    },
  ],
  metabolismo: [
    {
      id: 13,
      name: "Gummy® Vinagre de Maçã - 180 g",
      image: "https://www.gummy.com.br/cdn/shop/files/1_acv.png?v=1756320474&width=600",
      originalPrice: 129.00,
      currentPrice: 27.09,
      installments: "6x R$ 6,45",
      badge: "70% OFF",
      badgeColor: "#E31C79",
    },
    {
      id: 14,
      name: "Kit Gummy® Metabolismo e Sono",
      image: "https://www.gummy.com.br/cdn/shop/files/3_acv.png?v=1768412998&width=600",
      originalPrice: 387.00,
      currentPrice: 108.50,
      installments: "6x R$ 25,83",
      badge: "60% OFF",
      badgeColor: "#E31C79",
    },
    {
      id: 15,
      name: "Gummy® Creatina Morango 315g",
      image: "https://www.gummy.com.br/cdn/shop/files/3_acv.png?v=1768412998&width=600",
      originalPrice: 149.00,
      currentPrice: 52.15,
      installments: "6x R$ 12,42",
      badge: "50% OFF",
      badgeColor: "#E31C79",
    },
    {
      id: 16,
      name: "6 Gummy® Vinagre de Maçã - 180 g",
      image: "https://www.gummy.com.br/cdn/shop/files/1_acv.png?v=1756320474&width=600",
      originalPrice: 774.00,
      currentPrice: 162.40,
      installments: "6x R$ 38,67",
      badge: "70% OFF",
      badgeColor: "#E31C79",
    },
    {
      id: 17,
      name: "2 Gummy® Vinagre de Maçã - 180 g",
      image: "https://www.gummy.com.br/cdn/shop/files/1_acv.png?v=1756320474&width=600",
      originalPrice: 238.00,
      currentPrice: 66.50,
      installments: "6x R$ 15,83",
      badge: "60% OFF",
      badgeColor: "#E31C79",
    },
    {
      id: 18,
      name: "Kit Gummy® Bem-Estar Diário",
      image: "https://www.gummy.com.br/cdn/shop/files/3_acv.png?v=1768412998&width=600",
      originalPrice: 347.00,
      currentPrice: 121.80,
      installments: "6x R$ 29,00",
      badge: "50% OFF",
      badgeColor: "#E31C79",
    },
  ],
  sono: [
    {
      id: 19,
      name: "Gummy Night Melatonina® - Framboesa 90 g",
      image: "https://www.gummy.com.br/cdn/shop/files/3_night.png?v=1768412856&width=600",
      originalPrice: 129.00,
      currentPrice: 27.09,
      installments: "6x R$ 6,45",
      badge: "70% OFF",
      badgeColor: "#E31C79",
    },
    {
      id: 20,
      name: "Kit Gummy® Bem-Estar Diário",
      image: "https://www.gummy.com.br/cdn/shop/files/3_night.png?v=1768412856&width=600",
      originalPrice: 347.00,
      currentPrice: 97.30,
      installments: "6x R$ 23,17",
      badge: "60% OFF",
      badgeColor: "#E31C79",
    },
    {
      id: 21,
      name: "Gummy® Vitamina C Tangerina - 120 g",
      image: "https://www.gummy.com.br/cdn/shop/files/3_night.png?v=1768412856&width=600",
      originalPrice: 119.00,
      currentPrice: 41.65,
      installments: "6x R$ 9,92",
      badge: "50% OFF",
      badgeColor: "#E31C79",
    },
    {
      id: 22,
      name: "Gummy® Vitamina D Abacaxi - 90 g",
      image: "https://www.gummy.com.br/cdn/shop/files/3_night.png?v=1768412856&width=600",
      originalPrice: 119.00,
      currentPrice: 24.99,
      installments: "6x R$ 5,95",
      badge: "70% OFF",
      badgeColor: "#E31C79",
    },
    {
      id: 23,
      name: "6 Gummy Vitamina C Tangerina",
      image: "https://www.gummy.com.br/cdn/shop/files/3_night.png?v=1768412856&width=600",
      originalPrice: 714.00,
      currentPrice: 200.20,
      installments: "6x R$ 47,67",
      badge: "60% OFF",
      badgeColor: "#E31C79",
    },
    {
      id: 24,
      name: "6 Gummy Vitamina D Abacaxi",
      image: "https://www.gummy.com.br/cdn/shop/files/3_night.png?v=1768412856&width=600",
      originalPrice: 594.00,
      currentPrice: 207.90,
      installments: "6x R$ 49,50",
      badge: "50% OFF",
      badgeColor: "#E31C79",
    },
  ],
};

const BEST_SELLERS_TABS = {
  "Cabelo & Pele": [
    {
      id: 100,
      name: "Kit Gummy® Hair + Night + ACV",
      image: "/kit-trio-clean.png",
      originalPrice: 447.00,
      currentPrice: 90.93,
      installments: "6x R$ 21,65",
      badge: "70% OFF",
      rating: 4.9,
      reviews: 3241,
    },
    {
      id: 101,
      name: "6 Gummy® Hair - 180g",
      image: "https://www.gummy.com.br/cdn/shop/files/3_Hair_Tutti-Frutti_3709fbaa-95ae-4e00-bbe1-e098d388a41b.png?v=1756309538&width=600",
      originalPrice: 774.00,
      currentPrice: 162.40,
      installments: "6x R$ 38,67",
      badge: "70% OFF",
      rating: 4.9,
      reviews: 2847,
    },
    {
      id: 102,
      name: "Kit Gummy® Trio Hair",
      image: "https://www.gummy.com.br/cdn/shop/files/3_Hair_Tutti-Frutti_3709fbaa-95ae-4e00-bbe1-e098d388a41b.png?v=1756309538&width=600",
      originalPrice: 446.00,
      currentPrice: 124.60,
      installments: "6x R$ 29,67",
      badge: "60% OFF",
      rating: 4.8,
      reviews: 1923,
    },
    {
      id: 103,
      name: "Gummy® Hair - Mix Sabores 180g",
      image: "https://www.gummy.com.br/cdn/shop/files/1_hair_tutti_445b93d2-de50-49e3-9d24-ce9e8a0eb11a.png?v=1761846819&width=600",
      originalPrice: 467.00,
      currentPrice: 163.80,
      installments: "6x R$ 39,00",
      badge: "50% OFF",
      rating: 4.9,
      reviews: 3102,
    },
    {
      id: 104,
      name: "Gummy Hair® - Tutti-Frutti 180 g",
      image: "https://www.gummy.com.br/cdn/shop/files/1_hair_tutti_445b93d2-de50-49e3-9d24-ce9e8a0eb11a.png?v=1761846819&width=600",
      originalPrice: 149.00,
      currentPrice: 31.29,
      installments: "6x R$ 7,45",
      badge: "70% OFF",
      rating: 4.9,
      reviews: 8421,
    },
  ],
  "Metabolismo": [
    {
      id: 201,
      name: "Gummy® Vinagre de Maçã - 180 g",
      image: "https://www.gummy.com.br/cdn/shop/files/1_acv.png?v=1756320474&width=600",
      originalPrice: 129.00,
      currentPrice: 36.12,
      installments: "6x R$ 8,60",
      badge: "60% OFF",
      rating: 4.8,
      reviews: 4521,
    },
    {
      id: 202,
      name: "Kit Gummy® Metabolismo e Sono",
      image: "https://www.gummy.com.br/cdn/shop/files/3_acv.png?v=1768412998&width=600",
      originalPrice: 387.00,
      currentPrice: 135.80,
      installments: "6x R$ 32,33",
      badge: "50% OFF",
      rating: 4.7,
      reviews: 2103,
    },
    {
      id: 203,
      name: "Gummy® Creatina Morango 315g",
      image: "https://www.gummy.com.br/cdn/shop/files/3_acv.png?v=1768412998&width=600",
      originalPrice: 149.00,
      currentPrice: 31.29,
      installments: "6x R$ 7,45",
      badge: "70% OFF",
      rating: 4.6,
      reviews: 987,
    },
    {
      id: 204,
      name: "6 Gummy® Vinagre de Maçã - 180 g",
      image: "https://www.gummy.com.br/cdn/shop/files/1_acv.png?v=1756320474&width=600",
      originalPrice: 774.00,
      currentPrice: 217.00,
      installments: "6x R$ 51,67",
      badge: "60% OFF",
      rating: 4.8,
      reviews: 1756,
    },
  ],
  "Sono & Imunidade": [
    {
      id: 301,
      name: "Gummy Night Melatonina® - Framboesa 90 g",
      image: "https://www.gummy.com.br/cdn/shop/files/3_night.png?v=1768412856&width=600",
      originalPrice: 129.00,
      currentPrice: 27.09,
      installments: "6x R$ 6,45",
      badge: "70% OFF",
      rating: 4.9,
      reviews: 6234,
    },
    {
      id: 302,
      name: "Gummy® Vitamina C Tangerina - 120 g",
      image: "https://www.gummy.com.br/cdn/shop/files/3_night.png?v=1768412856&width=600",
      originalPrice: 119.00,
      currentPrice: 33.32,
      installments: "6x R$ 7,93",
      badge: "60% OFF",
      rating: 4.7,
      reviews: 3421,
    },
    {
      id: 303,
      name: "Gummy® Vitamina D Abacaxi - 90 g",
      image: "https://www.gummy.com.br/cdn/shop/files/3_night.png?v=1768412856&width=600",
      originalPrice: 119.00,
      currentPrice: 41.65,
      installments: "6x R$ 9,92",
      badge: "50% OFF",
      rating: 4.8,
      reviews: 2987,
    },
    {
      id: 304,
      name: "6 Gummy Vitamina C Tangerina",
      image: "https://www.gummy.com.br/cdn/shop/files/3_night.png?v=1768412856&width=600",
      originalPrice: 714.00,
      currentPrice: 149.80,
      installments: "6x R$ 35,67",
      badge: "70% OFF",
      rating: 4.9,
      reviews: 1245,
    },
  ],
  "Hair Care": [
    {
      id: 401,
      name: "Kit Gummy® Tratamento e Proteção Térmica",
      image: "https://www.gummy.com.br/cdn/shop/files/linha-magic-pink-completa.png?v=1754428077&width=600",
      originalPrice: 247.00,
      currentPrice: 69.30,
      installments: "6x R$ 16,50",
      badge: "60% OFF",
      rating: 4.8,
      reviews: 1567,
    },
    {
      id: 402,
      name: "Kit Gummy® Cronograma Capilar",
      image: "https://www.gummy.com.br/cdn/shop/files/linha-magic-pink-completa.png?v=1754428077&width=600",
      originalPrice: 375.00,
      currentPrice: 131.60,
      installments: "6x R$ 31,33",
      badge: "50% OFF",
      rating: 4.7,
      reviews: 892,
    },
    {
      id: 403,
      name: "Gummy® Shampoo Magic Pink 250ml",
      image: "https://www.gummy.com.br/cdn/shop/files/linha-magic-pink-completa.png?v=1754428077&width=600",
      originalPrice: 79.00,
      currentPrice: 16.59,
      installments: "6x R$ 3,95",
      badge: "70% OFF",
      rating: 4.9,
      reviews: 2345,
    },
    {
      id: 404,
      name: "Gummy® Condicionador Magic Pink 250ml",
      image: "https://www.gummy.com.br/cdn/shop/files/linha-magic-pink-completa.png?v=1754428077&width=600",
      originalPrice: 79.00,
      currentPrice: 22.12,
      installments: "6x R$ 5,27",
      badge: "60% OFF",
      rating: 4.8,
      reviews: 1876,
    },
  ],
};

const CATEGORIES = [
  {
    name: "Cabelo & Pele",
    image: "https://www.gummy.com.br/cdn/shop/files/3_Hair_Tutti-Frutti_3709fbaa-95ae-4e00-bbe1-e098d388a41b.png?v=1756309538&width=1200",
    bg: "from-pink-200 to-pink-400",
  },
  {
    name: "Metabolismo",
    image: "https://www.gummy.com.br/cdn/shop/files/3_acv.png?v=1768412998&width=1200",
    bg: "from-red-200 to-red-400",
  },
  {
    name: "Sono e imunidade",
    image: "https://www.gummy.com.br/cdn/shop/files/3_night.png?v=1768412856&width=1200",
    bg: "from-blue-200 to-purple-400",
  },
  {
    name: "Haircare",
    image: "https://www.gummy.com.br/cdn/shop/files/linha-magic-pink-completa.png?v=1754428077&width=1200",
    bg: "from-fuchsia-200 to-fuchsia-400",
  },
];

const UGC_POSTS = [
  {
    id: 1,
    user: "@anny_ferreira10",
    product: "Gummy Hair® ZERO - 180 g",
    productImage: "https://www.gummy.com.br/cdn/shop/files/1_hair_zero.png?v=1761838045&width=100",
    videoUrl: "https://www.gummy.com.br/cdn/shop/videos/c/vp/2e512182a3354cb9a2cb8b4f94a78ad4/2e512182a3354cb9a2cb8b4f94a78ad4.SD-480p-0.9Mbps-45007457.mp4?v=0",
    thumbnail: "https://cdn.pixabay.com/video/2025/06/24/287601_tiny.jpg",
  },
  {
    id: 2,
    user: "@dudaa.guerra",
    product: "Gummy® Vinagre de Maçã - 180 g",
    productImage: "https://www.gummy.com.br/cdn/shop/files/1_acv.png?v=1756320474&width=100",
    videoUrl: "https://www.gummy.com.br/cdn/shop/videos/c/vp/5ad7e92200c545ef8469a42909630f35/5ad7e92200c545ef8469a42909630f35.SD-480p-0.9Mbps-47264563.mp4?v=0",
    thumbnail: "https://cdn.pixabay.com/video/2025/04/08/270861_tiny.jpg",
  },
  {
    id: 3,
    user: "@lucianagimenez",
    product: "Gummy Hair® - Sabores",
    productImage: "https://www.gummy.com.br/cdn/shop/files/1_hair_tutti_445b93d2-de50-49e3-9d24-ce9e8a0eb11a.png?v=1761846819&width=100",
    videoUrl: "https://www.gummy.com.br/cdn/shop/videos/c/vp/4c461be269374e37b8c7db593f7cdddf/4c461be269374e37b8c7db593f7cdddf.HD-1080p-7.2Mbps-45007300.mp4?v=0",
    thumbnail: "https://cdn.pixabay.com/video/2025/01/09/251589_tiny.jpg",
  },
  {
    id: 4,
    user: "@eduardaborgs_",
    product: "Gummy Hair® - Sabores",
    productImage: "https://www.gummy.com.br/cdn/shop/files/1_hair_tutti_445b93d2-de50-49e3-9d24-ce9e8a0eb11a.png?v=1761846819&width=100",
    videoUrl: "https://www.gummy.com.br/cdn/shop/videos/c/vp/a7980c301ae8498dbe0f3cde021384ff/a7980c301ae8498dbe0f3cde021384ff.HD-720p-1.6Mbps-26527005.mp4?v=0",
    thumbnail: "https://cdn.pixabay.com/video/2025/11/03/313710_tiny.jpg",
  },
];

function formatPrice(price: number) {
  return price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function UGCVideoCard({ post, onAddToCart }: { post: typeof UGC_POSTS[0]; onAddToCart: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleClick = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  return (
    <div
      data-testid={`card-ugc-${post.id}`}
      className="group relative rounded-2xl overflow-hidden aspect-[9/16] cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-black"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <video
        ref={videoRef}
        src={post.videoUrl}
        poster={post.thumbnail}
        muted
        loop
        playsInline
        preload="metadata"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 bg-white/25 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/50">
            <Play size={22} className="text-white ml-1" fill="white" />
          </div>
        </div>
      )}
      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
        <Instagram size={10} style={{ color: "#E31C79" }} />
        <span className="text-xs font-bold text-[#232323]">{post.user}</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-center gap-2 mb-2">
          <img
            src={post.productImage}
            alt={post.product}
            className="w-8 h-8 rounded-full bg-white object-contain p-0.5 flex-shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/32x32/FFEDF4/E31C79?text=G"; }}
          />
          <div className="min-w-0">
            <p className="text-white text-xs font-bold truncate">{post.user}</p>
            <p className="text-white/80 text-xs truncate">{post.product}</p>
          </div>
        </div>
        <button
          data-testid={`btn-compra-rapida-${post.id}`}
          className="w-full py-2 text-xs font-black text-white rounded-full transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: "#E31C79" }}
          onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
        >
          COMPRA RÁPIDA
        </button>
      </div>
    </div>
  );
}

function ProductCard({ product, onAddToCart }: { product: typeof PRODUCTS.ofertas[0]; onAddToCart: () => void }) {
  const [wishlist, setWishlist] = useState(false);

  return (
    <div
      data-testid={`card-product-${product.id}`}
      className="group relative bg-white rounded-2xl overflow-hidden flex flex-col cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      style={{ minWidth: 0 }}
    >
      <div className="relative overflow-hidden bg-[#FFEDF4] aspect-square">
        {"kitImages" in product && product.kitImages ? (
          <div className="w-full h-full flex items-end justify-center gap-1 px-2 pb-2 group-hover:scale-105 transition-transform duration-500">
            <img loading="lazy" src={product.kitImages[0]} alt="Hair" className="w-[30%] object-contain drop-shadow-lg" style={{ transform: "rotate(-6deg)", marginBottom: "4%" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <img loading="lazy" src={product.kitImages[1]} alt="ACV" className="w-[36%] object-contain drop-shadow-xl" style={{ marginBottom: "0%" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <img loading="lazy" src={product.kitImages[2]} alt="Night" className="w-[30%] object-contain drop-shadow-lg" style={{ transform: "rotate(6deg)", marginBottom: "4%" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
        ) : (
          <img
            loading="lazy"
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://via.placeholder.com/300x300/FFEDF4/E31C79?text=Gummy";
            }}
          />
        )}
        {product.badge && (
          <span
            className="absolute top-3 left-3 text-white text-xs font-bold px-2 py-1 rounded-full"
            style={{ backgroundColor: "#E31C79" }}
          >
            {product.badge}
          </span>
        )}
        <button
          data-testid={`btn-wishlist-${product.id}`}
          onClick={(e) => { e.stopPropagation(); setWishlist(!wishlist); }}
          className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
        >
          <Heart
            size={14}
            className={wishlist ? "fill-[#E31C79] text-[#E31C79]" : "text-gray-400"}
          />
        </button>
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <h3 className="text-sm font-semibold text-[#232323] line-clamp-2 leading-tight">{product.name}</h3>
        <div className="mt-auto pt-2">
          {product.originalPrice !== product.currentPrice && (
            <p className="text-xs text-gray-400 line-through">
              De: R$ {formatPrice(product.originalPrice)}
            </p>
          )}
          <p className="text-base font-bold text-[#E31C79]">
            R$ {formatPrice(product.currentPrice)}
          </p>
          <p className="text-xs text-gray-500">ou até {product.installments}</p>
        </div>
        <button
          data-testid={`btn-add-cart-${product.id}`}
          className="mt-2 w-full py-2 rounded-full text-xs font-bold text-white transition-all duration-200 hover:opacity-90 hover:shadow-md"
          style={{ backgroundColor: "#E31C79" }}
          onClick={onAddToCart}
        >
          COMPRAR
        </button>
      </div>
    </div>
  );
}

function BestSellerCard({ product, onAddToCart }: { product: typeof BEST_SELLERS_TABS["Cabelo & Pele"][0]; onAddToCart: () => void }) {
  const [wishlist, setWishlist] = useState(false);

  return (
    <div
      data-testid={`card-bestseller-${product.id}`}
      className="group relative bg-white rounded-2xl overflow-hidden flex flex-col cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative overflow-hidden bg-[#FFEDF4] aspect-square">
        {"kitImages" in product && product.kitImages ? (
          <div className="w-full h-full flex items-end justify-center gap-1 px-2 pb-2 group-hover:scale-105 transition-transform duration-500">
            <img loading="lazy" src={product.kitImages[0]} alt="Hair" className="w-[30%] object-contain drop-shadow-lg" style={{ transform: "rotate(-6deg)", marginBottom: "4%" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <img loading="lazy" src={product.kitImages[1]} alt="ACV" className="w-[36%] object-contain drop-shadow-xl" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <img loading="lazy" src={product.kitImages[2]} alt="Night" className="w-[30%] object-contain drop-shadow-lg" style={{ transform: "rotate(6deg)", marginBottom: "4%" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
        ) : (
          <img
            loading="lazy"
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://via.placeholder.com/300x300/FFEDF4/E31C79?text=Gummy";
            }}
          />
        )}
        {product.badge && (
          <span className="absolute top-3 left-3 text-white text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: "#E31C79" }}>
            {product.badge}
          </span>
        )}
        <button
          data-testid={`btn-wishlist-bs-${product.id}`}
          onClick={(e) => { e.stopPropagation(); setWishlist(!wishlist); }}
          className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
        >
          <Heart size={14} className={wishlist ? "fill-[#E31C79] text-[#E31C79]" : "text-gray-400"} />
        </button>
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={10} className={i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} />
          ))}
          <span className="text-xs text-gray-500 ml-1">({product.reviews.toLocaleString("pt-BR")})</span>
        </div>
        <h3 className="text-sm font-semibold text-[#232323] line-clamp-2 leading-tight">{product.name}</h3>
        <div className="mt-auto pt-2">
          {product.originalPrice !== product.currentPrice && (
            <p className="text-xs text-gray-400 line-through">De: R$ {formatPrice(product.originalPrice)}</p>
          )}
          <p className="text-base font-bold text-[#E31C79]">R$ {formatPrice(product.currentPrice)}</p>
          <p className="text-xs text-gray-500">ou até {product.installments}</p>
        </div>
        <button
          data-testid={`btn-add-cart-bs-${product.id}`}
          className="mt-2 w-full py-2 rounded-full text-xs font-bold text-white transition-all duration-200 hover:opacity-90"
          style={{ backgroundColor: "#E31C79" }}
          onClick={onAddToCart}
        >
          COMPRAR
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<keyof typeof PRODUCTS>("ofertas");
  const [activeBSTab, setActiveBSTab] = useState<keyof typeof BEST_SELLERS_TABS>("Cabelo & Pele");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bsScrollRef = useRef<HTMLDivElement>(null);
  const tickerRef = useRef<HTMLDivElement>(null);

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    pixelViewContent({ content_name: "Gummy Store - Home", value: 129.90 });
  }, []);

  const addToCart = (item: Omit<CartItem, "quantity">) => {
    pixelAddToCart({ content_name: item.name, value: item.currentPrice });
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setCartOpen(true);
  };

  const updateCart = (id: number, qty: number) => {
    if (qty <= 0) {
      setCartItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      setCartItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: qty } : i));
    }
  };

  const removeFromCart = (id: number) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  };

  const goToCheckout = () => {
    localStorage.setItem("gummy_cart", JSON.stringify(cartItems));
    setCartOpen(false);
    setLocation("/checkout");
  };

  const tabs = [
    { key: "ofertas", label: "Ofertas🔥" },
    { key: "cabelo", label: "Cabelo & Pele" },
    { key: "metabolismo", label: "Força & Metabolismo" },
    { key: "sono", label: "Sono" },
  ];

  const navLinks = [
    "CABELO, PELE & UNHA",
    "HAIR CARE",
    "FORÇA & METABOLISMO",
    "HUMOR, SAÚDE & SONO",
    "ITENS EXCLUSIVOS",
    "RASTREAR PEDIDO",
  ];

  const scrollProducts = (ref: React.RefObject<HTMLDivElement>, direction: "left" | "right") => {
    if (ref.current) {
      const scrollAmount = 280;
      ref.current.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Announcement Bar */}
      <div
        data-testid="announcement-bar"
        className="text-white text-center py-1.5 sm:py-2 text-[11px] sm:text-sm font-semibold tracking-wide px-2"
        style={{ backgroundColor: "#E31C79" }}
      >
        FRETE GRÁTIS PARA TODO BRASIL A PARTIR DE R$50 🚚
      </div>

      {/* Navbar */}
      <nav
        data-testid="navbar"
        className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <button
                data-testid="btn-mobile-menu"
                className="lg:hidden text-gray-600"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <a href="/" data-testid="link-logo">
                <img src={logoImg} alt="Gummy®" className="h-10 w-auto" />
              </a>
            </div>

            {/* Navigation Links */}
            <div className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link}
                  href="#"
                  data-testid={`link-nav-${link.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  className="text-xs font-semibold text-[#232323] hover:text-[#E31C79] transition-colors whitespace-nowrap tracking-wide"
                >
                  {link}
                </a>
              ))}
            </div>

            {/* Action Icons */}
            <div className="flex items-center gap-3">
              <button
                data-testid="btn-search"
                onClick={() => setSearchOpen(!searchOpen)}
                className="text-gray-600 hover:text-[#E31C79] transition-colors"
              >
                <Search size={20} />
              </button>
              <button
                data-testid="btn-notifications"
                className="text-gray-600 hover:text-[#E31C79] transition-colors hidden sm:block"
              >
                <Bell size={20} />
              </button>
              <button
                data-testid="btn-account"
                className="text-gray-600 hover:text-[#E31C79] transition-colors"
              >
                <User size={20} />
              </button>
              <button
                data-testid="btn-wishlist"
                className="text-gray-600 hover:text-[#E31C79] transition-colors hidden sm:block"
              >
                <Heart size={20} />
              </button>
              <button
                data-testid="btn-cart"
                onClick={() => setCartOpen(true)}
                className="relative text-gray-600 hover:text-[#E31C79] transition-colors"
              >
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span
                    className="absolute -top-2 -right-2 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold"
                    style={{ backgroundColor: "#E31C79" }}
                  >
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {searchOpen && (
            <div className="pb-3 border-t border-gray-100 pt-3">
              <div className="relative max-w-lg mx-auto">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  data-testid="input-search"
                  type="search"
                  placeholder="Pesquisar produtos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-[#E31C79] focus:ring-1 focus:ring-[#E31C79]"
                  autoFocus
                />
                <div className="mt-2 text-xs text-gray-500 px-2">
                  <span className="font-semibold">Mais pesquisados: </span>
                  {["tutti-frutti", "magic pink", "hair care", "sono", "perda de peso"].map((term) => (
                    <button
                      key={term}
                      data-testid={`btn-search-term-${term}`}
                      className="mr-2 hover:text-[#E31C79] hover:underline"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-100 py-3">
              {navLinks.map((link) => (
                <a
                  key={link}
                  href="#"
                  className="block py-2 px-2 text-sm font-semibold text-[#232323] hover:text-[#E31C79] hover:bg-pink-50 rounded-lg transition-colors"
                >
                  {link}
                </a>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Scrolling Ticker */}
      <div
        data-testid="ticker-banner"
        className="overflow-hidden py-2"
        style={{ backgroundColor: "#1a1a2e" }}
      >
        <div
          className="flex gap-6 whitespace-nowrap animate-[ticker_20s_linear_infinite]"
          style={{
            animation: "ticker 20s linear infinite",
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="text-white text-sm font-bold flex items-center gap-2 flex-shrink-0">
              <span className="text-yellow-400">$</span>
              <span>ATÉ 60%OFF</span>
            </span>
          ))}
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={`dup-${i}`} className="text-white text-sm font-bold flex items-center gap-2 flex-shrink-0">
              <span className="text-yellow-400">$</span>
              <span>ATÉ 60%OFF</span>
            </span>
          ))}
        </div>
      </div>

      {/* Hero Banner */}
      <section data-testid="hero-banner" className="w-full">
        <a href="#produtos">
          <img
            src="https://www.gummy.com.br/cdn/shop/files/BANNER_DESK_V1_2.jpg?v=1772630319&width=1370"
            alt="Semana do Consumidor - Até 60% OFF"
            className="w-full h-auto block"
          />
        </a>
      </section>

      {/* Product Filter Tabs + Product Grid */}
      <section id="produtos" className="bg-white pt-6 sm:pt-8 pb-4">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">

          {/* Tabs */}
          <div className="flex gap-1.5 sm:gap-2 flex-wrap mb-5 sm:mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                data-testid={`tab-${tab.key}`}
                onClick={() => setActiveTab(tab.key as keyof typeof PRODUCTS)}
                className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 ${
                  activeTab === tab.key
                    ? "text-white shadow-md"
                    : "bg-gray-100 text-[#232323] hover:bg-gray-200"
                }`}
                style={activeTab === tab.key ? { backgroundColor: "#E31C79" } : {}}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Products carousel */}
          <div className="relative">
            <button
              data-testid="btn-scroll-left-products"
              onClick={() => scrollProducts(scrollRef, "left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all hover:scale-110 hidden md:flex"
            >
              <ChevronLeft size={18} className="text-gray-700" />
            </button>
            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {PRODUCTS[activeTab].map((product) => (
                <div key={product.id} className="flex-shrink-0 w-[155px] sm:w-[200px] lg:w-[220px]">
                  <ProductCard
                    product={product}
                    onAddToCart={() => addToCart({ id: product.id, name: product.name, image: product.image, currentPrice: product.currentPrice, originalPrice: product.originalPrice })}
                  />
                </div>
              ))}
            </div>
            <button
              data-testid="btn-scroll-right-products"
              onClick={() => scrollProducts(scrollRef, "right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all hover:scale-110 hidden md:flex"
            >
              <ChevronRight size={18} className="text-gray-700" />
            </button>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-6 sm:py-8 bg-[#FFEDF4]">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[
              { icon: <Truck size={22} />, title: "Frete Grátis", desc: "A partir de R$50" },
              { icon: <Shield size={22} />, title: "Compra Segura", desc: "Pagamento protegido" },
              { icon: <Award size={22} />, title: "Qualidade Premium", desc: "Vitaminas certificadas" },
              { icon: <Star size={22} />, title: "Melhor Avaliada", desc: "4.9/5 estrelas" },
            ].map((item, i) => (
              <div
                key={i}
                data-testid={`badge-trust-${i}`}
                className="flex items-center gap-2 sm:gap-3 bg-white rounded-2xl p-3 sm:p-4 shadow-sm"
              >
                <div style={{ color: "#E31C79" }} className="flex-shrink-0">{item.icon}</div>
                <div className="min-w-0">
                  <p className="font-bold text-xs sm:text-sm text-[#232323] leading-tight">{item.title}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 leading-tight">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category Grid */}
      <section className="py-8 sm:py-12 bg-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <h2 className="text-xl sm:text-2xl font-black text-[#232323] mb-4 sm:mb-6 text-center">
            Explore nossas <span style={{ color: "#E31C79" }}>categorias</span>
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {CATEGORIES.map((cat) => (
              <a
                key={cat.name}
                href="#"
                data-testid={`card-category-${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="group relative rounded-2xl overflow-hidden aspect-[3/4] bg-gradient-to-b cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`absolute inset-0 bg-gradient-to-b ${cat.bg} opacity-50`} />
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="absolute inset-0 w-full h-full object-contain object-center group-hover:scale-110 transition-transform duration-500"
                  style={{ padding: "10%" }}
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://via.placeholder.com/400x500/FFEDF4/E31C79?text=${cat.name}`; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 flex items-end justify-between">
                  <div>
                    <h3 className="text-white font-black text-sm sm:text-base drop-shadow leading-tight">{cat.name}</h3>
                    <span className="text-white/80 text-[11px] sm:text-xs">Ver Mais →</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Best Sellers */}
      <section
        data-testid="section-best-sellers"
        className="py-8 sm:py-12"
        style={{ backgroundColor: "#FFF5F9" }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <h2 className="text-xl sm:text-2xl font-black text-[#232323] mb-1 sm:mb-2 text-center">
            Mais <span style={{ color: "#E31C79" }}>vendidos</span>
          </h2>
          <p className="text-center text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6">Os favoritos da nossa comunidade</p>

          {/* BS Tabs */}
          <div className="flex gap-1.5 sm:gap-2 justify-center flex-wrap mb-4 sm:mb-6">
            {Object.keys(BEST_SELLERS_TABS).map((tab) => (
              <button
                key={tab}
                data-testid={`tab-bs-${tab.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => setActiveBSTab(tab as keyof typeof BEST_SELLERS_TABS)}
                className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 ${
                  activeBSTab === tab
                    ? "text-white shadow-md"
                    : "bg-gray-100 text-[#232323] hover:bg-gray-200"
                }`}
                style={activeBSTab === tab ? { backgroundColor: "#E31C79" } : {}}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Products */}
          <div className="relative">
            <button
              data-testid="btn-scroll-left-bs"
              onClick={() => scrollProducts(bsScrollRef, "left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all hover:scale-110 hidden md:flex"
            >
              <ChevronLeft size={18} className="text-gray-700" />
            </button>
            <div
              ref={bsScrollRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {BEST_SELLERS_TABS[activeBSTab].map((product) => (
                <div key={product.id} className="flex-shrink-0 w-[155px] sm:w-[200px] lg:w-[220px]">
                  <BestSellerCard
                    product={product}
                    onAddToCart={() => addToCart({ id: product.id, name: product.name, image: product.image, currentPrice: product.currentPrice, originalPrice: product.originalPrice })}
                  />
                </div>
              ))}
            </div>
            <button
              data-testid="btn-scroll-right-bs"
              onClick={() => scrollProducts(bsScrollRef, "right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all hover:scale-110 hidden md:flex"
            >
              <ChevronRight size={18} className="text-gray-700" />
            </button>
          </div>
        </div>
      </section>

      {/* UGC / Instagram Section */}
      <section
        data-testid="section-ugc"
        className="py-8 sm:py-12 bg-white"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Instagram size={20} sm-size={24} style={{ color: "#E31C79" }} />
            <h2 className="text-xl sm:text-2xl font-black text-[#232323]">
              #GummyCommunity
            </h2>
          </div>
          <p className="text-center text-gray-500 text-xs sm:text-sm mb-5 sm:mb-8">Veja quem já transformou sua rotina com Gummy</p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {UGC_POSTS.map((post) => (
              <UGCVideoCard
                key={post.id}
                post={post}
                onAddToCart={() => addToCart({ id: post.id + 200, name: post.product, image: post.productImage, currentPrice: 62.30, originalPrice: 129.00 })}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Why Gummy Banner */}
      <section
        className="py-10 sm:py-16 text-white text-center"
        style={{ background: "linear-gradient(135deg, #E31C79 0%, #c4156a 50%, #9d1157 100%)" }}
      >
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-black mb-3 sm:mb-4">
            Por que escolher a <span className="text-yellow-300">Gummy®</span>?
          </h2>
          <p className="text-white/90 text-sm sm:text-base mb-6 sm:mb-8 max-w-2xl mx-auto">
            A gominha N°1 do Brasil. Vitaminas deliciosas que realmente funcionam, com formulação premium e sabores irresistíveis.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            {[
              { number: "+1M", label: "clientes satisfeitos" },
              { number: "4.9", label: "avaliação média" },
              { number: "60%", label: "OFF em promoções" },
              { number: "N°1", label: "marca no Brasil" },
            ].map((stat, i) => (
              <div key={i} data-testid={`stat-${i}`} className="bg-white/10 rounded-2xl p-3 sm:p-4 backdrop-blur-sm">
                <p className="text-2xl sm:text-3xl font-black text-yellow-300">{stat.number}</p>
                <p className="text-white/80 text-xs sm:text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
          <a
            data-testid="btn-shop-now"
            href="#produtos"
            className="inline-flex items-center gap-2 mt-6 sm:mt-8 bg-white font-black px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-sm sm:text-base transition-all hover:scale-105 hover:shadow-2xl"
            style={{ color: "#E31C79" }}
          >
            COMPRAR AGORA
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer
        data-testid="footer"
        className="bg-[#1a1a2e] text-white pt-8 sm:pt-12 pb-6"
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-8 sm:mb-10">
            {/* Brand */}
            <div>
              <img src={logoImg} alt="Gummy®" className="h-10 w-auto mb-4 brightness-0 invert" />
              <p className="text-gray-400 text-sm leading-relaxed">
                A gominha N°1 do Brasil. Vitaminas e suplementos em formato de goma, deliciosos e eficazes.
              </p>
              <div className="flex gap-3 mt-4">
                {["Instagram", "TikTok", "YouTube", "Facebook"].map((social) => (
                  <a
                    key={social}
                    href="#"
                    data-testid={`link-social-${social.toLowerCase()}`}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white transition-colors hover:opacity-80"
                    style={{ backgroundColor: "#E31C79" }}
                  >
                    {social[0]}
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-bold text-white mb-4">Produtos</h4>
              <ul className="space-y-2">
                {["Cabelo, Pele & Unha", "Hair Care", "Força & Metabolismo", "Humor, Saúde & Sono", "Itens Exclusivos"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 text-sm hover:text-[#E31C79] transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Atendimento</h4>
              <ul className="space-y-2">
                {["Rastrear Pedido", "Dúvidas Frequentes", "Política de Troca", "Política de Privacidade", "Termos de Uso"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 text-sm hover:text-[#E31C79] transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Newsletter</h4>
              <p className="text-gray-400 text-sm mb-3">Receba ofertas exclusivas e novidades!</p>
              <div className="flex gap-2">
                <input
                  data-testid="input-newsletter"
                  type="email"
                  placeholder="Seu e-mail"
                  className="flex-1 px-3 py-2 rounded-full bg-white/10 border border-white/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E31C79]"
                />
                <button
                  data-testid="btn-newsletter-submit"
                  className="px-4 py-2 rounded-full text-white font-bold text-sm hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#E31C79" }}
                >
                  OK
                </button>
              </div>
              <div className="mt-4 space-y-1">
                <p className="text-gray-400 text-xs">Aceitamos</p>
                <div className="flex gap-2 flex-wrap">
                  {["Visa", "Master", "Pix", "Boleto"].map((payment) => (
                    <span
                      key={payment}
                      className="px-2 py-1 bg-white/10 rounded text-xs text-gray-300 font-medium"
                    >
                      {payment}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
            <p className="text-gray-500 text-xs">
              © 2024 Gummy® Original. Todos os direitos reservados.
            </p>
            <p className="text-gray-500 text-xs">
              CNPJ: 00.000.000/0001-00 — São Paulo, SP
            </p>
          </div>
        </div>
      </footer>

      {cartOpen && (
        <CartDrawer
          items={cartItems}
          onClose={() => setCartOpen(false)}
          onUpdate={updateCart}
          onRemove={removeFromCart}
          onAddUpsell={() => addToCart({ id: UPSELL_PRODUCT.id, name: UPSELL_PRODUCT.name, image: UPSELL_PRODUCT.image, currentPrice: UPSELL_PRODUCT.currentPrice, originalPrice: UPSELL_PRODUCT.originalPrice })}
          onCheckout={goToCheckout}
        />
      )}

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
