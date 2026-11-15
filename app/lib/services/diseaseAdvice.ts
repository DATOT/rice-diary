// Dữ liệu tĩnh về bệnh lúa + gợi ý xử lý (có một chút ngẫu nhiên nhưng ổn định theo "seed").

export type TipGroup = "Canh tác" | "Phân bón" | "Thuốc BVTV" | "Theo dõi";

export interface Tip {
  group: TipGroup;
  text: string;
  /** Gợi ý cốt lõi: luôn xuất hiện, không bị random bỏ qua. */
  core?: boolean;
}

export interface DiseaseInfo {
  key: string;
  name: string;
  cause: string;
  symptoms: string;
  color: string;
  tips: Tip[];
}

export const DISEASE_COLORS = {
  Bacteria_Leaf_Blight: "#2563eb",
  Brown_Spot: "#b45309",
  Leaf_smut: "#7c3aed",
} as const;

const DISEASES: Record<string, DiseaseInfo> = {
  bacteria_leaf_blight: {
    key: "Bacteria_Leaf_Blight",
    name: "Bạc lá do vi khuẩn (cháy bìa lá)",
    cause: "Vi khuẩn Xanthomonas oryzae pv. oryzae, lây qua nước, gió mưa và vết thương trên lá.",
    symptoms: "Vệt úa vàng hoặc xám trắng chạy dọc mép lá, lan dần vào gân giữa; sáng sớm có thể thấy giọt dịch vàng.",
    color: DISEASE_COLORS.Bacteria_Leaf_Blight,
    tips: [
      { group: "Phân bón", core: true, text: "Giảm bón đạm, chia nhỏ nhiều lần; tránh bón thừa đạm khi ruộng đang có bệnh." },
      { group: "Canh tác", core: true, text: "Giữ mực nước ổn định, tháo cạn nước tù đọng; không để nước từ ruộng bệnh chảy sang ruộng khỏe." },
      { group: "Phân bón", text: "Bổ sung kali cân đối để tăng sức chống chịu cho cây." },
      { group: "Canh tác", text: "Hạn chế làm tổn thương lá (cắt tỉa, đi lại nhiều trong ruộng) sau mưa bão." },
      { group: "Canh tác", text: "Vụ sau chọn giống kháng bệnh, xử lý hạt giống trước khi gieo." },
      { group: "Thuốc BVTV", text: "Có thể dùng thuốc gốc đồng hoặc chế phẩm sinh học khi bệnh mới xuất hiện; luôn đọc kỹ nhãn và hỏi cán bộ BVTV địa phương." },
      { group: "Theo dõi", text: "Kiểm tra ruộng sau mỗi trận mưa lớn hoặc gió mạnh, đánh dấu những khu vực có vệt úa mới." },
      { group: "Canh tác", text: "Vệ sinh đồng ruộng, dọn rơm rạ và cỏ dại là nơi mang mầm bệnh sau thu hoạch." },
    ],
  },
  brown_spot: {
    key: "Brown_Spot",
    name: "Đốm nâu",
    cause: "Nấm Bipolaris oryzae, thường bùng phát khi cây thiếu dinh dưỡng, đất nghèo hoặc thiếu nước.",
    symptoms: "Đốm tròn hoặc bầu dục màu nâu, có tâm xám nhạt và viền vàng nhạt trên lá.",
    color: DISEASE_COLORS.Brown_Spot,
    tips: [
      { group: "Phân bón", core: true, text: "Bón phân cân đối N-P-K, đặc biệt bổ sung kali và silic; cây thiếu dinh dưỡng rất dễ bị đốm nâu." },
      { group: "Canh tác", core: true, text: "Giữ đủ nước cho ruộng, tránh để đất khô hạn kéo dài." },
      { group: "Canh tác", text: "Xử lý hạt giống (ngâm nước ấm hoặc thuốc xử lý hạt) trước khi gieo." },
      { group: "Phân bón", text: "Cải tạo đất bằng phân hữu cơ hoặc vôi nếu đất chua, nghèo mùn." },
      { group: "Canh tác", text: "Dọn rơm rạ bệnh và cỏ dại quanh bờ ruộng để giảm nguồn nấm." },
      { group: "Thuốc BVTV", text: "Khi bệnh nặng có thể dùng thuốc trừ nấm nhóm triazole hoặc strobilurin theo hướng dẫn trên nhãn." },
      { group: "Theo dõi", text: "Theo dõi thêm 5–7 ngày; nếu đốm lan sang nhiều lá, hãy tham khảo cán bộ khuyến nông." },
      { group: "Canh tác", text: "Không gieo sạ quá dày để ruộng thông thoáng, giảm độ ẩm trên tán lá." },
    ],
  },
  leaf_smut: {
    key: "Leaf_smut",
    name: "Than lá (muội đen lá)",
    cause: "Nấm Entyloma oryzae, hay gặp ở ruộng bón thừa đạm và độ ẩm cao.",
    symptoms: "Các chấm nhỏ màu đen, hơi nổi, rải rác trên phiến lá; lá bệnh nặng sẽ vàng và khô sớm.",
    color: DISEASE_COLORS.Leaf_smut,
    tips: [
      { group: "Phân bón", core: true, text: "Giảm lượng đạm, tăng kali; tránh bón đạm dồn vào một lần." },
      { group: "Canh tác", core: true, text: "Giữ ruộng thông thoáng, gieo cấy mật độ vừa phải để giảm ẩm độ." },
      { group: "Canh tác", text: "Sau thu hoạch, thu gom và xử lý rơm rạ nhiễm bệnh (ủ hoặc đốt theo quy định)." },
      { group: "Canh tác", text: "Luân canh hoặc để đất nghỉ nếu ruộng bị nhiễm nặng nhiều vụ liên tiếp." },
      { group: "Thuốc BVTV", text: "Chỉ phun thuốc trừ nấm khi bệnh lan rộng; chọn thuốc đã đăng ký và tuân thủ thời gian cách ly." },
      { group: "Theo dõi", text: "Chụp lại cùng vị trí lá sau vài ngày để so sánh mức độ lan của các chấm đen." },
      { group: "Canh tác", text: "Dùng hạt giống sạch bệnh, có nguồn gốc rõ ràng cho vụ tiếp theo." },
    ],
  },
};

