'use client';

import { useState } from 'react';
import { Gift, ShoppingBag, CreditCard, Check, Plus, Minus } from 'lucide-react';
import Image from 'next/image';

const products = [
  {
    id: 1,
    name: 'Filmhouse Gift Card',
    price: 50,
    image: '/images/banners/hamnet-banner.jpg',
    category: 'Gift Cards',
    description: 'The perfect gift for any film lover. Valid for tickets and concessions.',
    variants: [25, 50, 100, 200],
    badge: 'Popular',
  },
  {
    id: 2,
    name: 'Classic Movie Poster - Thirst',
    price: 35,
    image: '/images/banners/thirst-banner.jpg',
    category: 'Posters',
    description: 'High-quality print of the iconic Thirst movie poster. A3 size.',
  },
  {
    id: 3,
    name: 'Filmhouse Tote Bag',
    price: 28,
    image: '/images/banners/little-miss-sunshine-banner.jpg',
    category: 'Merchandise',
    description: 'Eco-friendly canvas tote with the Filmhouse logo. Perfect for carrying your essentials.',
    badge: 'Eco',
  },
  {
    id: 4,
    name: "Director's Cut Coffee Mug",
    price: 18,
    image: '/images/banners/sentimental-value-banner.jpg',
    category: 'Merchandise',
    description: 'Ceramic mug featuring famous director quotes. 350ml capacity.',
  },
  {
    id: 5,
    name: 'Film Reel Coaster Set',
    price: 22,
    image: '/images/banners/it-was-just-an-accident-banner.jpg',
    category: 'Home',
    description: 'Set of 4 coasters designed like vintage film reels. Cork-backed.',
  },
  {
    id: 6,
    name: 'Cinema Snack Box',
    price: 45,
    image: '/images/banners/hamnet-banner.jpg',
    category: 'Food',
    description: 'Curated selection of gourmet popcorn, chocolates, and drinks for movie night at home.',
    badge: 'New',
  },
];

const categories = ['All', 'Gift Cards', 'Posters', 'Merchandise', 'Home', 'Food'];

export default function GiftShopPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<{ id: number; qty: number; variant?: number }[]>([]);

  const filteredProducts = selectedCategory === 'All' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const addToCart = (productId: number, variant?: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === productId && item.variant === variant);
      if (existing) {
        return prev.map(item => 
          item.id === productId && item.variant === variant 
            ? { ...item, qty: item.qty + 1 } 
            : item
        );
      }
      return [...prev, { id: productId, qty: 1, variant }];
    });
  };

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="min-h-screen" style={{ background: '#DED4CC' }}>
      {/* Hero */}
      <div className="bg-primary text-white py-16">
        <div className="max-w-[1335px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Gift className="w-10 h-10" />
                <h1 className="text-4xl md:text-5xl font-display font-bold">Gift Shop</h1>
              </div>
              <p className="text-xl text-[#DED4CC] max-w-2xl">
                Take home a piece of the cinema experience. From gift cards to exclusive merchandise.
              </p>
            </div>
            {cartCount > 0 && (
              <button className="relative p-3 bg-white/10 hover:bg-white/20 transition-colors">
                <ShoppingBag className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-primary text-xs font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-[1335px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-sm font-semibold uppercase transition-all border ${
                cat === selectedCategory
                  ? 'bg-primary text-[#DED4CC] border-primary'
                  : 'bg-transparent text-primary border-primary hover:bg-primary hover:text-[#DED4CC]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-[1335px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onAddToCart={addToCart}
            />
          ))}
        </div>
      </div>

      {/* Gift Card CTA */}
      <div className="bg-primary text-white py-16">
        <div className="max-w-[1335px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-80" />
          <h2 className="text-3xl font-display font-bold mb-4">Give the Gift of Cinema</h2>
          <p className="text-[#DED4CC]/80 mb-6 max-w-md mx-auto">
            Filmhouse gift cards never expire and can be used for tickets, concessions, and merchandise.
          </p>
          <button className="bg-[#DED4CC] text-primary px-8 py-3 font-semibold uppercase hover:bg-white transition-all border border-[#DED4CC]">
            Buy Gift Card
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ 
  product, 
  onAddToCart 
}: { 
  product: typeof products[0]; 
  onAddToCart: (id: number, variant?: number) => void;
}) {
  const [selectedVariant, setSelectedVariant] = useState(product.variants?.[1] || product.price);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    onAddToCart(product.id, product.variants ? selectedVariant : undefined);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="bg-[#0f1223] overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="bg-[#fcf4d1] text-[#0f1223] text-xs font-semibold px-2.5 py-1">
            {product.category}
          </span>
          {product.badge && (
            <span className={`text-xs font-bold px-2.5 py-1 ${
              product.badge === 'Popular' ? 'bg-primary text-white' :
              product.badge === 'New' ? 'bg-emerald-500 text-white' :
              'bg-blue-500 text-white'
            }`}>
              {product.badge}
            </span>
          )}
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-[#fcf4d1] mb-1 line-clamp-1">{product.name}</h3>
        <p className="text-sm text-[#fcf4d1]/60 mb-4 line-clamp-2">{product.description}</p>
        
        {/* Variants */}
        {product.variants && (
          <div className="flex gap-1.5 mb-4">
            {product.variants.map((v) => (
              <button
                key={v}
                onClick={() => setSelectedVariant(v)}
                className={`text-xs px-3 py-1.5 font-medium transition-all ${
                  selectedVariant === v
                    ? 'bg-[#fcf4d1] text-[#0f1223]'
                    : 'bg-[#172234] text-[#fcf4d1]/70 hover:bg-[#fcf4d1]/20'
                }`}
              >
                ${v}
              </button>
            ))}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-[#fcf4d1]">
            ${product.variants ? selectedVariant : product.price}
          </span>
          <button 
            onClick={handleAdd}
            disabled={added}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold uppercase transition-all ${
              added 
                ? 'bg-emerald-500 text-white' 
                : 'bg-primary text-[#DED4CC] hover:bg-[#DED4CC] hover:text-primary border border-primary'
            }`}
          >
            {added ? (
              <>
                <Check className="w-4 h-4" />
                Added
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                Add
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
