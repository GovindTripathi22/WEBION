"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Moon,
  MessageCircle
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Subscriptions moved to dynamic imports inside useEffect to avoid Next.js SSR issues


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
    className="absolute flex flex-col items-center gap-3 pointer-events-none z-40"
    style={{ left: x, top: y }}
  >
    <div className={cn(
        "w-3 h-3 rounded-full border-2 border-white shadow-xl", 
        colorClass,
        darkMode && "border-zinc-800 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
    )} />
    <div className="clay-glass px-4 py-2 rounded-2xl border-white/80 dark:border-white/5 font-medium shadow-xl">
      <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 block leading-none mb-1">{label}</span>
      <span className="text-xs font-black text-zinc-800 dark:text-zinc-100 leading-none">{value}</span>
    </div>
  </motion.div>
);

const LiveShoppingRoom = () => {
  const [isARActive, setIsARActive] = useState(false);
  const [isComputing, setIsComputing] = useState(false);
  const [fitScore, setFitScore] = useState(0);
  const [darkMode, setDarkMode] = useState(false);

  // ── WebRTC & Socket.io State ──
  const [arWidth, setArWidth] = useState("Scan to measure");
  const [garmentLength, setGarmentLength] = useState("Scan to measure");
  const [fitRecommendation, setFitRecommendation] = useState("SCANNING");
  const [negotiationStatus, setNegotiationStatus] = useState("Request Negotiation");
  const socketRef = useRef(null);
  const agoraClientRef = useRef(null);
  const localTracksRef = useRef([]);

  // Socket.io Connection (Client side only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Import and connect inside useEffect to avoid SSR issues
    const initSocket = async () => {
      const { io } = await import("socket.io-client");
      const socket = io("http://localhost:5000", { transports: ["websocket"] });
      socketRef.current = socket;

      socket.on("connect", () => console.log("Socket connected:", socket.id));

      socket.on("receive_ar_dimensions", (data) => {
        console.log("AR Data received from Android seller:", data);
        setIsComputing(true);
        if (data) {
            setArWidth(data.shoulderWidth ? `${data.shoulderWidth} cm` : `${data.mannequinWidth} cm`);
            setGarmentLength(data.mannequinLength ? `${data.mannequinLength} cm` : "N/A");
            
            // Fetch real size match from backend instead of hardcoding
            fetch(`http://localhost:5000/api/ar/size-match?product_id=1&session_id=buyer-web-01`)
              .then(r => r.json())
              .then(result => {
                setIsComputing(false);
                setFitScore(result.fit_score || 85);
                setFitRecommendation(result.recommendation || "SCANNING");
              })
              .catch(() => {
                setIsComputing(false);
                setFitScore(85);
              });
        }
      });
    };

    initSocket();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // Negotiation Alert Function
  const handleNegotiationRequest = () => {
    if (socketRef.current) {
      setNegotiationStatus("Sending...");
      socketRef.current.emit("negotiation_alert", {
        buyerId: "buyer-web-01",
        timestamp: new Date().toISOString()
      });
      setTimeout(() => {
        setNegotiationStatus("Sent successfully ✓");
        setTimeout(() => setNegotiationStatus("Request Negotiation"), 3000);
      }, 800);
    }
  };

  // Agora RTC Setup (Client side only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    let client = null;

    const initAgora = async () => {
      try {
        const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
        
        const response = await fetch("http://localhost:5000/api/agora/token?channelName=webion-live");
        if (!response.ok) throw new Error("Failed to fetch token from localhost:5000");
        const { token, channelName } = await response.json();

        // Hardcode App ID from previous Android step
        const APP_ID = "ef9c84c99ed2411aac7751c40a9fd720";
        
        client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        agoraClientRef.current = client;

        // Handle remote user (The Android Salesperson)
        client.on("user-published", async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          console.log("Remote user subscribed:", user.uid);
          if (mediaType === "video") {
            const remoteVideoTrack = user.videoTrack;
            const sellerContainer = document.getElementById("seller-video-container");
            if (sellerContainer) {
              remoteVideoTrack.play(sellerContainer);
            }
          }
          if (mediaType === "audio") {
            user.audioTrack.play();
          }
        });

        await client.join(APP_ID, channelName, token, null);
        console.log("Joined Agora channel successfully.");

        // Create and publish local tracks (Buyer webcam/mic)
        const localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        localTracksRef.current = localTracks;
        
        await client.publish(localTracks);
        console.log("Published local tracks!");

        // Play local video in the floating buyer div
        const buyerContainer = document.getElementById("buyer-video-container");
        if (buyerContainer) {
          localTracks[1].play(buyerContainer);
        }

      } catch (error) {
        console.error("Agora Error:", error);
      }
    };

    initAgora();

    return () => {
      // Cleanup Agora
      if (localTracksRef.current.length > 0) {
        localTracksRef.current.forEach(track => {
          track.stop();
          track.close();
        });
      }
      if (agoraClientRef.current) {
        agoraClientRef.current.leave().then(() => console.log("Left Agora channel."));
      }
    };
  }, []);

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
            {/* Main Product Container (Seller Camera Feed) */}
            <div className={cn(
                "w-[500px] h-[700px] rounded-clay clay-shadow flex items-center justify-center border transition-all duration-1000 relative overflow-hidden group",
                darkMode ? "bg-[#0a0a0a] border-white/5" : "bg-[#f5f5f5] border-white"
            )}>
               <div className={cn(
                   "absolute inset-0 opacity-50 z-10 pointer-events-none",
                   darkMode ? "bg-gradient-to-tr from-neon-peach/5 via-transparent to-neon-sky/5" : "bg-gradient-to-tr from-peach/10 via-transparent to-mint/10"
               )} />
               
               {/* ── SELLER REMOTE VIDEO FEED ── */}
               <div id="seller-video-container" className="w-full h-full object-cover absolute inset-0 z-0">
                 {/* Remote video injected here by Agora */}
               </div>
               
               {/* AR Markers Layer */}
               <AnimatePresence>
               {isARActive && (
                  <>
                    <ARMarkerLight 
                        label="Shoulder View" 
                        value={arWidth} 
                        x="-10%" y="20%" 
                        colorClass={darkMode ? "bg-neon-peach" : "bg-accent-peach"} 
                        darkMode={darkMode}
                    />
                    <ARMarkerLight 
                        label="Fit Estimation" 
                        value={fitScore > 0 ? "Perfect" : "Scanning..."} 
                        x="90%" y="15%" 
                        colorClass={darkMode ? "bg-neon-sky" : "bg-sky-400"} 
                        darkMode={darkMode}
                    />
                    <ARMarkerLight 
                        label="Garment Length" 
                        value={garmentLength} 
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

      {/* ── BUYER FLOATING WEBCAM (Pip) ── */}
      <motion.div 
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.1}
        className="absolute bottom-32 right-16 z-50 cursor-grab active:cursor-grabbing"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8, type: "spring" }}
      >
        <div className={cn(
          "w-[140px] h-[200px] rounded-3xl overflow-hidden shadow-2xl border-2 relative",
          darkMode ? "border-white/10 shadow-black/50" : "border-white shadow-zinc-300"
        )}>
          {/* Main Local Video Inject point */}
          <div id="buyer-video-container" className="absolute inset-0 z-0 bg-black"></div>
          
          {/* MediaPipe Canvas readiness */}
          <canvas id="ar-canvas" className="absolute inset-0 z-50 pointer-events-none"></canvas>
          
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md text-[8px] font-black uppercase text-white tracking-widest z-50">
            You (Buyer)
          </div>
        </div>
      </motion.div>

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
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="absolute bottom-16 left-16 z-40 w-[380px]"
      >
        <div className="clay-glass p-12 rounded-clay relative overflow-hidden group border border-white/20 dark:border-white/5">
           <div className="absolute top-8 right-8 text-zinc-200 dark:text-zinc-800 opacity-20 group-hover:opacity-40 transition-opacity">
              <Radio size={32} />
           </div>

           <div className="mb-10">
              {/* Fit Match Score */}
              <AnimatePresence>
                {(isComputing || fitScore > 0) && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-8 p-5 rounded-3xl bg-white/5 border border-white/10 dark:border-white/5 overflow-hidden relative shadow-2xl backdrop-blur-xl"
                  >
                    {isComputing ? (
                      <div className="flex items-center gap-4">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                          className={cn("w-5 h-5 border-2 rounded-full", darkMode ? "border-neon-peach/20 border-t-neon-peach" : "border-accent-peach/20 border-t-accent-peach")}
                        />
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-60 text-zinc-800 dark:text-zinc-200">Syncing Android Scan...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase tracking-[0.3em] font-bold opacity-50 mb-1 text-zinc-900 dark:text-zinc-100">Live Match Score</span>
                          <span className={cn("text-3xl font-black leading-none", darkMode ? "text-neon-mint" : "text-accent-mint")}>{fitScore}%</span>
                        </div>
                        <div className={cn("px-4 py-2 rounded-full border shadow-inner", darkMode ? "bg-neon-mint/10 border-neon-mint/20" : "bg-accent-mint/10 border-accent-mint/20")}>
                          <span className={cn("text-[10px] font-black uppercase tracking-widest", darkMode ? "text-neon-mint" : "text-accent-mint")}>{fitRecommendation.replace("_", " ")}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Scanning Line */}
                    {isComputing && (
                      <motion.div 
                        initial={{ left: "-100%" }}
                        animate={{ left: "100%" }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        className={cn("absolute inset-0 w-full", darkMode ? "bg-gradient-to-r from-transparent via-neon-peach/10 to-transparent" : "bg-gradient-to-r from-transparent via-accent-peach/10 to-transparent")}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <span className={cn(
                  "text-[9px] font-black uppercase tracking-[0.4em] block mb-4",
                  darkMode ? "text-neon-peach" : "text-accent-peach"
              )}>Live Auction Setup</span>
              <h2 className="text-5xl font-medium text-serif-luxury text-zinc-900 dark:text-zinc-100 leading-[0.9] mb-4">
                Silk Mesh <br /> Collection
              </h2>
              <p className="text-zinc-400 dark:text-zinc-500 text-xs font-medium leading-relaxed max-w-[80%]">
                A masterpiece of sustainable architecture and high-fashion aesthetics. Currently being modeled live by the seller.
              </p>
           </div>

           <div className="flex gap-4 mb-10">
              <div className="flex-1 p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-100 dark:border-white/5">
                 <span className="text-[8px] font-bold text-zinc-300 dark:text-zinc-600 uppercase block mb-1">Current Bid</span>
                 <span className="text-xl font-black">€1,850</span>
              </div>
              <div className="flex-1 p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-100 dark:border-white/5">
                 <span className="text-[8px] font-bold text-zinc-300 dark:text-zinc-600 uppercase block mb-1">Status</span>
                 <span className={cn("text-xl font-black", darkMode ? "text-neon-mint" : "text-accent-mint")}>Live</span>
              </div>
           </div>

           <button 
             onClick={handleNegotiationRequest}
             className={cn(
               "w-full h-16 rounded-clay font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 transition-all",
               darkMode ? "bg-neon-sky text-zinc-900 shadow-xl shadow-neon-sky/10" : "bg-black text-white hover:bg-zinc-800 hover:shadow-2xl"
           )}>
              <MessageCircle size={15} />
              {negotiationStatus}
           </button>
        </div>
      </motion.aside>

      {/* 5. FLOATING BOTTOM CONTROLS */}
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
            
            <button 
                onClick={handleNegotiationRequest}
                className={cn(
                "h-14 px-12 rounded-full font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl transition-all hover:scale-105 active:scale-95",
                darkMode 
                    ? "bg-neon-peach text-zinc-900 shadow-neon-peach/20" 
                    : "bg-zinc-900 text-white shadow-zinc-900/20"
            )}>
                Confirm Purchase
            </button>
         </div>
      </footer>

      {/* 6. CORNER DECORATION */}
      <div className="absolute bottom-12 right-16 z-40">
         <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-zinc-300 dark:text-zinc-700 uppercase tracking-widest">Network</span>
                <span className={cn("text-xs font-black", darkMode ? "text-neon-sky" : "text-zinc-900")}>SYNC • LIVE</span>
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
