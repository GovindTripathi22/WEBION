"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useSpring, useTransform } from "framer-motion";

// 3D Tilt card with depth effect
function ProductCard({ product, index }) {
  const cardRef = useRef(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const springRotateX = useSpring(rotateX, { damping: 20, stiffness: 200 });
  const springRotateY = useSpring(rotateY, { damping: 20, stiffness: 200 });

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const percentX = (e.clientX - centerX) / (rect.width / 2);
    const percentY = (e.clientY - centerY) / (rect.height / 2);
    setRotateX(-percentY * 8);
    setRotateY(percentX * 8);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      className="perspective-container group cursor-pointer"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => setIsHovered(true)}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      data-cursor-hover
    >
      <motion.div
        className="liquid-glass rounded-2xl overflow-hidden border border-white/10 transition-all duration-500"
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformStyle: "preserve-3d",
          boxShadow: isHovered
            ? "0 30px 60px rgba(0,0,0,0.5), 0 0 40px rgba(202,138,4,0.12)"
            : "0 8px 24px rgba(0,0,0,0.3)",
        }}
      >
        {/* Image */}
        <div className="relative h-64 overflow-hidden">
          <motion.img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            animate={{ scale: isHovered ? 1.08 : 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          {/* Gold gradient overlay at bottom of image */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
          {/* Category pill */}
          <div className="absolute top-3 left-3 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full border border-yellow-600/30">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-yellow-500">
              {product.category}
            </span>
          </div>
          {/* Live indicator */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-red-600/80 backdrop-blur-md rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[9px] font-black tracking-widest text-white uppercase">Live</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5" style={{ transform: "translateZ(20px)" }}>
          <h3
            className="text-base font-bold tracking-wide text-white/90 mb-1"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            {product.name}
          </h3>
          <p className="text-stone-400 text-xs leading-relaxed line-clamp-2 mb-4">
            {product.description}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-yellow-500" style={{ fontFamily: "'Cinzel', serif" }}>
              ₹{Number(product.price).toLocaleString()}
            </span>
            <Link
              href="/"
              className="px-4 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all duration-300 bg-yellow-600/20 border border-yellow-600/40 text-yellow-400 hover:bg-yellow-600 hover:text-black hover:border-yellow-500"
              data-cursor-hover
            >
              View Live →
            </Link>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">
              {product.seller_name} • Live Now
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/products")
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="relative min-h-screen bg-stone-950 text-white overflow-auto">
      {/* Ambient glow layers */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-yellow-900/10 rounded-full blur-[120px] animate-[drift_12s_ease-in-out_infinite_alternate]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-900/10 rounded-full blur-[100px] animate-[drift_15s_ease-in-out_infinite_alternate-reverse]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        {/* Header */}
        <motion.div
          className="flex flex-col md:flex-row items-start md:items-center justify-between mb-16 gap-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <p className="text-yellow-600/70 text-xs tracking-[0.4em] uppercase mb-2">
              Webion Live Collection
            </p>
            <h1
              className="text-4xl md:text-5xl font-bold text-white leading-tight"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              The Edit
            </h1>
            <p className="text-stone-400 mt-3 text-sm tracking-wide max-w-sm">
              Browse products · Visit the live shop · Try on with AR
            </p>
          </div>

          <Link
            href="/"
            className="flex items-center gap-3 px-7 py-3.5 rounded-full font-bold text-sm tracking-widest uppercase border border-yellow-600/50 text-yellow-500 bg-yellow-600/10 backdrop-blur-sm hover:bg-yellow-600 hover:text-stone-950 hover:border-yellow-500 transition-all duration-300"
            data-cursor-hover
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Enter Live Shop
          </Link>
        </motion.div>

        {/* Product Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-yellow-600/30 border-t-yellow-500 animate-spin" />
              <p className="text-stone-500 text-sm tracking-widest uppercase">Loading collection…</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        )}

        {/* AR Feature Bar */}
        <motion.div
          className="mt-20 liquid-glass rounded-3xl p-10 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-yellow-600/70 text-xs tracking-[0.35em] uppercase mb-3">Webion Technology</p>
          <h2
            className="text-3xl font-bold text-white mb-3"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            AR Virtual Try-On
          </h2>
          <p className="text-stone-400 max-w-xl mx-auto text-sm leading-relaxed mb-8">
            Enter any live shop, and see how the garment fits your body in real-time. Get instant
            size measurements and AI-powered fit recommendations.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {["Auto Measurements", "Virtual Try-On", "Fit Score", "Live Negotiation"].map((feat) => (
              <div
                key={feat}
                className="px-5 py-2 rounded-full border border-yellow-600/20 bg-yellow-600/5 text-yellow-400/80 text-xs font-medium tracking-wide"
              >
                {feat}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
