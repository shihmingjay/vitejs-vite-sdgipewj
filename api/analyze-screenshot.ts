type AiSchemaVersion = "v2_ai_screenshot_v1";

type AiStatus =
  | "success"
  | "warning"
  | "error";

type ChipAction =
  | "buy"
  | "sell"
  | "neutral"
  | "unknown";

type HoldTrend =
  | "increase"
  | "decrease"
  | "flat"
  | "unknown";

type Cleanliness =
  | "good"
  | "normal"
  | "bad"
  | "unknown";

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
    (item) => !ALLOWED_MIME_TYPES.includes(String(item.mimeType || "").toLowerCase())
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

function createSuccessMock(
  inputCode: string,
  imageCount: number,
  totalBase64Length: number,
  note: string
): AiScreenshotResult {
  const noteText = note
    ? `｜備註：${note.slice(0, 80)}`
    : "";

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
        rawText: `Mock：後端收到 ${imageCount} 張截圖，主力偏買${noteText}`,
        confidence: 88,
      },
      bigHolder: {
        value: "increase",
        rawText: `Mock：圖片資料已送達後端，大戶持股增加`,
        confidence: 85,
      },
      retail: {
        value: "decrease",
        rawText: `Mock：base64總長度 ${totalBase64Length}，散戶持股下降`,
        confidence: 90,
      },
      institution: {
        value: "buy",
        rawText: "Mock：法人偏買",
        confidence: 82,
      },
      chipCleanliness: {
        value: "good",
        rawText: "Mock：籌碼結構乾淨",
        confidence: 80,
      },
    },
  };
}

function createErrorMock(
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
    chipsData: {
      mainForce: {
        value: "unknown",
        rawText,
        confidence: 0,
      },
      bigHolder: {
        value: "unknown",
        rawText,
        confidence: 0,
      },
      retail: {
        value: "unknown",
        rawText,
        confidence: 0,
      },
      institution: {
        value: "unknown",
        rawText,
        confidence: 0,
      },
      chipCleanliness: {
        value: "unknown",
        rawText,
        confidence: 0,
      },
    },
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
        createErrorMock(
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
        createErrorMock(
          inputCode,
          mapValidationErrorsToWarnings(validation.errors),
          `圖片驗證失敗：${validation.errors.join("、")}`
        )
      );
    }

    return sendJson(
      response,
      200,
      createSuccessMock(
        inputCode,
        images.length,
        validation.totalBase64Length,
        note
      )
    );
  } catch (error: any) {
    return sendJson(
      response,
      500,
      {
        error: "SERVER_ERROR",
        message: error?.message || "Unknown server error.",
      }
    );
  }
}