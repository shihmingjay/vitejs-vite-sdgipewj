import type { ScoreItem, StockApiItem } from "../types";

export type V2ShortAnalysis = {
  finalScore: number;
  result: string;
  items: ScoreItem[];
  ma5: number;
  maMonth: number;
  volumeStatus: string;
  maSupport: string;
  trendStatus: string;
  pressureStatus: string;
  pressureScore: number;
  pressurePercent: number;
  attackScore: number;
  attackStatus: string;
};

type TriggerResult = {
  score: number;
  label: string;
  bonus: number;
};

type BreakerResult = {
  penalty: number;
  warnings: string[];
};

export function getV2Result(score: number) {
  if (score >= 90) return "🔥 S級主攻";
  if (score >= 80) return "🚀 A級觀察";
  if (score >= 70) return "⚡ B級追蹤";
  if (score >= 60) return "🟡 C級觀察";
  return "❌ 淘汰";
}

export function toNumber(value: any) {
  return Number(
    String(value || "0")
      .replace(/,/g, "")
      .replace("+", "")
      .trim()
  );
}

function average(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function percentChange(current: number, previous: number) {
  if (!previous) return 0;
  return (current - previous) / previous;
}

function calcClosePosition(high: number, low: number, close: number) {
  if (high <= low) return 0.5;
  return (close - low) / (high - low);
}

function calcUpperShadowRatio(open: number, high: number, low: number, close: number) {
  const range = high - low;
  if (range <= 0) return 0;
  return (high - Math.max(open, close)) / range;
}

function calcLowerShadowRatio(open: number, high: number, low: number, close: number) {
  const range = high - low;
  if (range <= 0) return 0;
  return (Math.min(open, close) - low) / range;
}

function calcBodyRatio(open: number, high: number, low: number, close: number) {
  const range = high - low;
  if (range <= 0) return 0;
  return Math.abs(close - open) / range;
}

function calcTimeDecayWeight(daysAgo: number) {
  const safeDaysAgo = Math.min(Math.max(daysAgo, 1), 10);
  return 1.0 - ((safeDaysAgo - 1) / 9) * 0.8;
}

function calcVolumePressureMultiplier(
  open: number,
  close: number,
  prevClose: number,
  volume: number,
  avgVolume: number
) {
  const isUpDay = close > open || close > prevClose;
  const isDownDay = close < open || close < prevClose;

  if (isUpDay) {
    return {
      multiplier: 0,
      label: "上漲日不列賣壓",
    };
  }

  if (!isDownDay) {
    return {
      multiplier: 0.3,
      label: "平盤整理，微弱賣壓",
    };
  }

  if (avgVolume <= 0) {
    return {
      multiplier: 0.8,
      label: "下跌日，量能未知",
    };
  }

  const volumeRatio = volume / avgVolume;

  if (volumeRatio < 0.7) {
    return {
      multiplier: 0.4,
      label: "量縮回測，賣壓打折",
    };
  }

  if (volumeRatio <= 1.1) {
    return {
      multiplier: 0.8,
      label: "普通下跌賣壓",
    };
  }

  return {
    multiplier: 1.2,
    label: "放量下跌，真賣壓",
  };
}

function analyzeVolume(volumeRatio: number) {
  if (volumeRatio < 0.6) {
    return {
      score: 6,
      text: "窒息量，可能醞釀但尚未點火",
    };
  }

  if (volumeRatio < 1) {
    return {
      score: 7,
      text: "量縮整理",
    };
  }

  if (volumeRatio < 1.2) {
    return {
      score: 6,
      text: "普通量",
    };
  }

  if (volumeRatio <= 1.5) {
    return {
      score: 10,
      text: "健康增量",
    };
  }

  if (volumeRatio <= 2.5) {
    return {
      score: 9,
      text: "攻擊量",
    };
  }

  if (volumeRatio <= 3) {
    return {
      score: 5,
      text: "偏熱量",
    };
  }

  return {
    score: 2,
    text: "爆量過熱",
  };
}

function analyzeMaTrend(
  currentMa5: number,
  previousMa5: number,
  currentMonthMa: number,
  previousMonthMa: number
) {
  const ma5Slope = percentChange(currentMa5, previousMa5);
  const monthSlope = percentChange(currentMonthMa, previousMonthMa);

  const nearCross =
    currentMonthMa > 0 &&
    Math.abs(currentMa5 - currentMonthMa) / currentMonthMa <= 0.02;

  if (ma5Slope <= -0.006) {
    return {
      score: 2,
      text: "5MA轉下，短線動能轉弱",
      ma5Slope,
      monthSlope,
    };
  }

  if (currentMa5 > currentMonthMa && ma5Slope > 0.006 && monthSlope >= 0) {
    return {
      score: 10,
      text: "5MA強上彎，多頭結構佳",
      ma5Slope,
      monthSlope,
    };
  }

  if (currentMa5 > currentMonthMa && ma5Slope > 0.002) {
    return {
      score: 8,
      text: "5MA微上彎，短線轉強",
      ma5Slope,
      monthSlope,
    };
  }

  if (nearCross && ma5Slope > 0 && monthSlope >= 0) {
    return {
      score: 8,
      text: "接近黃金交叉",
      ma5Slope,
      monthSlope,
    };
  }

  if (nearCross && monthSlope < 0) {
    return {
      score: 4,
      text: "疑似假交叉，長均仍下彎",
      ma5Slope,
      monthSlope,
    };
  }

  if (ma5Slope > -0.002 && ma5Slope < 0.002) {
    return {
      score: 5,
      text: "5MA走平，等待方向",
      ma5Slope,
      monthSlope,
    };
  }

  return {
    score: 5,
    text: "均線普通",
    ma5Slope,
    monthSlope,
  };
}

function analyzeTrigger(
  open: number,
  high: number,
  low: number,
  close: number,
  prevClose: number,
  currentMa5: number,
  volumeRatio: number
): TriggerResult {
  const signals: string[] = [];
  let score = 0;
  let bonus = 0;

  const lowerShadow = calcLowerShadowRatio(open, high, low, close);
  const upperShadow = calcUpperShadowRatio(open, high, low, close);
  const body = calcBodyRatio(open, high, low, close);
  const closePosition = calcClosePosition(high, low, close);
  const nearMa5 =
    currentMa5 > 0 ? Math.abs(close - currentMa5) / currentMa5 <= 0.03 : false;

  if (
    close < open &&
    lowerShadow >= 0.45 &&
    body <= 0.55 &&
    closePosition >= 0.45 &&
    nearMa5 &&
    volumeRatio <= 1.8
  ) {
    score += 20;
    bonus += 4;
    signals.push("黑K下影承接");
  }

  if (
    close > open &&
    upperShadow >= 0.35 &&
    closePosition >= 0.5 &&
    volumeRatio >= 1.1 &&
    volumeRatio <= 3
  ) {
    score += 12;
    bonus += 2;
    signals.push("紅K試壓");
  }

  if (
    prevClose > 0 &&
    open > prevClose * 1.01 &&
    low >= open - (open - prevClose) * 0.3 &&
    close >= open &&
    volumeRatio >= 1.5 &&
    volumeRatio <= 3
  ) {
    score += 25;
    bonus += 5;
    signals.push("Gap & Go");
  }

  if (close > open && volumeRatio >= 1.2 && volumeRatio <= 2.5) {
    score += 18;
    bonus += 4;
    signals.push("量價共振");
  }

  if (signals.length === 0) {
    return {
      score: 0,
      label: "無Trigger",
      bonus: 0,
    };
  }

  return {
    score,
    label: signals.join("、"),
    bonus: Math.min(bonus, 8),
  };
}

function analyzeBreaker(
  open: number,
  high: number,
  low: number,
  close: number,
  currentMa5: number,
  ma5Slope: number,
  volumeRatio: number
): BreakerResult {
  const warnings: string[] = [];
  let penalty = 0;

  const upperShadow = calcUpperShadowRatio(open, high, low, close);
  const closePosition = calcClosePosition(high, low, close);

  if (volumeRatio >= 3 && upperShadow >= 0.35) {
    warnings.push("爆量長上影");
    penalty += 12;
  }

  if (open > close && closePosition <= 0.35) {
    warnings.push("開高走低");
    penalty += 8;
  }

  if (currentMa5 > 0 && close > currentMa5 * 1.08) {
    warnings.push("離5MA過遠");
    penalty += 8;
  }

  if (ma5Slope <= -0.006) {
    warnings.push("5MA轉下");
    penalty += 10;
  }

  return {
    penalty,
    warnings,
  };
}

function analyzeSellingPressure(
  historyData: any,
  close: number,
  avgVolume: number
) {
  let weightedPressureVolume = 0;
  let weightedTotalVolume = 0;
  const pressureNotes: string[] = [];
  const rows = historyData.data;

  const start = Math.max(1, rows.length - 10);

  for (let i = start; i < rows.length; i++) {
    const row = rows[i];
    const previousRow = rows[i - 1];

    const volume = toNumber(row[1]);
    const open = toNumber(row[3]);
    const high = toNumber(row[4]);
    const dayClose = toNumber(row[6]);
    const prevClose = toNumber(previousRow[6]);

    if (close <= 0 || volume <= 0) continue;

    const priceGap = (high - close) / close;

    if (priceGap <= 0 || priceGap > 0.1) {
      continue;
    }

    const daysAgo = rows.length - i;
    const timeWeight = calcTimeDecayWeight(daysAgo);
    const distanceWeight = Math.max(0, 1 - priceGap / 0.1);

    const volumeFilter = calcVolumePressureMultiplier(
      open,
      dayClose,
      prevClose,
      volume,
      avgVolume
    );

    const weightedVolume = volume * timeWeight * distanceWeight;

    weightedTotalVolume += weightedVolume;

    if (volumeFilter.multiplier <= 0) {
      continue;
    }

    weightedPressureVolume += weightedVolume * volumeFilter.multiplier;

    pressureNotes.push(`${daysAgo}日前:${volumeFilter.label}`);
  }

  if (weightedTotalVolume <= 0) {
    return {
      pressureScore: 0,
      pressureNotes: [],
    };
  }

  const pressureRatio = weightedPressureVolume / weightedTotalVolume;

  const pressureScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(pressureRatio * 100)
    )
  );

  return {
    pressureScore,
    pressureNotes,
  };
}

