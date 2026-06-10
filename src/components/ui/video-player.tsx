"use client";

import { useState, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";

type VideoPlayerProps = {
  src?: string;
  poster?: string;
  className?: string;
  title?: string;
};

export function VideoPlayer({ src, poster, className, title }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const duration = videoRef.current.duration;
    if (duration > 0) {
      setProgress((current / duration) * 100);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * videoRef.current.duration;
    setProgress(pos * 100);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  return (
    <div
      className={cn(
        "group relative aspect-video overflow-hidden rounded-2xl border-2 border-border bg-surface-muted shadow-card text-foreground select-none",
        className
      )}
    >
      {src ? (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className="h-full w-full object-cover"
          onTimeUpdate={handleTimeUpdate}
          onClick={togglePlay}
        />
      ) : (
        /* Visual Placeholder when no video source is available */
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-accent-light p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-border bg-primary text-foreground shadow-[0_4px_0_0_var(--color-border)] hover:scale-105 transition-transform duration-100 ease-out cursor-pointer active:translate-y-[2px] active:shadow-[0_2px_0_0_var(--color-border)]">
            <Play className="h-6 w-6 fill-foreground ml-1" />
          </div>
          {title && (
            <p className="mt-4 font-heading font-semibold text-sm tracking-wide text-foreground">
              {title}
            </p>
          )}
          <p className="mt-1 text-xs text-foreground-secondary font-sans max-w-xs">
            Concept walkthrough video placeholder. Fills with interactive demonstration on runtime.
          </p>
        </div>
      )}

      {/* Video Custom Controller Overlay (only visible if video src is loaded) */}
      {src && (
        <div className="absolute bottom-0 left-0 right-0 border-t-2 border-border bg-surface/95 p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 flex flex-col gap-2">
          {/* Progress Slider */}
          <div
            className="relative h-2.5 w-full cursor-pointer rounded-full border-2 border-border bg-surface-muted overflow-hidden"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-success transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                onClick={togglePlay}
                className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-border bg-surface-card hover:-translate-y-[0.5px] hover:shadow-[0_2px_0_0_var(--color-border)] active:translate-y-[1px] active:shadow-none transition-all duration-100 cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="h-3.5 w-3.5 fill-foreground" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-foreground ml-0.5" />
                )}
              </button>

              <button
                onClick={toggleMute}
                className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-border bg-surface-card hover:-translate-y-[0.5px] hover:shadow-[0_2px_0_0_var(--color-border)] active:translate-y-[1px] active:shadow-none transition-all duration-100 cursor-pointer"
              >
                {isMuted ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            <button
              onClick={handleFullscreen}
              className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-border bg-surface-card hover:-translate-y-[0.5px] hover:shadow-[0_2px_0_0_var(--color-border)] active:translate-y-[1px] active:shadow-none transition-all duration-100 cursor-pointer"
            >
              <Maximize className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
