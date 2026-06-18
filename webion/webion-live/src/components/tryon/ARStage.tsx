// components/tryon/ARStage.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { VideoPreview } from './VideoPreview';
import { GarmentOverlay } from './GarmentOverlay';
import { PoseLandmarks } from './PoseLandmarks';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { AutoAlignButton } from './AutoAlignButton';
import { ContinuousTracker } from './ContinuousTracker';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTryonStore } from '@/lib/tryon-store';
import { usePoseDetection } from '@/lib/hooks/usePoseDetection';
import { FitResultOverlay } from './FitResultOverlay';

export default function ARStage() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    selectedGarmentId,
    garments,
    isLiveMode,
    selectedLiveGarment,
    mediaPipeEnabled,
    landmarksVisible,
    toggleLandmarks,
    setPoseConfidence
  } = useTryonStore();

  const selectedGarment = garments.find((g) => g.id === selectedGarmentId);

  // MediaPipe pose detection
  const {
    landmarks,
    confidence,
    segmentationMask,
    fps,
    isLoading: mediaPipeLoading,
    error: mediaPipeError
  } = usePoseDetection(
    mediaPipeEnabled ? videoRef.current : null,
    {
      modelComplexity: 'lite', // Use lite for real-time performance
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    }
  );

  // Update confidence in store
  useEffect(() => {
    if (mediaPipeEnabled) {
      setPoseConfidence(confidence);
    }
  }, [confidence, mediaPipeEnabled, setPoseConfidence]);

  // Get container dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Wrap in useCallback to prevent infinite loop on re-renders
  const handleStreamReady = useCallback((mediaStream: MediaStream, video: HTMLVideoElement) => {
    console.log('📹 Stream ready for overlay and pose detection');
    setStream(mediaStream);
    videoRef.current = video;
  }, []); // Empty deps - this function doesn't need to change

  return (
    <Card className="relative w-full h-full min-h-[600px] overflow-hidden bg-black/20 backdrop-blur-sm">
      <div ref={containerRef} className="relative w-full h-full">
        {/* Continuous Tracker - tracks pose when enabled */}
        {mediaPipeEnabled && (
          <ContinuousTracker
            landmarks={landmarks}
            containerWidth={dimensions.width}
            containerHeight={dimensions.height}
          />
        )}

        {/* Video Background */}
        <VideoPreview
          onStreamReady={handleStreamReady}
          className="w-full h-full"
        />

        {/* Pose Landmarks Overlay */}
        {mediaPipeEnabled && stream && (
          <PoseLandmarks
            landmarks={landmarks}
            width={dimensions.width}
            height={dimensions.height}
            visible={landmarksVisible}
          />
        )}

        {/* Garment Overlay (positioned absolutely over video) */}
        {stream && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="relative w-full h-full pointer-events-auto">
              <GarmentOverlay
                containerWidth={dimensions.width}
                containerHeight={dimensions.height}
                landmarks={landmarks}
                segmentationMask={segmentationMask}
              />
            </div>
          </div>
        )}

        {/* Floating Controls */}
        {stream && (
          <div className="absolute top-4 right-4 space-y-2">
            {/* Auto-Align Button - only show when MediaPipe enabled and garment selected */}
            {mediaPipeEnabled && selectedGarment && (
              <AutoAlignButton
                landmarks={landmarks}
                containerWidth={dimensions.width}
                containerHeight={dimensions.height}
                disabled={mediaPipeLoading || !!mediaPipeError}
              />
            )}

            {/* Landmarks Visibility Toggle */}
            {mediaPipeEnabled && (
              <Button
                size="sm"
                variant="secondary"
                onClick={toggleLandmarks}
                className="backdrop-blur-sm bg-black/30 hover:bg-black/50"
              >
                {landmarksVisible ? (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Hide Landmarks
                  </>
                ) : (
                  <>
                    <Target className="mr-2 h-4 w-4" />
                    Show Landmarks
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Status Displays */}
        <div className="absolute bottom-4 left-4 space-y-2 max-w-[calc(100%-2rem)]">
          {/* Fit Results (New) */}
          {selectedGarment && selectedGarment.fitRecommendation && (
            <FitResultOverlay 
              fitRecommendation={selectedGarment.fitRecommendation} 
              className="mb-2"
            />
          )}

          {/* Camera Status */}
          <div className="text-xs text-white/70 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full inline-flex items-center gap-2">
            <div className={cn("size-2 rounded-full", stream ? "bg-green-500 animate-pulse" : "bg-yellow-500")} />
            {stream ? 'Camera Active' : 'Waiting for camera...'}
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Garment Info */}
            {selectedGarment && (
              <div className={cn(
                "text-xs text-white backdrop-blur-sm px-3 py-1.5 rounded-full inline-flex items-center gap-2 border",
                isLiveMode ? "bg-red-500/20 border-red-500/30" : "bg-primary/20 border-primary/30"
              )}>
                <span className="uppercase font-bold tracking-tighter">
                  {isLiveMode ? '🔴 Live Pick:' : 'Item:'}
                </span>
                <span className="font-medium italic">{selectedGarment.name}</span>
              </div>
            )}

            {/* MediaPipe Status */}
            {mediaPipeEnabled && (
              <>
                {mediaPipeLoading && (
                  <div className="text-xs text-yellow-500 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    ⏳ Loading AI Tracker...
                  </div>
                )}
                {mediaPipeError && (
                  <div className="text-xs text-red-500 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    ❌ {mediaPipeError}
                  </div>
                )}
                {!mediaPipeLoading && !mediaPipeError && (
                  <ConfidenceIndicator
                    confidence={confidence}
                    fps={fps}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
