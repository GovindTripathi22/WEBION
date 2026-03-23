"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/products")
      .then(r => r.json())
      .then(data => {
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold">Webion Live Store</h1>
            <p className="text-zinc-400 mt-2">Browse products • Visit shop live • Try on with AR</p>
          </div>
          <Link href="/"
            className="px-6 py-3 bg-orange-500 text-black font-bold rounded-full hover:bg-orange-400 transition">
            🔴 Enter Live Shop
          </Link>
        </div>

        {loading ? (
          <div className="text-center text-zinc-500 py-20">Loading products...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <div key={product.id}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden hover:border-orange-500/50 transition group">
                <div className="h-64 overflow-hidden">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                </div>
                <div className="p-5">
                  <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">
                    {product.category}
                  </span>
                  <h3 className="text-lg font-bold mt-1">{product.name}</h3>
                  <p className="text-zinc-500 text-sm mt-1 line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xl font-black">€{product.price}</span>
                    <Link href="/"
                      className="px-4 py-2 bg-white text-black text-xs font-bold rounded-full hover:bg-orange-400 transition">
                      View Live →
                    </Link>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      Seller: {product.seller_name} • Live Now
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-16 p-8 bg-zinc-900/50 border border-zinc-800 rounded-3xl text-center">
          <h3 className="text-2xl font-bold mb-2">🪄 AR Try-On Feature</h3>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Enter any live shop, click the AR Try-On button, and see how the garment on the
            mannequin fits your body in real-time. Get instant size measurements and fit recommendations.
          </p>
          <div className="flex justify-center gap-6 mt-6">
            <div className="px-4 py-2 bg-zinc-800 rounded-xl text-sm">📏 Auto Measurements</div>
            <div className="px-4 py-2 bg-zinc-800 rounded-xl text-sm">👔 Virtual Try-On</div>
            <div className="px-4 py-2 bg-zinc-800 rounded-xl text-sm">✅ Fit Score</div>
            <div className="px-4 py-2 bg-zinc-800 rounded-xl text-sm">💬 Live Negotiation</div>
          </div>
        </div>
      </div>
    </div>
  );
}
