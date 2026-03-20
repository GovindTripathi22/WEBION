"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  ShoppingBag, 
  Eye, 
  ArrowRight,
  Radio,
  Zap,
  Globe,
  Plus,
  Settings,
  Maximize,
  Sun,
  Moon
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// 1. ANIMATED THEME TOGGLE
const ThemeToggle = ({ darkMode, setDarkMode }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => setDarkMode(!darkMode)}
      className="p-4 clay-glass rounded-full hover:bg-white/20 dark:hover:bg-white/5 transition-colors relative h-14 w-14 flex items-center justify-center overflow-hidden"
    >
      <AnimatePresence mode="wait" initial={false}>
        {darkMode ? (
          <motion.div
            key="moon"
            initial={{ y: 20, opacity: 0, rotate: 45 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -20, opacity: 0, rotate: -45 }}
            transition={{ duration: 0.3 }}
          >
            <Moon size={20} className="text-neon-sky" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ y: 20, opacity: 0, rotate: -45 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -20, opacity: 0, rotate: 45 }}
            transition={{ duration: 0.3 }}
          >
            <Sun size={20} className="text-accent-peach" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

const ARMarkerLight = ({ label, value, x, y, colorClass, darkMode }) => (
  <motion.div 
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    className="absolute flex flex-col items-center gap-3 pointer-events-none"
    style={{ left: x, top: y }}
  >
    <div className={cn(
        "w-3 h-3 rounded-full border-2 border-white shadow-xl", 
        colorClass,
        darkMode && "border-zinc-800 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
    )} />
    <div className="clay-glass px-4 py-2 rounded-2xl border-white/80 dark:border-white/5 font-medium">
      <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 block leading-none mb-1">{label}</span>
      <span className="text-xs font-black text-zinc-800 dark:text-zinc-100 leading-none">{value}</span>
    </div>
  </motion.div>
);

