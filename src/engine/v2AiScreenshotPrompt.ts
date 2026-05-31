import type { AiScreenshotResult } from "./v2AiScreenshotSchema";

export const V2_AI_SCREENSHOT_SCHEMA_VERSION = "v2_ai_screenshot_v1";

export function buildV2AiScreenshotPrompt(inputCode: string) {
  return `
你是台股短線籌碼截圖辨識助手。

你的任務：
1. 只根據使用者提供的截圖內容判斷。
2. 不要猜測截圖中沒有出現的資料。
3. 不要輸出解釋文字。
4. 只能輸出符合 JSON 格式的結果。
5. 嚴格遵守指定 schema。
6. 如果截圖中出現多支股票代號，必須標記 DETECTED_MULTIPLE_CODES。
7. 如果截圖中沒有出現輸入股號 ${inputCode}，必須標記 INPUT_CODE_NOT_FOUND_IN_SCREENSHOT。
8. 如果某個欄位辨識信心低於 60，value 必須填 unknown。
9. 欄位 rawText 必須保留你看到的原文或簡短描述。
10. 不允許自由創造 enum 以外的 value。

使用者輸入股號：
${inputCode}

你必須輸出的 JSON Schema：

{
  "schemaVersion": "v2_ai_screenshot_v1",
  "status": "success | warning | error",
  "meta": {
    "inputCode": "${inputCode}",
    "detectedCodes": ["股票代號"],
    "isCodeMatched": true,
    "overallConfidence": 0,
    "warnings": []
  },
  "chipsData": {
    "mainForce": {
      "value": "buy | sell | neutral | unknown",
      "rawText": "",
      "confidence": 0
    },
    "bigHolder": {
      "value": "increase | decrease | flat | unknown",
      "rawText": "",
      "confidence": 0
    },
    "retail": {
      "value": "increase | decrease | flat | unknown",
      "rawText": "",
      "confidence": 0
    },
    "institution": {
      "value": "buy | sell | neutral | unknown",
      "rawText": "",
      "confidence": 0
    },
    "chipCleanliness": {
      "value": "good | normal | bad | unknown",
      "rawText": "",
      "confidence": 0
    }
  }
}

status 規則：
- success：股號一致，資料清楚，overallConfidence >= 70。
- warning：股號一致，但有欄位缺漏、截圖模糊、overallConfidence 介於 60 到 69。
- error：無法辨識、股號不一致、截圖不是股票資料、overallConfidence < 60。

warnings 只能使用以下代碼：
- DETECTED_MULTIPLE_CODES
- INPUT_CODE_NOT_FOUND_IN_SCREENSHOT
- LOW_OVERALL_CONFIDENCE
- BLURRY_IMAGE
- MISSING_MAIN_FORCE_DATA
- MISSING_BIG_HOLDER_DATA
- MISSING_RETAIL_DATA
- MISSING_INSTITUTION_DATA
- MISSING_CHIP_CLEANLINESS_DATA
- CONFLICTING_SIGNALS

value 判斷規則：

mainForce.value：
- buy：主力買超、主力增加、主力偏買。
- sell：主力賣超、主力減少、主力偏賣。
- neutral：主力變化不明顯或多空接近。
- unknown：看不出來或信心不足。

institution.value：
- buy：法人、外資、投信、自營商整體偏買。
- sell：法人、外資、投信、自營商整體偏賣。
- neutral：買賣互抵或不明顯。
- unknown：看不出來或信心不足。

bigHolder.value：
- increase：大戶持股增加。
- decrease：大戶持股減少。
- flat：大戶持股持平。
- unknown：看不出來或信心不足。

retail.value：
- increase：散戶持股增加。
- decrease：散戶持股減少。
- flat：散戶持股持平。
- unknown：看不出來或信心不足。

chipCleanliness.value：
- good：籌碼集中、大戶增加、散戶下降、主力偏買。
- normal：籌碼普通，沒有明顯優勢。
- bad：籌碼凌亂、散戶增加、大戶下降、主力賣超。
- unknown：看不出來或信心不足。

請只輸出 JSON。
不要輸出 markdown。
不要輸出說明。
`;
}

export function buildEmptyAiScreenshotResult(inputCode: string): AiScreenshotResult {
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