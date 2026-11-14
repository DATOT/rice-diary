"use client";

import { useEffect, useRef, useState } from "react";
import { FaCamera, FaSpinner } from "react-icons/fa";
import { writeFile, mkdir, BaseDirectory } from "@tauri-apps/plugin-fs";
import { appDataDir } from "@tauri-apps/api/path";
import { useNoteCreation } from "../contexts/NoteCreationContext";
import { useRouter, useSearchParams } from "next/navigation";
import { MdArrowForwardIos } from "react-icons/md";

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const capturePaths = useRef<string[]>([]);
  const { leafPaths, setLeafPaths, setThumbnailPath } = useNoteCreation();
  const searchParams = useSearchParams();
  const step = searchParams.get("step");
  const router = useRouter();
  const returnedForPermission = useRef(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Thiết bị không hỗ trợ truy cập camera.");
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: { ideal: "environment" } }, audio: false });
        if (videoRef.current) { videoRef.current.srcObject = stream; setIsCameraActive(true); }
      } catch (reason) {
        console.error("Không thể truy cập camera:", reason);
        const message = "Không thể truy cập camera. Vui lòng cấp quyền camera rồi thử lại.";
        setError(message);
        if (!returnedForPermission.current) {
          returnedForPermission.current = true;
          window.alert(message);
          router.back();
        }
      }
    }
    void startCamera();
    return () => stream?.getTracks().forEach((track) => track.stop());
  }, [router]);

  const captureImage = async () => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || !isCameraActive) return;
    const context = canvas.getContext("2d"); if (!context) return;
    setIsSaving(true); setError(null);
    try {
      const width = video.videoWidth, height = video.videoHeight, size = Math.min(width, height);
      canvas.width = 800; canvas.height = 800;
      context.drawImage(video, (width - size) / 2, (height - size) / 2, size, size, 0, 0, 800, 800);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Không thể tạo ảnh.")), "image/jpeg", 0.9));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const filename = `captures/leaf_${Date.now()}.jpg`;
      const appData = await appDataDir(); const capturePath = `${appData}/${filename}`;
      await mkdir("captures", { baseDir: BaseDirectory.AppData, recursive: true });
      await writeFile(capturePath, bytes);
      if (step === "thumbnail") { setThumbnailPath(capturePath); router.back(); return; }
      capturePaths.current.push(capturePath);
    } catch (reason) { console.error("Lỗi chụp/lưu ảnh:", reason); setError(String(reason)); }
    finally { setIsSaving(false); }
  };
  const finishCapturing = () => { setLeafPaths([...leafPaths, ...capturePaths.current]); router.back(); };
  return <div className="flex flex-col items-center justify-center min-h-screen bg-base-200 p-4 gap-6">
    {error && <div className="alert alert-error w-full max-w-md"><span>{error}</span></div>}
    <div className="relative w-full max-w-xs sm:max-w-md aspect-square bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-base-300"><video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" /><div className="absolute inset-4 border-2 border-white/30 rounded-2xl pointer-events-none" /></div>
    <canvas ref={canvasRef} className="hidden" />
    <div className="grid grid-cols-3 items-center gap-6"><div /><button onClick={captureImage} disabled={!isCameraActive || isSaving} className="btn btn-primary btn-circle btn-lg shadow-lg" aria-label="Chụp ảnh">{isSaving ? <FaSpinner className="animate-spin" size={24} /> : <FaCamera size={24} />}</button><button onClick={finishCapturing} disabled={!isCameraActive || isSaving} className="btn btn-secondary btn-circle btn-lg shadow-lg" aria-label="Quay lại"><MdArrowForwardIos size={24} /></button></div>
    <p className="text-sm text-base-content/60">{isSaving ? "Đang lưu..." : "Nhấn để chụp"}</p>
  </div>;
}
