import React from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface FitResultOverlayProps {
  fitRecommendation?: {
    size: string;
    confidence: number;
    fit_score?: number;
  };
  className?: string;
}

export function FitResultOverlay({ fitRecommendation, className }: FitResultOverlayProps) {
  if (!fitRecommendation) return null;

  const score = fitRecommendation.fit_score || Math.round(fitRecommendation.confidence * 100);
  const isHighConfidence = fitRecommendation.confidence > 0.7;

  return (
    <div className={cn(
      "bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-right-4 duration-500",
      className
    )}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            "size-8 rounded-full flex items-center justify-center",
            isHighConfidence ? "bg-primary/20 text-primary" : "bg-yellow-500/20 text-yellow-500"
          )}>
            {isHighConfidence ? <CheckCircle2 className="size-5" /> : <AlertCircle className="size-5" />}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">AI Fit Result</div>
            <div className="text-xl font-black italic uppercase tracking-tighter">Size {fitRecommendation.size}</div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Match Score</div>
          <div className="text-2xl font-black italic text-primary">{score}%</div>
        </div>
      </div>

      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-1000 ease-out" 
          style={{ width: `${score}%` }} 
        />
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-primary/60 font-medium uppercase tracking-wider">
        <Sparkles className="size-3" />
        Verified by AI Model v2.4
      </div>
    </div>
  );
}
