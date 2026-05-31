// ==========================================
// V2 AI Screenshot Schema V1
// 負責定義、驗證 AI 截圖辨識結果，並轉換為 V2 籌碼評分
// ==========================================

export type AiSchemaVersion = "v2_ai_screenshot_v1";

export type AiStatus =
  | "success"
  | "warning"
  | "error";

export type ChipAction =
  | "buy"
  | "sell"
  | "neutral"
  | "unknown";

export type HoldTrend =
  | "increase"
  | "decrease"
  | "flat"
  | "unknown";

export type Cleanliness =
  | "good"
  | "normal"
  | "bad"
  | "unknown";

export type AiWarningCode =
  | "DETECTED_MULTIPLE_CODES"
  | "INPUT_CODE_NOT_FOUND_IN_SCREENSHOT"
  | "LOW_OVERALL_CONFIDENCE"
  | "BLURRY_IMAGE"
  | "MISSING_MAIN_FORCE_DATA"
  | "MISSING_BIG_HOLDER_DATA"
  | "MISSING_RETAIL_DATA"
  | "MISSING_INSTITUTION_DATA"
  | "MISSING_CHIP_CLEANLINESS_DATA"
  | "CONFLICTING_SIGNALS";

export type ApplyStatus =
  | "CAN_APPLY"
  | "NEEDS_CONFIRMATION"
  | "CANNOT_APPLY";

export interface AiConfidenceData<T> {
  value: T;
  rawText: string;
  confidence: number;
}

export interface AiChipsData {
  mainForce: AiConfidenceData<ChipAction>;
  bigHolder: AiConfidenceData<HoldTrend>;
  retail: AiConfidenceData<HoldTrend>;
  institution: AiConfidenceData<ChipAction>;
  chipCleanliness: AiConfidenceData<Cleanliness>;
}

export interface AiScreenshotResult {
  schemaVersion: AiSchemaVersion;
  status: AiStatus;
  meta: {
    inputCode: string;
    detectedCodes: string[];
    isCodeMatched: boolean;
    overallConfidence: number;
    warnings: AiWarningCode[];
  };
  chipsData: AiChipsData;
}

export interface V2HybridScores {
  mainForceScore: number;
  institutionScore: number;
  bigHolderScore: number;
  chipCleanlinessScore: number;
  sourceLabel: string;
  canApply: boolean;
  applyStatus: ApplyStatus;
  warnings: AiWarningCode[];
}

export const EMPTY_AI_SCREENSHOT_RESULT: AiScreenshotResult = {
  schemaVersion: "v2_ai_screenshot_v1",
  status: "error",
  meta: {
    inputCode: "",
    detectedCodes: [],
    isCodeMatched: false,
    overallConfidence: 0,
    warnings: [
      "INPUT_CODE_NOT_FOUND_IN_SCREENSHOT",
    ],
  },
  chipsData: {
    mainForce: {
      value: "unknown",
      rawText: "",
      confidence: 0,
    },
    bigHolder: {
      value: "unknown",
      rawText: "",
      confidence: 0,
    },
    retail: {
      value: "unknown",
      rawText: "",
      confidence: 0,
    },
    institution: {
      value: "unknown",
      rawText: "",
      confidence: 0,
    },
    chipCleanliness: {
      value: "unknown",
      rawText: "",
      confidence: 0,
    },
  },
};

function isValidCode(value: string) {
  return /^[0-9A-Za-z]+$/.test(
    String(value || "").trim()
  );
}

function clampConfidence(value: number) {
  if (Number.isNaN(value)) return 0;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(value)
    )
  );
}

function safeNumber(value: any) {
  const num = Number(value);

  if (Number.isNaN(num)) {
    return 0;
  }

  return num;
}

function safeString(value: any) {
  return String(value || "").trim();
}

function hasCriticalWarning(warnings: AiWarningCode[]) {
  return (
    warnings.includes("DETECTED_MULTIPLE_CODES") ||
    warnings.includes("INPUT_CODE_NOT_FOUND_IN_SCREENSHOT") ||
    warnings.includes("CONFLICTING_SIGNALS")
  );
}

// ==========================================
// 1. 驗證與清洗 AI 結果
// ==========================================

export function normalizeAiScreenshotResult(
  input: Partial<AiScreenshotResult>
): AiScreenshotResult {
  const schemaVersion: AiSchemaVersion =
    input.schemaVersion === "v2_ai_screenshot_v1"
      ? "v2_ai_screenshot_v1"
      : "v2_ai_screenshot_v1";

  const status: AiStatus =
    input.status === "success" ||
    input.status === "warning" ||
    input.status === "error"
      ? input.status
      : "error";

  const inputCode = safeString(
    input.meta?.inputCode
  );

  const detectedCodes = Array.isArray(input.meta?.detectedCodes)
    ? input.meta.detectedCodes
        .map((code) => safeString(code))
        .filter((code) => code && isValidCode(code))
    : [];

  const warnings = Array.isArray(input.meta?.warnings)
    ? input.meta.warnings
    : [];

  const overallConfidence = clampConfidence(
    safeNumber(input.meta?.overallConfidence)
  );

  const isCodeMatched =
    Boolean(input.meta?.isCodeMatched) &&
    inputCode !== "" &&
    detectedCodes.includes(inputCode);

  return {
    schemaVersion,
    status,
    meta: {
      inputCode,
      detectedCodes,
      isCodeMatched,
      overallConfidence,
      warnings,
    },
    chipsData: {
      mainForce: normalizeConfidenceData(
        input.chipsData?.mainForce,
        "unknown"
      ),
      bigHolder: normalizeConfidenceData(
        input.chipsData?.bigHolder,
        "unknown"
      ),
      retail: normalizeConfidenceData(
        input.chipsData?.retail,
        "unknown"
      ),
      institution: normalizeConfidenceData(
        input.chipsData?.institution,
        "unknown"
      ),
      chipCleanliness: normalizeConfidenceData(
        input.chipsData?.chipCleanliness,
        "unknown"
      ),
    },
  };
}

