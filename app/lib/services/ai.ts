import { invoke } from "@tauri-apps/api/core";

const DEBUG_AI = process.env.NODE_ENV !== "production";

function imageLabel(path: string): string {
  // Avoid printing the full local filesystem path in logs.
  return path.split(/[\\/]/).pop() || "ảnh không tên";
}

export async function analyzeLeaf(imagePath: string): Promise<number> {
  const label = imageLabel(imagePath);
  const startedAt = performance.now();
  if (DEBUG_AI) console.debug(`[ai] Bắt đầu phân tích ${label}`);
  try {
    const score = await invoke<number>("analyze_leaf", { imagePath });
    if (!Number.isFinite(score)) throw new Error(`Kết quả AI không hợp lệ: ${score}`);
    if (DEBUG_AI) console.debug(`[ai] Phân tích ${label} hoàn tất: ${score} (${Math.round(performance.now() - startedAt)} ms)`);
    return score;
  } catch (error) {
    console.error(`[ai] Phân tích ${label} thất bại sau ${Math.round(performance.now() - startedAt)} ms`, error);
    throw error;
  }
}