export function normalizeClass(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return key === "bacterial_leaf_blight" ? "bacteria_leaf_blight" : key;
}

const FALLBACK_COLORS = ["#dc2626", "#0891b2", "#65a30d", "#db2777"];

export function getDiseaseInfo(raw: string): DiseaseInfo {
  const known = DISEASES[normalizeClass(raw)];
  if (known) return known;
  const hash = hashString(raw);
  return {
    key: raw,
    name: raw.replace(/_/g, " "),
    cause: "Chưa có thông tin chi tiết cho loại bệnh này.",
    symptoms: "Hãy đối chiếu thêm với cán bộ khuyến nông hoặc tài liệu chuyên ngành.",
    color: FALLBACK_COLORS[hash % FALLBACK_COLORS.length],
    tips: [
      { group: "Theo dõi", core: true, text: "Theo dõi diễn biến thêm vài ngày và chụp lại để so sánh." },
      { group: "Canh tác", core: true, text: "Hỏi cán bộ bảo vệ thực vật địa phương trước khi dùng thuốc." },
    ],
  };
}

/** Khóa chuẩn hóa để gom nhóm (dùng cho dropdown, biểu đồ). */
export function diseaseKey(raw: string): string {
  return getDiseaseInfo(raw).key;
}

export function diseaseName(raw: string): string {
  return getDiseaseInfo(raw).name;
}

export function diseaseColor(raw: string): string {
  return getDiseaseInfo(raw).color;
}

export const KNOWN_DISEASE_KEYS = Object.values(DISEASES).map((d) => d.key);

// ---------- random có seed ----------
function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickTips(pool: Tip[], count: number, seed: string): Tip[] {
  const rand = mulberry32(hashString(seed));
  const core = pool.filter((t) => t.core);
  const rest = pool.filter((t) => !t.core);
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [...core, ...rest].slice(0, Math.max(count, core.length));
}

export function getDiseaseTips(raw: string, seed: string, count = 4): Tip[] {
  return pickTips(getDiseaseInfo(raw).tips, count, `${normalizeClass(raw)}:${seed}`);
}

// ---------- thiếu hụt đạm ----------
export type NitrogenLevelKey = "low" | "medium" | "high";

