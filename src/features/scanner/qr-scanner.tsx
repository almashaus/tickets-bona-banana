"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

export default function QrScanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let animationFrameId: number;

    const stopCamera = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        window.location.href = "/admin";
      }

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: 250, height: 250 },
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");

          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch((err) => {
              console.warn("Autoplay prevented:", err);
            });
          };
        }

        const tick = () => {
          if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");

            if (ctx && video.videoWidth && video.videoHeight) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

              const imageData = ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height
              );

              const code = jsQR(
                imageData.data,
                imageData.width,
                imageData.height
              );

              if (code && code.data !== lastScannedRef.current) {
                try {
                  const url = new URL(code.data);
                  lastScannedRef.current = code.data;
                  stopCamera();
                  window.location.href = url.toString();
                  return;
                } catch {
                  setErrorMsg("Scanned QR is not a valid URL");
                  stopCamera();
                }
              }
            }
          }
          animationFrameId = requestAnimationFrame(tick);
        };

        tick();
      } catch (err) {
        console.error(err);
        setErrorMsg("Camera access denied or not available.");
      }
    };

    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="flex flex-col justify-center items-center">
      <canvas ref={canvasRef} className="hidden" />

      <video
        ref={videoRef}
        className="w-full max-w-sm rounded-lg border shadow"
        playsInline
        muted
      />

      {errorMsg && <p className="text-red-500 text-sm my-2">{errorMsg}</p>}
    </div>
  );
}
