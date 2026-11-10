// src/nitrogen.rs

use std::path::Path;

use image::GenericImageView;
use image::Pixel;
use image::imageops::FilterType;
use ndarray::Array4;
use ort::session::Session;
use ort::value::Tensor;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// Model input resolution (matches `transforms.RandomResizedCrop(100)` and
/// `Resize((100, 100))` in the training notebook).
const TARGET_SIZE: u32 = 100;

/// ImageNet normalization — must match `transforms.Normalize(...)` in the
/// notebook's `data_transform['valid']`.
const IMAGENET_MEAN: [f32; 3] = [0.485, 0.456, 0.406];
const IMAGENET_STD: [f32; 3] = [0.229, 0.224, 0.225];

/// Severity anchors on the 0-100 scale, ordered by class index.
///
/// **CRITICAL**: These indices MUST match the alphabetical directory order
/// used during training (`classes.sort()` in the notebook):
///
/// | index | dir       | severity |
/// |-------|-----------|----------|
/// |   0   | "swap1"   | Healthy  |
/// |   1   | "swap2"   | Mild     |
/// |   2   | "swap3"   | Moderate |
/// |   3   | "swap4"   | Severe   |
///
/// These are *reference points*, not the output values. The final score is a
/// probability-weighted blend across all four, so it varies continuously.
const SEVERITY_ANCHORS: [f32; 4] = [0.0, 33.3, 66.7, 100.0];

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

/// Numerically stable softmax.
fn softmax(logits: &[f32]) -> Vec<f32> {
	let max = logits.iter().copied().fold(f32::NEG_INFINITY, f32::max);
	let exp: Vec<f32> = logits
		.iter()
		.map(|x| (x - max).exp())
		.collect();
	let sum: f32 = exp.iter().sum();

	if sum <= 0.0 {
		// Defensive: avoid NaN if the model outputs something pathological.
		return vec![1.0 / logits.len() as f32; logits.len()];
	}

	exp
		.iter()
		.map(|x| x / sum)
		.collect()
}

/// Probability-weighted expected value across the ordinal severity anchors.
///
/// Returns a value in `[0.0, 100.0]` that varies smoothly with the whole
/// probability distribution — a confident "Mild" lands near 33, an uncertain
/// "Mild vs Moderate" lands in between, etc.
fn calculate_continuous_deficiency_score(probabilities: &[f32]) -> Result<f64, String> {
	if probabilities.len() != SEVERITY_ANCHORS.len() {
		return Err(
			format!(
				"Expected exactly {} class probabilities, got {}",
				SEVERITY_ANCHORS.len(),
				probabilities.len()
			)
		);
	}

	let score: f32 = probabilities
		.iter()
		.zip(SEVERITY_ANCHORS.iter())
		.map(|(p, anchor)| p * anchor)
		.sum();

	Ok(score.clamp(0.0, 100.0) as f64)
}

/// Shannon entropy (in nats) of the probability distribution.
/// 0 = fully confident, `ln(4) ≈ 1.386` = maximally uncertain.
fn shannon_entropy(probabilities: &[f32]) -> f32 {
	-probabilities
		.iter()
		.filter(|p| **p > 0.0)
		.map(|p| p * p.ln())
		.sum::<f32>()
}

// ---------------------------------------------------------------------------
// Public service
// ---------------------------------------------------------------------------