export interface NitrogenLevel {
  key: NitrogenLevelKey;
  label: string;
  color: string;
}

export const NITROGEN_LEVELS: NitrogenLevel[] = [
  { key: "low", label: "Nhẹ (dưới 20%)", color: "#16a34a" },
  { key: "medium", label: "Trung bình (20–50%)", color: "#f59e0b" },
  { key: "high", label: "Nặng (trên 50%)", color: "#dc2626" },
];

export function nitrogenLevel(value: number): NitrogenLevel {
  if (value < 20) return NITROGEN_LEVELS[0];
  if (value < 50) return NITROGEN_LEVELS[1];
  return NITROGEN_LEVELS[2];
}

const NITROGEN_TIPS: Record<NitrogenLevelKey, { summary: string; tips: Tip[] }> = {
  low: {
    summary: "Lá chỉ thiếu đạm nhẹ, cây vẫn phát triển ổn định.",
    tips: [
      { group: "Theo dõi", core: true, text: "Duy trì lịch bón hiện tại và theo dõi màu lá bằng bảng so màu lá (LCC) mỗi 7–10 ngày." },
      { group: "Phân bón", text: "Chưa cần bón thêm đạm; có thể bổ sung phân hữu cơ hoai mục để giữ độ phì cho đất." },
      { group: "Canh tác", text: "Giữ mực nước hợp lý để rễ hấp thu dinh dưỡng tốt." },
      { group: "Theo dõi", text: "Chụp lại lá vào cùng giờ mỗi ngày để so sánh xu hướng." },
    ],
  },
  medium: {
    summary: "Cây thiếu đạm ở mức trung bình, lá bắt đầu nhạt màu.",
    tips: [
      { group: "Phân bón", core: true, text: "Bón thúc đạm với liều vừa phải, chia 2–3 lần theo giai đoạn đẻ nhánh và làm đòng." },
      { group: "Phân bón", text: "Kết hợp kali để cây hấp thu đạm hiệu quả và cứng cáp hơn." },
      { group: "Canh tác", text: "Rút nước nhẹ rồi cấp lại sau khi bón để giảm thất thoát đạm." },
      { group: "Phân bón", text: "Có thể phun phân bón lá chứa đạm theo hướng dẫn trên nhãn nếu cần phục hồi nhanh." },
      { group: "Theo dõi", text: "Kiểm tra lại sau 5–7 ngày; nếu lá vẫn vàng, đánh giá thêm độ chua và độ ngập nước của đất." },
    ],
  },
  high: {
    summary: "Cây thiếu đạm nặng, lá vàng rõ và sinh trưởng chậm.",
    tips: [
      { group: "Phân bón", core: true, text: "Bón bổ sung đạm sớm nhưng chia nhỏ nhiều lần, không dồn một lần để tránh sâu bệnh bùng phát." },
      { group: "Canh tác", core: true, text: "Kiểm tra nguyên nhân khác: úng nước, đất phèn, rễ bị hại hoặc thiếu lưu huỳnh/kẽm." },
      { group: "Phân bón", text: "Kết hợp phân hữu cơ hoặc phân vi sinh để cải thiện khả năng giữ dinh dưỡng của đất." },
      { group: "Phân bón", text: "Phun urê nồng độ thấp (theo hướng dẫn) lên lá để cây phục hồi nhanh." },
      { group: "Theo dõi", text: "Theo dõi mỗi 3–4 ngày và chụp lại để so sánh mức độ phục hồi." },
    ],
  },
};

export interface NitrogenAdvice {
  level: NitrogenLevel;
  summary: string;
  tips: Tip[];
  warning: string | null;
}

export function getNitrogenAdvice(value: number, seed: string, hasDisease = false, count = 3): NitrogenAdvice {
  const level = nitrogenLevel(value);
  const entry = NITROGEN_TIPS[level.key];
  return {
    level,
    summary: entry.summary,
    tips: pickTips(entry.tips, count, `n:${level.key}:${seed}`),
    warning:
      hasDisease && level.key !== "low"
        ? "Lá vừa thiếu đạm vừa có bệnh: hãy bón đạm chia nhỏ, vì bón dồn nhiều đạm có thể làm bệnh nặng hơn."
        : null,
  };
}