export function analyzeV2ShortStock(
  stock: StockApiItem,
  historyData: any
): V2ShortAnalysis {
  const closes = historyData.data.map((row: any[]) => toNumber(row[6]));
  const volumes = historyData.data.map((row: any[]) => toNumber(row[1]));

  const close = toNumber(stock.ClosingPrice);
  const open = toNumber(stock.OpeningPrice);
  const high = toNumber(stock.HighestPrice);
  const low = toNumber(stock.LowestPrice);
  const prevClose = closes.length >= 2 ? closes[closes.length - 2] : close;

  const currentMa5 = average(closes.slice(-5));
  const previousMa5 = average(closes.slice(-6, -1));

  const currentMonthMa = average(closes);
  const previousMonthMa = average(closes.slice(0, -1));

  const todayVolume = volumes[volumes.length - 1];
  const avgVolume = average(volumes);
  const volumeRatio = avgVolume > 0 ? todayVolume / avgVolume : 0;

  const volume = analyzeVolume(volumeRatio);
  const maTrend = analyzeMaTrend(
    currentMa5,
    previousMa5,
    currentMonthMa,
    previousMonthMa
  );

  let positionScore = 5;

  if (close >= currentMa5 && close >= currentMonthMa) {
    positionScore = 9;
  } else if (close >= currentMa5) {
    positionScore = 7;
  } else {
    positionScore = 4;
  }

  const range = high - low || 1;
  const body = Math.abs(close - open);
  const lowerShadowValue = Math.min(open, close) - low;

  let candleScore = 5;
  let candleReason = "K線普通";

  if (close >= open && lowerShadowValue / range >= 0.3) {
    candleScore = 9;
    candleReason = "紅K帶下引線";
  } else if (close >= open) {
    candleScore = 8;
    candleReason = "紅K收盤";
  } else if (lowerShadowValue / range >= 0.35 && body / range <= 0.5) {
    candleScore = 8;
    candleReason = "下引線承接";
  } else if (close < open && body / range > 0.65) {
    candleScore = 3;
    candleReason = "長黑K偏弱";
  }

  const nearMa5 =
    currentMa5 > 0 ? Math.abs(close - currentMa5) / currentMa5 : 999;

  const sellingPressureResult = analyzeSellingPressure(
    historyData,
    close,
    avgVolume
  );

  const sellingPressure = sellingPressureResult.pressureScore;

  let pressureText = "🟢 上方壓力較小";

  if (sellingPressure >= 80) {
    pressureText = "🔴 極高賣壓，容易遇到解套賣盤";
  } else if (sellingPressure >= 50) {
    pressureText = "🟡 中度賣壓，需觀察是否爆量突破";
  }

  const pressureNoteText =
    sellingPressureResult.pressureNotes.length > 0
      ? sellingPressureResult.pressureNotes.slice(0, 3).join("｜")
      : "近10日未偵測明顯實質賣壓";

  const candleBody = Math.abs(close - open);
  const upperShadow = high - Math.max(close, open);
  const bodyRatio = close > 0 ? candleBody / close : 0;
  const closeNearHigh = close > 0 ? (high - close) / close < 0.01 : false;
  const attackVolume = avgVolume > 0 ? todayVolume / avgVolume : 0;

  let attack = 0;

  if (closeNearHigh) attack += 2;
  if (attackVolume >= 1.5) attack += 3;
  if (bodyRatio >= 0.03) attack += 2;
  if (upperShadow < candleBody * 0.5) attack += 2;
  if (sellingPressure >= 70) attack += 1;

  let attackText = "⚠ 假突破風險";

  if (attack >= 8) {
    attackText = "🚀 強攻擊結構";
  } else if (attack >= 5) {
    attackText = "🟡 普通攻擊結構";
  }

  let pullbackScore = 5;
  let supportText = "未回5MA";

  if (close >= currentMa5 && nearMa5 <= 0.03 && lowerShadowValue / range >= 0.25) {
    pullbackScore = 10;
    supportText = "回5MA不破＋下引線";
  } else if (close >= currentMa5 && nearMa5 <= 0.03) {
    pullbackScore = 9;
    supportText = "回5MA不破";
  } else if (close > currentMa5) {
    pullbackScore = 7;
    supportText = "站上5MA";
  }

  const trigger = analyzeTrigger(
    open,
    high,
    low,
    close,
    prevClose,
    currentMa5,
    volumeRatio
  );

  const breaker = analyzeBreaker(
    open,
    high,
    low,
    close,
    currentMa5,
    maTrend.ma5Slope,
    volumeRatio
  );

  const items: ScoreItem[] = [
    { name: "成交量", score: volume.score, reason: volume.text, auto: true },
    { name: "主力籌碼", score: 5, reason: "尚未接籌碼 API，暫給中性分", auto: false },
    { name: "法人動向", score: 5, reason: "尚未接法人 API，暫給中性分", auto: false },
    { name: "位階", score: positionScore, reason: close >= currentMa5 ? "站上短均" : "短線偏弱", auto: true },
    { name: "技術面", score: maTrend.score, reason: maTrend.text, auto: true },
    { name: "K線品質", score: candleScore, reason: candleReason, auto: true },
    { name: "回檔型態", score: pullbackScore, reason: supportText, auto: true },
    {
      name: "近10日賣壓",
      score:
        sellingPressure >= 80
          ? 2
          : sellingPressure >= 50
          ? 5
          : sellingPressure >= 30
          ? 7
          : 9,
      reason: `${pressureText}｜${pressureNoteText}`,
      auto: true,
    },
    {
      name: "攻擊結構",
      score: attack,
      reason: attackText,
      auto: true,
    },
    {
      name: "短線Trigger",
      score: Math.min(10, Math.round(trigger.score / 5)),
      reason: trigger.label,
      auto: true,
    },
    {
      name: "熔斷警示",
      score: breaker.penalty > 0 ? 2 : 10,
      reason: breaker.warnings.length ? breaker.warnings.join("、") : "無熔斷警示",
      auto: true,
    },
    { name: "籌碼乾淨度", score: 5, reason: "尚未接融資/散戶 API，暫給中性分", auto: false },
    { name: "大戶持股", score: 5, reason: "尚未接大戶 API，暫給中性分", auto: false },
    { name: "平均線觀察", score: maTrend.score, reason: maTrend.text, auto: true },
  ];

  if (sellingPressure >= 80) {
    items.forEach((item) => {
      if (item.name === "回檔型態" && item.score > 5) {
        item.score = 5;
        item.reason = "⚠ 高賣壓壓制，回檔支撐可信度下降";
      }

      if (item.name === "位階" && item.score > 6) {
        item.score = 6;
        item.reason = "⚠ 接近壓力區，位階優勢下降";
      }
    });
  }

  let rawScore = items.reduce((sum, item) => sum + item.score, 0);

  rawScore += trigger.bonus;
  rawScore -= breaker.penalty;

  if (sellingPressure >= 80 && attack < 5) {
    rawScore -= 10;
  }

  if (sellingPressure >= 70 && upperShadow > candleBody * 1.5) {
    rawScore -= 8;
  }

  if (attack >= 8 && attackVolume >= 1.5) {
    rawScore += 5;
  }

  const MAX_SCORE = 133;

  const finalScore = Math.max(
    0,
    Math.min(
      100,
      Math.round((rawScore / MAX_SCORE) * 100)
    )
  );

  return {
    finalScore,
    result: getV2Result(finalScore),
    items,
    ma5: Number(currentMa5.toFixed(2)),
    maMonth: Number(currentMonthMa.toFixed(2)),
    volumeStatus: `${volume.text}｜量比 ${volumeRatio.toFixed(2)}`,
    maSupport: supportText,
    trendStatus: `${maTrend.text}｜5MA斜率 ${(maTrend.ma5Slope * 100).toFixed(2)}%`,
    pressureStatus: `${pressureText}｜${pressureNoteText}`,
    pressureScore: sellingPressure,
    pressurePercent: sellingPressure,
    attackScore: attack,
    attackStatus: `${attackText}｜Trigger：${trigger.label}｜熔斷：${
      breaker.warnings.length ? breaker.warnings.join("、") : "無"
    }`,
  };
}