/// Analyzes a leaf image for nitrogen deficiency.
///
/// Returns a continuous deficiency score in `[0.0, 100.0]` where
/// `0` = healthy and `100` = severe.
pub fn analyze_nitrogen_deficiency_service<P: AsRef<Path>>(
	session: &mut Session,
	image_path: P
) -> Result<f64, String> {
	// --- 1. Load & preprocess ------------------------------------------------
	let img = image::open(image_path.as_ref()).map_err(|e| e.to_string())?;
	let img_resized = img.resize_exact(TARGET_SIZE, TARGET_SIZE, FilterType::Lanczos3);

	let mut input_array = Array4::<f32>::zeros((1, 3, TARGET_SIZE as usize, TARGET_SIZE as usize));

	for (x, y, pixel) in img_resized.pixels() {
		let rgb = pixel.to_rgb();
		for c in 0..3 {
			let normalized = ((rgb[c] as f32) / 255.0 - IMAGENET_MEAN[c]) / IMAGENET_STD[c];
			input_array[[0, c, y as usize, x as usize]] = normalized;
		}
	}

	// --- 2. ONNX inference ---------------------------------------------------
	let input_tensor = Tensor::from_array(input_array).map_err(|e| e.to_string())?;
	let outputs = session.run(ort::inputs!["input" => input_tensor]).map_err(|e| e.to_string())?;

	let (_shape, logits) = outputs["output"].try_extract_tensor::<f32>().map_err(|e| e.to_string())?;

	// --- 3. Post-process -----------------------------------------------------
	let probabilities = softmax(logits);

	// Human-readable diagnostics (visible when running `tauri dev`).
	if
		let Some((idx, p)) = probabilities
			.iter()
			.enumerate()
			.max_by(|a, b| a.1.total_cmp(b.1))
	{
		println!("Top class: {} ({:.2}% confidence)", idx, p * 100.0);
	}
	println!("Class probabilities: {:?}", probabilities);

	let deficiency_score = calculate_continuous_deficiency_score(&probabilities)?;
	let uncertainty = shannon_entropy(&probabilities);

	println!(
		"Nitrogen deficiency score: {:.2}/100 (uncertainty: {:.3} nats, max {:.3})",
		deficiency_score,
		uncertainty,
		(4.0f32).ln()
	);

	Ok(100.0 - deficiency_score)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn softmax_sums_to_one() {
		let p = softmax(&[1.0, 2.0, 3.0, 4.0]);
		let sum: f32 = p.iter().sum();
		assert!((sum - 1.0).abs() < 1e-5);
	}

	#[test]
	fn softmax_is_stable_for_large_logits() {
		let p = softmax(&[1000.0, 1001.0, 1002.0, 1003.0]);
		assert!(p.iter().all(|v| v.is_finite()));
		let sum: f32 = p.iter().sum();
		assert!((sum - 1.0).abs() < 1e-5);
	}

	#[test]
	fn score_healthy_confident() {
		let s = calculate_continuous_deficiency_score(&[0.95, 0.05, 0.0, 0.0]).unwrap();
		assert!(s < 2.0, "expected ~1.67, got {s}");
	}

	#[test]
	fn score_mild_confident() {
		let s = calculate_continuous_deficiency_score(&[0.0, 0.95, 0.05, 0.0]).unwrap();
		// 0.95*33.3 + 0.05*66.7 = 31.665 + 3.335 = 35.0
		assert!((s - 35.0).abs() < 0.1);
	}

	#[test]
	fn score_uncertain_sits_in_middle() {
		let s = calculate_continuous_deficiency_score(&[0.25, 0.25, 0.25, 0.25]).unwrap();
		// mean of [0, 33.3, 66.7, 100] = 50
		assert!((s - 50.0).abs() < 0.1);
	}

	#[test]
	fn score_moderate_vs_severe_split() {
		let s = calculate_continuous_deficiency_score(&[0.0, 0.0, 0.55, 0.45]).unwrap();
		// 0.55*66.7 + 0.45*100 = 36.685 + 45 = 81.685
		assert!((s - 81.685).abs() < 0.1);
	}

	#[test]
	fn score_severe_confident() {
		let s = calculate_continuous_deficiency_score(&[0.0, 0.0, 0.05, 0.95]).unwrap();
		// 0.05*66.7 + 0.95*100 = 3.335 + 95 = 98.335
		assert!((s - 98.335).abs() < 0.1);
	}

	#[test]
	fn score_rejects_wrong_class_count() {
		assert!(calculate_continuous_deficiency_score(&[0.5, 0.5]).is_err());
	}

	#[test]
	fn entropy_fully_confident_is_zero() {
		let e = shannon_entropy(&[1.0, 0.0, 0.0, 0.0]);
		assert!(e.abs() < 1e-6);
	}

	#[test]
	fn entropy_uniform_is_log4() {
		let e = shannon_entropy(&[0.25, 0.25, 0.25, 0.25]);
		assert!((e - (4.0f32).ln()).abs() < 1e-5);
	}
}
