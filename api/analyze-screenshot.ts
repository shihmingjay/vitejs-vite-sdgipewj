type AiSchemaVersion = "v2_ai_screenshot_v1";

type AiStatus = "success" | "warning" | "error";

type ChipAction = "buy" | "sell" | "neutral" | "unknown";
type HoldTrend = "increase" | "decrease" | "flat" | "unknown";
type Cleanliness = "good" | "normal" | "bad" | "unknown";

type AiWarningCode =
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

type AiConfidenceData<T> = {
  value: T;
  rawText: string;
  confidence: number;
};

type ScreenshotPayloadItem = {
  fileName?: string;
  mimeType?: string;
  base64?: string;
};

type AiScreenshotResult = {
  schemaVersion: AiSchemaVersion;
  status: AiStatus;
  meta: {
    inputCode: string;
    detectedCodes: string[];
    isCodeMatched: boolean;
    overallConfidence: number;
    warnings: AiWarningCode[];
  };
  chipsData: {
    mainForce: AiConfidenceData<ChipAction>;
    bigHolder: AiConfidenceData<HoldTrend>;
    retail: AiConfidenceData<HoldTrend>;
    institution: AiConfidenceData<ChipAction>;
    chipCleanliness: AiConfidenceData<Cleanliness>;
  };
};

const MAX_IMAGE_COUNT = 6;
const MAX_TOTAL_BASE64_LENGTH = 12_000_000;
const OPENAI_MODEL = "gpt-4.1-mini";

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

function sendJson(response: any, statusCode: number, data: any) {
  response.status(statusCode).json(data);
}

function safeString(value: any) {
  return String(value || "").trim();
}

function isValidInputCode(value: string) {
  return /^[0-9A-Za-z]+$/.test(value);
}

function normalizeImages(images: any): ScreenshotPayloadItem[] {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((item) => ({
      fileName: safeString(item?.fileName),
      mimeType: safeString(item?.mimeType),
      base64: safeString(item?.base64),
    }))
    .filter((item) => item.base64 !== "");
}

function validateImages(images: ScreenshotPayloadItem[]) {
  const errors: string[] = [];

  if (images.length <= 0) {
    errors.push("NO_IMAGES_PROVIDED");
  }

  if (images.length > MAX_IMAGE_COUNT) {
    errors.push("TOO_MANY_IMAGES");
  }

  const invalidMime = images.some(
    (item) =>
      !ALLOWED_MIME_TYPES.includes(
        String(item.mimeType || "").toLowerCase()
      )
  );

  if (invalidMime) {
    errors.push("INVALID_IMAGE_TYPE");
  }

  const totalBase64Length = images.reduce(
    (sum, item) => sum + String(item.base64 || "").length,
    0
  );

  if (totalBase64Length > MAX_TOTAL_BASE64_LENGTH) {
    errors.push("IMAGES_TOO_LARGE");
  }

  return {
    valid: errors.length === 0,
    errors,
    totalBase64Length,
  };
}

function createEmptyChipsData(rawText: string) {
  return {
    mainForce: {
      value: "unknown" as ChipAction,
      rawText,
      confidence: 0,
    },
    bigHolder: {
      value: "unknown" as HoldTrend,
      rawText,
      confidence: 0,
    },
    retail: {
      value: "unknown" as HoldTrend,
      rawText,
      confidence: 0,
    },
    institution: {
      value: "unknown" as ChipAction,
      rawText,
      confidence: 0,
    },
    chipCleanliness: {
      value: "unknown" as Cleanliness,
      rawText,
      confidence: 0,
    },
  };
}

function createErrorResult(
  inputCode: string,
  warnings: AiWarningCode[],
  rawText: string
): AiScreenshotResult {
  return {
    schemaVersion: "v2_ai_screenshot_v1",
    status: "error",
    meta: {
      inputCode,
      detectedCodes: [],
      isCodeMatched: false,
      overallConfidence: 0,
      warnings,
    },
    chipsData: createEmptyChipsData(rawText),
  };
}

function mapValidationErrorsToWarnings(errors: string[]): AiWarningCode[] {
  const warnings: AiWarningCode[] = [];

  if (
    errors.includes("NO_IMAGES_PROVIDED") ||
    errors.includes("INVALID_IMAGE_TYPE")
  ) {
    warnings.push("INPUT_CODE_NOT_FOUND_IN_SCREENSHOT");
  }

  if (
    errors.includes("TOO_MANY_IMAGES") ||
    errors.includes("IMAGES_TOO_LARGE")
  ) {
    warnings.push("LOW_OVERALL_CONFIDENCE");
  }

  if (warnings.length === 0) {
    warnings.push("LOW_OVERALL_CONFIDENCE");
  }

  return warnings;
}