const LiveShoppingRoom = () => {
  const [isARActive, setIsARActive] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Apply dark class to body for global transitions
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <div className={cn(
        "relative h-screen w-screen transition-colors duration-1000 overflow-hidden selection:bg-peach selection:text-zinc-900",
        darkMode ? "bg-obsidian text-zinc-50" : "bg-milk text-zinc-950"
    )}>
      {/* 1. IMMERSIVE BACKGROUND (Dynamic) */}
      <div className="absolute inset-0 z-0">
        <div className={cn(
            "absolute inset-0 z-10",
            darkMode 
                ? "bg-[radial-gradient(circle_at_center,_transparent_0%,_#050505_100%)] opacity-80" 
                : "bg-[radial-gradient(circle_at_20%_20%,_#fff_0%,_transparent_100%)]"
        )} />
        
        {/* Dynamic Glows */}
        <div className={cn(
            "absolute top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full transition-all duration-1000",
            darkMode ? "bg-neon-peach/20 opacity-40 animate-pulse" : "bg-peach/20"
        )} />
        <div className={cn(
            "absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] blur-[150px] rounded-full animate-float-slow transition-all duration-1000",
            darkMode ? "bg-neon-sky/30 opacity-60" : "bg-sky/30"
        )} />
        
        <div className="w-full h-full flex items-center justify-center relative">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="relative"
          >
            {/* Main Product Container */}
            <div className={cn(
                "w-[500px] h-[700px] rounded-clay clay-shadow flex items-center justify-center border transition-all duration-1000 relative overflow-hidden group",
                darkMode ? "bg-[#0a0a0a] border-white/5" : "bg-white border-white"
            )}>
               <div className={cn(
                   "absolute inset-0 opacity-50",
                   darkMode ? "bg-gradient-to-tr from-neon-peach/5 via-transparent to-neon-sky/5" : "bg-gradient-to-tr from-peach/10 via-transparent to-mint/10"
               )} />
               
               <motion.div 
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-20"
               >
                 <ShoppingBag size={240} strokeWidth={0.5} className={cn(
                     "drop-shadow-2xl transition-colors duration-1000",
                     darkMode ? "text-zinc-800/20" : "text-zinc-100"
                 )} />
               </motion.div>
               
               {/* AR Markers Layer */}
               <AnimatePresence>
               {isARActive && (
                  <>
                    <ARMarkerLight 
                        label="Material" 
                        value="Precision Thread" 
                        x="-10%" y="20%" 
                        colorClass={darkMode ? "bg-neon-peach" : "bg-accent-peach"} 
                        darkMode={darkMode}
                    />
                    <ARMarkerLight 
                        label="Handle Drop" 
                        value="12.5 cm" 
                        x="90%" y="15%" 
                        colorClass={darkMode ? "bg-neon-sky" : "bg-sky-400"} 
                        darkMode={darkMode}
                    />
                    <ARMarkerLight 
                        label="Base Width" 
                        value="32.0 cm" 
                        x="50%" y="85%" 
                        colorClass={darkMode ? "bg-neon-mint" : "bg-accent-mint"} 
                        darkMode={darkMode}
                    />
                  </>
               )}
               </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 2. PREMIUM HEADER */}
      <header className="absolute top-12 inset-x-16 flex items-center justify-between z-50 pointer-events-none">
        <div className="flex items-center gap-8 pointer-events-auto">
          <div className="flex flex-col">
             <h1 className="text-3xl font-medium text-serif-luxury transition-colors duration-1000 leading-none">Webion Live</h1>
             <div className="flex items-center gap-2 mt-2">
                <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", darkMode ? "bg-neon-peach" : "bg-red-500")} />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">Studio Session • HK-CURATOR</span>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-4 pointer-events-auto">
           <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
           
           <div className="p-4 clay-glass rounded-clay flex items-center gap-4 pr-6">
              <div className={cn(
                  "p-0.5 rounded-full bg-gradient-to-tr",
                  darkMode ? "from-neon-sky to-neon-peach" : "from-peach to-sky"
              )}>
                <img 
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
                    alt="Seller" 
                    className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none mb-1">Presenter</span>
                <span className="text-xs font-black leading-none">Alex Volkov</span>
              </div>
           </div>
           
           <button className="p-4 clay-glass rounded-full hover:bg-white/20 dark:hover:bg-white/5 transition-colors">
              <Settings size={18} className="text-zinc-400" />
           </button>
        </div>
      </header>

      {/* 4. PRODUCT PILLAR (Serif / High Contrast) */}
      <motion.aside 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="absolute bottom-16 left-16 z-40 w-[380px]"
      >
        <div className="clay-glass p-12 rounded-clay relative overflow-hidden group">
           <div className="absolute top-8 right-8 text-zinc-200 dark:text-zinc-800 opacity-20 group-hover:opacity-40 transition-opacity">
              <Radio size={32} />
           </div>

           <div className="mb-10">
              <span className={cn(
                  "text-[9px] font-black uppercase tracking-[0.4em] block mb-4",
                  darkMode ? "text-neon-peach" : "text-accent-peach"
              )}>The Midnight Curator</span>
              <h2 className="text-5xl font-medium text-serif-luxury text-zinc-900 dark:text-zinc-100 leading-[0.9] mb-4">
                Silk Mesh <br /> Collection
              </h2>
              <p className="text-zinc-400 dark:text-zinc-500 text-xs font-medium leading-relaxed max-w-[80%]">
                A masterpiece of sustainable architecture and high-fashion aesthetics.
              </p>
           </div>

           <div className="flex gap-4 mb-10">
              <div className="flex-1 p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-100 dark:border-white/5">
                 <span className="text-[8px] font-bold text-zinc-300 dark:text-zinc-600 uppercase block mb-1">Reserve</span>
                 <span className="text-xl font-black">€1,850</span>
              </div>
              <div className="flex-1 p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-100 dark:border-white/5">
                 <span className="text-[8px] font-bold text-zinc-300 dark:text-zinc-600 uppercase block mb-1">Status</span>
                 <span className={cn("text-xl font-black", darkMode ? "text-neon-mint" : "text-accent-mint")}>Limited</span>
              </div>
           </div>

           <button className={cn(
               "w-full h-16 rounded-clay font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 transition-all",
               darkMode ? "bg-neon-peach text-zinc-900 shadow-xl shadow-neon-peach/10" : "bg-zinc-950 text-white hover:bg-zinc-800"
           )}>
              Purchase Reserve
              <ArrowRight size={14} />
           </button>
        </div>
      </motion.aside>

      {/* 5. FLOATING BOTTOM CONTROLS (Sync with Android) */}
      <footer className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50">
         <div className="p-3 clay-glass rounded-[4rem] flex items-center gap-4 shadow-[0_30px_60px_rgba(0,0,0,0.12)] border-white/20 dark:border-white/5">
            <div className="flex items-center gap-2 p-1 bg-white/10 dark:bg-black/20 rounded-full">
                <ControlActionLight 
                    icon={<Eye size={20} />} 
                    active={isARActive} 
                    onClick={() => setIsARActive(!isARActive)}
                    darkMode={darkMode}
                />
                <ControlActionLight icon={<Zap size={20} />} darkMode={darkMode} />
                <ControlActionLight icon={<Radio size={20} />} darkMode={darkMode} />
            </div>
            
            <div className="w-[1px] h-10 bg-zinc-200 dark:bg-white/10 mx-1" />
            
            <button className={cn(
                "h-14 px-12 rounded-full font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl transition-all hover:scale-105 active:scale-95",
                darkMode 
                    ? "bg-neon-peach text-zinc-900 shadow-neon-peach/20" 
                    : "bg-zinc-900 text-white shadow-zinc-900/20"
            )}>
                Push Product
            </button>
         </div>
      </footer>

      {/* 6. CORNER DECORATION */}
      <div className="absolute bottom-12 right-16 z-40">
         <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-zinc-300 dark:text-zinc-700 uppercase tracking-widest">Network</span>
                <span className={cn("text-xs font-black", darkMode ? "text-neon-sky" : "text-zinc-900")}>SYNC • 12MS</span>
            </div>
            <button className="w-12 h-12 rounded-full border border-zinc-100 dark:border-white/5 flex items-center justify-center text-zinc-300 dark:text-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <Maximize size={18} />
            </button>
         </div>
      </div>
    </div>
  );
};

const ControlActionLight = ({ icon, active, onClick, darkMode }) => (
  <button 
    onClick={onClick}
    className={cn(
        "w-14 h-14 rounded-full flex items-center justify-center transition-all",
        active 
            ? (darkMode ? "bg-neon-peach text-zinc-900 shadow-xl shadow-neon-peach/20" : "bg-peach text-accent-peach shadow-lg") 
            : (darkMode ? "bg-white/5 text-zinc-500 hover:text-zinc-100" : "bg-white text-zinc-300 hover:text-zinc-600 hover:shadow-md")
    )}
  >
    {icon}
  </button>
);

export default LiveShoppingRoom;
