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

function createSuccessMock(inputCode: string): AiScreenshotResult {
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
        rawText: "Mock：主力偏買",
        confidence: 88,
      },
      bigHolder: {
        value: "increase",
        rawText: "Mock：大戶持股增加",
        confidence: 85,
      },
      retail: {
        value: "decrease",
        rawText: "Mock：散戶持股下降",
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

function createErrorMock(inputCode: string): AiScreenshotResult {
  return {
    schemaVersion: "v2_ai_screenshot_v1",
    status: "error",
    meta: {
      inputCode,
      detectedCodes: [],
      isCodeMatched: false,
      overallConfidence: 0,
      warnings: [
        "INPUT_CODE_NOT_FOUND_IN_SCREENSHOT",
        "LOW_OVERALL_CONFIDENCE",
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
}

function sendJson(response: any, statusCode: number, data: any) {
  response.status(statusCode).json(data);
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
    const inputCode = String(body.inputCode || "").trim();
    const imageCount = Number(body.imageCount || 0);

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

    if (imageCount <= 0) {
      return sendJson(
        response,
        200,
        createErrorMock(inputCode)
      );
    }

    return sendJson(
      response,
      200,
      createSuccessMock(inputCode)
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