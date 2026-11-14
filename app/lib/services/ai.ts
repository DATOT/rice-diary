import { invoke } from "@tauri-apps/api/core";
import { readFile } from "@tauri-apps/plugin-fs";

const DEBUG_AI = process.env.NODE_ENV !== "production";

// TODO: chuyển sang biến môi trường (import.meta.env.VITE_ROBOFLOW_KEY)
const ROBOFLOW_KEY = "cN2qnRFeJQvdQ1mFVNA7";
const ROBOFLOW_URL = "https://serverless.roboflow.com/rice-ybxoe/1";

export interface DiseasePrediction {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DiseaseDetectionResult {
  predictions: DiseasePrediction[];
  image?: { width: number; height: number };
}

function imageLabel(path: string): string {
  return path.split(/[\\/]/).pop() || "ảnh không tên";
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000; // tránh "Maximum call stack size exceeded"
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function analyzeLeaf(imagePath: string): Promise<number> {
  const label = imageLabel(imagePath);
  const startedAt = performance.now();
  if (DEBUG_AI) console.debug(`[ai] Bắt đầu phân tích ${label}`);
  try {
    const score = await invoke<number>("analyze_leaf", { imagePath });
    if (!Number.isFinite(score)) throw new Error(`Kết quả AI không hợp lệ: ${score}`);
    if (DEBUG_AI)
      console.debug(
        `[ai] Phân tích ${label} hoàn tất: ${score} (${Math.round(performance.now() - startedAt)} ms)`
      );
    return score;
  } catch (error) {
    console.error(
      `[ai] Phân tích ${label} thất bại sau ${Math.round(performance.now() - startedAt)} ms`,
      error
    );
    throw error;
  }
}

export async function detectDiseases(
  imagePath: string
): Promise<DiseaseDetectionResult> {
  const label = imageLabel(imagePath);
  const startedAt = performance.now();
  if (DEBUG_AI) console.debug(`[ai] Bắt đầu phát hiện bệnh cho ${label}`);

  try {
    // Đọc ảnh local -> base64 (Roboflow yêu cầu base64 hoặc URL công khai)
    const bytes = await readFile(imagePath);
    const base64 = bytesToBase64(bytes);

    const response = await fetch(ROBOFLOW_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ROBOFLOW_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: base64,
    });

    if (!response.ok) {
      throw new Error(`Roboflow request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as DiseaseDetectionResult;

    if (DEBUG_AI) {
      const count = data.predictions?.length ?? 0;
      console.debug(
        `[ai] Phát hiện ${label}: ${count} vùng bệnh (${Math.round(
          performance.now() - startedAt
        )} ms)`,
        data
      );
    }
    return data;
  } catch (error) {
    console.error(
      `[ai] Phát hiện ${label} thất bại sau ${Math.round(performance.now() - startedAt)} ms`,
      error
    );
    throw error;
  }
}
