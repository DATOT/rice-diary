"use client";

import { useEffect, useRef, useState } from "react";
import { FaCamera, FaSpinner } from "react-icons/fa";
import { writeFile, mkdir, BaseDirectory } from "@tauri-apps/plugin-fs";
import { appDataDir } from "@tauri-apps/api/path";
import { useNoteCreation } from "../contexts/NoteCreationContext";
import { useRouter, useSearchParams } from "next/navigation";
import { MdArrowForwardIos } from "react-icons/md";
import { ThumbnailStep } from "../note/create/ThumbnailStep";

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const capturePaths = useRef<string[]>([]);
  const { leafPaths, setLeafPaths, thumbnailPath, setThumbnailPath } =
    useNoteCreation();
  const searchParams = useSearchParams();
  const step = searchParams.get("step");

  const router = useRouter();

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            // Prefer the back camera; browsers fall back to any available camera
            facingMode: { ideal: "environment" },
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraActive(true);
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError("Could not access camera. Please check permissions.");
      }
    }

    startCamera();

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const captureImage = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !isCameraActive) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsSaving(true);
    setError(null);

    try {
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      const size = Math.min(videoWidth, videoHeight);
      const sourceX = (videoWidth - size) / 2;
      const sourceY = (videoHeight - size) / 2;
      const outputSize = 800;

      canvas.width = outputSize;
      canvas.height = outputSize;

      ctx.drawImage(
        video,
        sourceX,
        sourceY,
        size,
        size,
        0,
        0,
        outputSize,
        outputSize,
      );

      // Get raw bytes instead of a data URL for Tauri FS
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
          "image/jpeg",
          0.9,
        );
      });

      const bytes = new Uint8Array(await blob.arrayBuffer());
      const filename = `captures/leaf_${Date.now()}.jpg`;

      const appData = await appDataDir();
      const capturePath = `${appData}/${filename}`;

      // Ensure the directory exists (recursive: true makes it idempotent)
      await mkdir("captures", {
        baseDir: BaseDirectory.AppData,
        recursive: true,
      });

      await writeFile(capturePath, bytes);
      if (step == "thumbnail") {
        setThumbnailPath(capturePath);
        router.back();
      }
      capturePaths.current.push(capturePath);
    } catch (err) {
      console.error("Capture/save error:", err);
      setError(String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const finishCapturing = () => {
    setLeafPaths([...leafPaths, ...capturePaths.current]);
    router.back();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-200 p-4 gap-6">
      {error ? (
        <div className="alert alert-error w-full max-w-md">
          <span>{error}</span>
        </div>
      ) : (
        <div className="relative w-full max-w-xs sm:max-w-md aspect-square bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-base-300">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Optional square guide overlay */}
          <div className="absolute inset-4 border-2 border-white/30 rounded-2xl pointer-events-none" />
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      <div className="grid grid-cols-3 items-center gap-6">
        <div />
        <button
          onClick={captureImage}
          disabled={!isCameraActive || isSaving}
          className="btn btn-primary btn-circle btn-lg shadow-lg"
          aria-label="Capture photo"
        >
          {isSaving ? (
            <FaSpinner className="animate-spin" size={24} />
          ) : (
            <FaCamera size={24} />
          )}
        </button>

        <button
          onClick={finishCapturing}
          disabled={!isCameraActive || isSaving}
          className="btn btn-secondary btn-circle btn-lg shadow-lg"
          aria-label="Return"
        >
          <MdArrowForwardIos size={24} />
        </button>
      </div>

      <p className="text-sm text-base-content/60">
        {isSaving ? "Đang lứu..." : "Ấn để chụp"}
      </p>
    </div>
  );
}