function buildPrompt(inputCode: string, note: string) {
  return `
你是台股短線籌碼截圖辨識助手。

你的任務：
1. 只根據使用者提供的截圖內容判斷。
2. 不要猜測截圖中沒有出現的資料。
3. 只能輸出合法 JSON。
4. 不要輸出 markdown。
5. 不要輸出說明文字。
6. 如果截圖中出現多支股票代號，必須標記 DETECTED_MULTIPLE_CODES。
7. 如果截圖中沒有出現輸入股號 ${inputCode}，必須標記 INPUT_CODE_NOT_FOUND_IN_SCREENSHOT。
8. 如果某個欄位辨識信心低於 60，value 必須填 unknown。
9. rawText 必須保留你看到的原文或簡短描述。
10. 不允許自由創造 enum 以外的 value。

使用者輸入股號：
${inputCode}

使用者備註：
${note || "無"}

只允許輸出以下 JSON 格式：

{
  "schemaVersion": "v2_ai_screenshot_v1",
  "status": "success",
  "meta": {
    "inputCode": "${inputCode}",
    "detectedCodes": ["${inputCode}"],
    "isCodeMatched": true,
    "overallConfidence": 0,
    "warnings": []
  },
  "chipsData": {
    "mainForce": {
      "value": "buy",
      "rawText": "",
      "confidence": 0
    },
    "bigHolder": {
      "value": "increase",
      "rawText": "",
      "confidence": 0
    },
    "retail": {
      "value": "decrease",
      "rawText": "",
      "confidence": 0
    },
    "institution": {
      "value": "buy",
      "rawText": "",
      "confidence": 0
    },
    "chipCleanliness": {
      "value": "good",
      "rawText": "",
      "confidence": 0
    }
  }
}

status 只能是 success, warning, error。

mainForce.value / institution.value 只能是：
buy, sell, neutral, unknown。

bigHolder.value / retail.value 只能是：
increase, decrease, flat, unknown。

chipCleanliness.value 只能是：
good, normal, bad, unknown。

warnings 只能使用：
DETECTED_MULTIPLE_CODES
INPUT_CODE_NOT_FOUND_IN_SCREENSHOT
LOW_OVERALL_CONFIDENCE
BLURRY_IMAGE
MISSING_MAIN_FORCE_DATA
MISSING_BIG_HOLDER_DATA
MISSING_RETAIL_DATA
MISSING_INSTITUTION_DATA
MISSING_CHIP_CLEANLINESS_DATA
CONFLICTING_SIGNALS

判斷規則：
- mainForce buy：主力買超、主力增加、主力偏買。
- mainForce sell：主力賣超、主力減少、主力偏賣。
- institution buy：法人、外資、投信、自營商整體偏買。
- institution sell：法人、外資、投信、自營商整體偏賣。
- bigHolder increase：大戶持股增加。
- bigHolder decrease：大戶持股減少。
- retail decrease：散戶持股下降，代表籌碼較佳。
- retail increase：散戶持股增加，代表籌碼較差。
- chipCleanliness good：籌碼集中、大戶增加、散戶下降、主力偏買。
- chipCleanliness bad：籌碼凌亂、散戶增加、大戶下降、主力賣超。

請只輸出 JSON。
`;
}

function buildImageContent(images: ScreenshotPayloadItem[]) {
  return images.map((image) => ({
    type: "input_image",
    image_url: `data:${image.mimeType};base64,${image.base64}`,
  }));
}

function extractOutputText(openaiResult: any) {
  if (typeof openaiResult?.output_text === "string") {
    return openaiResult.output_text;
  }

  const output = Array.isArray(openaiResult?.output)
    ? openaiResult.output
    : [];

  const chunks: string[] = [];

  for (const item of output) {
    const content = Array.isArray(item?.content)
      ? item.content
      : [];

    for (const part of content) {
      if (typeof part?.text === "string") {
        chunks.push(part.text);
      }

      if (typeof part?.content === "string") {
        chunks.push(part.content);
      }
    }
  }

  return chunks.join("\n").trim();
}

function stripJsonFence(text: string) {
  return text
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
}

function safeParseAiJson(text: string) {
  const cleaned = stripJsonFence(text);

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }

    throw new Error("AI 回傳內容不是合法 JSON。");
  }
}

function clampConfidence(value: any) {
  const numberValue = Number(value || 0);

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(numberValue)
    )
  );
}