function normalizeConfidenceData<T>(
  data: Partial<AiConfidenceData<T>> | undefined,
  defaultValue: T
): AiConfidenceData<T> {
  return {
    value:
      data && data.value !== undefined
        ? data.value
        : defaultValue,
    rawText: safeString(data?.rawText),
    confidence: clampConfidence(
      safeNumber(data?.confidence)
    ),
  };
}

// ==========================================
// 2. 套用規則與防呆
// ==========================================

export function checkApplicability(
  result: AiScreenshotResult
): ApplyStatus {
  const normalized = normalizeAiScreenshotResult(result);
  const { meta, status } = normalized;

  if (
    status === "error" ||
    !meta.isCodeMatched ||
    meta.overallConfidence < 60 ||
    hasCriticalWarning(meta.warnings)
  ) {
    return "CANNOT_APPLY";
  }

  if (
    status === "warning" ||
    (meta.overallConfidence >= 60 && meta.overallConfidence < 70) ||
    meta.warnings.some((warning) => warning.startsWith("MISSING_"))
  ) {
    return "NEEDS_CONFIRMATION";
  }

  if (
    status === "success" &&
    meta.isCodeMatched &&
    meta.overallConfidence >= 70
  ) {
    return "CAN_APPLY";
  }

  return "NEEDS_CONFIRMATION";
}

export function canApplyAiScreenshotResult(
  result: AiScreenshotResult
) {
  return checkApplicability(result) === "CAN_APPLY";
}

// ==========================================
// 3. AI Data 轉 V2 籌碼分數
// ==========================================

function safeMap<T>(
  data: AiConfidenceData<T>,
  mapper: (value: T) => number
): number {
  if (
    data.confidence < 60 ||
    data.value === "unknown"
  ) {
    return 5;
  }

  return mapper(data.value);
}

function mapChipAction(value: ChipAction) {
  if (value === "buy") return 8;
  if (value === "sell") return 2;
  return 5;
}

function mapBigHolderTrend(value: HoldTrend) {
  if (value === "increase") return 9;
  if (value === "decrease") return 2;
  return 5;
}

function mapRetailTrend(value: HoldTrend) {
  if (value === "decrease") return 9;
  if (value === "increase") return 2;
  return 5;
}

function mapCleanliness(value: Cleanliness) {
  if (value === "good") return 9;
  if (value === "bad") return 2;
  return 5;
}

function averageScores(scores: number[]) {
  if (!scores.length) return 5;

  const total = scores.reduce(
    (sum, score) => sum + score,
    0
  );

  return Math.round(
    total / scores.length
  );
}

export function convertAiResultToScores(
  result: AiScreenshotResult
): V2HybridScores {
  const normalized = normalizeAiScreenshotResult(result);
  const applyStatus = checkApplicability(normalized);

  if (applyStatus === "CANNOT_APPLY") {
    return {
      mainForceScore: 5,
      institutionScore: 5,
      bigHolderScore: 5,
      chipCleanlinessScore: 5,
      sourceLabel: "截圖AI辨識不可套用，維持中性分",
      canApply: false,
      applyStatus,
      warnings: normalized.meta.warnings,
    };
  }

  const mainForceScore = safeMap(
    normalized.chipsData.mainForce,
    mapChipAction
  );

  const institutionScore = safeMap(
    normalized.chipsData.institution,
    mapChipAction
  );

  const bigHolderScore = safeMap(
    normalized.chipsData.bigHolder,
    mapBigHolderTrend
  );

  const retailScore = safeMap(
    normalized.chipsData.retail,
    mapRetailTrend
  );

  const cleanScore = safeMap(
    normalized.chipsData.chipCleanliness,
    mapCleanliness
  );

  const chipCleanlinessScore = averageScores([
    retailScore,
    cleanScore,
  ]);

  return {
    mainForceScore,
    institutionScore,
    bigHolderScore,
    chipCleanlinessScore,
    sourceLabel:
      applyStatus === "CAN_APPLY"
        ? "截圖AI辨識"
        : "截圖AI辨識，需使用者確認",
    canApply: applyStatus === "CAN_APPLY",
    applyStatus,
    warnings: normalized.meta.warnings,
  };
}

// ==========================================
// 4. 建立給測試用的假資料
// ==========================================

export function createMockAiScreenshotResult(
  inputCode: string
): AiScreenshotResult {
  return {
    schemaVersion: "v2_ai_screenshot_v1",
    status: "success",
    meta: {
      inputCode,
      detectedCodes: [
        inputCode,
      ],
      isCodeMatched: true,
      overallConfidence: 82,
      warnings: [],
    },
    chipsData: {
      mainForce: {
        value: "buy",
        rawText: "主力偏買",
        confidence: 88,
      },
      bigHolder: {
        value: "increase",
        rawText: "大戶持股增加",
        confidence: 85,
      },
      retail: {
        value: "decrease",
        rawText: "散戶持股下降",
        confidence: 90,
      },
      institution: {
        value: "buy",
        rawText: "法人偏買",
        confidence: 82,
      },
      chipCleanliness: {
        value: "good",
        rawText: "籌碼結構乾淨",
        confidence: 80,
      },
    },
  };
}