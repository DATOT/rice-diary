import { invoke } from "@tauri-apps/api/core";

export async function analyzeLeaf(imagePath: string): Promise<number> {
  try {
    const score = await invoke<number>("analyze_leaf", { imagePath });
    console.log("Deficiency score:", score);
    return score;
  } catch (err) {
    // err is whatever you returned in Err(...) — a String here
    console.error("analyze_leaf failed:", err);
    throw err;
  }
}