function normalizeConfidenceData(data: any, defaultValue: any) {
  return {
    value: data?.value || defaultValue,
    rawText: safeString(data?.rawText),
    confidence: clampConfidence(data?.confidence),
  };
}

function normalizeAiResult(inputCode: string, value: any): AiScreenshotResult {
  const warnings = Array.isArray(value?.meta?.warnings)
    ? value.meta.warnings
    : [];

  const detectedCodes = Array.isArray(value?.meta?.detectedCodes)
    ? value.meta.detectedCodes
        .map((code: any) => safeString(code))
        .filter(Boolean)
    : [];

  const isCodeMatched =
    Boolean(value?.meta?.isCodeMatched) &&
    detectedCodes.includes(inputCode);

  return {
    schemaVersion: "v2_ai_screenshot_v1",
    status:
      value?.status === "success" ||
      value?.status === "warning" ||
      value?.status === "error"
        ? value.status
        : "error",
    meta: {
      inputCode,
      detectedCodes,
      isCodeMatched,
      overallConfidence: clampConfidence(value?.meta?.overallConfidence),
      warnings,
    },
    chipsData: {
      mainForce: normalizeConfidenceData(
        value?.chipsData?.mainForce,
        "unknown"
      ),
      bigHolder: normalizeConfidenceData(
        value?.chipsData?.bigHolder,
        "unknown"
      ),
      retail: normalizeConfidenceData(
        value?.chipsData?.retail,
        "unknown"
      ),
      institution: normalizeConfidenceData(
        value?.chipsData?.institution,
        "unknown"
      ),
      chipCleanliness: normalizeConfidenceData(
        value?.chipsData?.chipCleanliness,
        "unknown"
      ),
    },
  };
}

async function callOpenAiVision(
  inputCode: string,
  note: string,
  images: ScreenshotPayloadItem[]
): Promise<AiScreenshotResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return createErrorResult(
      inputCode,
      [
        "LOW_OVERALL_CONFIDENCE",
      ],
      "後端尚未設定 OPENAI_API_KEY。"
    );
  }

  const prompt = buildPrompt(inputCode, note);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
            ...buildImageContent(images),
          ],
        },
      ],
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    return createErrorResult(
      inputCode,
      [
        "LOW_OVERALL_CONFIDENCE",
      ],
      `OpenAI API 錯誤：${result?.error?.message || "未知錯誤"}`
    );
  }

  const outputText = extractOutputText(result);

  if (!outputText) {
    return createErrorResult(
      inputCode,
      [
        "LOW_OVERALL_CONFIDENCE",
      ],
      "AI 沒有回傳可解析內容。"
    );
  }

  const parsed = safeParseAiJson(outputText);

  return normalizeAiResult(inputCode, parsed);
}

export default async function handler(request: any, response: any) {
  if (request.method !== "POST") {
    return sendJson(
      response,
      405,
      {
        error: "METHOD_NOT_ALLOWED",
        message: "Only POST is allowed.",
      }
    );
  }

  try {
    const body = request.body || {};
    const inputCode = safeString(body.inputCode);
    const note = safeString(body.note);
    const images = normalizeImages(body.images);
    const imageCount = Number(body.imageCount || images.length || 0);

    if (!inputCode) {
      return sendJson(
        response,
        400,
        {
          error: "MISSING_INPUT_CODE",
          message: "inputCode is required.",
        }
      );
    }

    if (!isValidInputCode(inputCode)) {
      return sendJson(
        response,
        400,
        {
          error: "INVALID_INPUT_CODE",
          message: "inputCode format is invalid.",
        }
      );
    }

    if (imageCount <= 0 || images.length <= 0) {
      return sendJson(
        response,
        200,
        createErrorResult(
          inputCode,
          [
            "INPUT_CODE_NOT_FOUND_IN_SCREENSHOT",
            "LOW_OVERALL_CONFIDENCE",
          ],
          "後端沒有收到圖片資料。"
        )
      );
    }

    const validation = validateImages(images);

    if (!validation.valid) {
      return sendJson(
        response,
        200,
        createErrorResult(
          inputCode,
          mapValidationErrorsToWarnings(validation.errors),
          `圖片驗證失敗：${validation.errors.join("、")}`
        )
      );
    }

    const aiResult = await callOpenAiVision(
      inputCode,
      note,
      images
    );

    return sendJson(
      response,
      200,
      aiResult
    );
  } catch (error: any) {
    return sendJson(
      response,
      200,
      createErrorResult(
        "",
        [
          "LOW_OVERALL_CONFIDENCE",
        ],
        `伺服器錯誤：${error?.message || "Unknown server error."}`
      )
    );
  }
}