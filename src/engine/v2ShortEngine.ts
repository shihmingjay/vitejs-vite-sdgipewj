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

export function getV2Result(score: number) {
  if (score >= 80) return "🔥 主攻級";
  if (score >= 70) return "⚡ 強觀察";
  if (score >= 60) return "🟡 觀察";
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

  const currentMa5 = average(closes.slice(-5));
  const currentMonthMa = average(closes);
  const todayVolume = volumes[volumes.length - 1];
  const avgVolume = average(volumes);
  const volumeRatio = todayVolume / avgVolume;

  let volumeScore = 5;
  let volumeText = "量能普通";

  if (volumeRatio >= 1.2 && volumeRatio <= 1.5) {
    volumeScore = 10;
    volumeText = "健康增量";
  } else if (volumeRatio > 1 && volumeRatio < 2) {
    volumeScore = 7;
    volumeText = "量能尚可";
  } else if (volumeRatio >= 3) {
    volumeScore = 2;
    volumeText = "爆量過熱";
  } else if (volumeRatio < 0.8) {
    volumeScore = 6;
    volumeText = "量縮整理";
  }

  let positionScore = 5;

  if (close >= currentMa5 && close >= currentMonthMa) {
    positionScore = 9;
  } else if (close >= currentMa5) {
    positionScore = 7;
  } else {
    positionScore = 4;
  }

  let technicalScore = 5;
  let trendText = "均線普通";

  const previousMa5 = average(closes.slice(-6, -1));
  const shortMaUp = currentMa5 > previousMa5;
  const monthMaUp = currentMonthMa >= average(closes.slice(0, -1));
  const nearCross =
    currentMonthMa > 0 &&
    Math.abs(currentMa5 - currentMonthMa) / currentMonthMa <= 0.02;

  if (currentMa5 > currentMonthMa && shortMaUp && monthMaUp) {
    technicalScore = 10;
    trendText = "多頭上彎交叉 ✨ 黃金交叉!!";
  } else if (currentMa5 > currentMonthMa && shortMaUp) {
    technicalScore = 8;
    trendText = "短均轉強，長均待確認";
  } else if (nearCross && shortMaUp && monthMaUp) {
    technicalScore = 8;
    trendText = "接近黃金交叉!!";
  } else if (nearCross && !monthMaUp) {
    technicalScore = 4;
    trendText = "疑似假交叉，長均仍下彎";
  } else if (currentMa5 < currentMonthMa && !shortMaUp) {
    technicalScore = 2;
    trendText = "均線轉弱，接近死亡交叉";
  }

  const range = high - low || 1;
  const body = Math.abs(close - open);
  const lowerShadow = Math.min(open, close) - low;

  let candleScore = 5;
  let candleReason = "K線普通";

  if (close >= open && lowerShadow / range >= 0.3) {
    candleScore = 9;
    candleReason = "紅K帶下引線";
  } else if (close >= open) {
    candleScore = 8;
    candleReason = "紅K收盤";
  } else if (lowerShadow / range >= 0.35 && body / range <= 0.5) {
    candleScore = 8;
    candleReason = "下引線承接";
  } else if (close < open && body / range > 0.65) {
    candleScore = 3;
    candleReason = "長黑K偏弱";
  }

  const nearMa5 = currentMa5 > 0 ? Math.abs(close - currentMa5) / currentMa5 : 999;

  const recentHighs = historyData.data.map((row: any[]) => ({
    high: toNumber(row[4]),
    volume: toNumber(row[1]),
  }));

  let sellingPressure = 0;
  let pressureText = "上方壓力較小";

  for (let i = recentHighs.length - 10; i < recentHighs.length; i++) {
    if (i < 1) continue;

    const peak = recentHighs[i];
    const priceGap = (peak.high - close) / close;

    if (priceGap <= 0 || priceGap > 0.1) continue;

    const daysAgo = recentHighs.length - i;
    const timeWeight = Math.max(0.2, 1 - daysAgo * 0.08);
    const volumeWeight = peak.volume / avgVolume;

    const peakPressure =
      (1 - priceGap) *
      40 *
      timeWeight *
      Math.min(volumeWeight, 2);

    sellingPressure += peakPressure;
  }

  sellingPressure = Math.min(100, Math.round(sellingPressure));

  let attack = 0;

  const candleBody = Math.abs(close - open);
  const upperShadow = high - Math.max(close, open);
  const bodyRatio = close > 0 ? candleBody / close : 0;
  const closeNearHigh = close > 0 ? (high - close) / close < 0.01 : false;
  const attackVolume = avgVolume > 0 ? volumes[volumes.length - 1] / avgVolume : 0;

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

  if (sellingPressure >= 80) {
    pressureText = "🔴 極高賣壓，容易遇到解套賣盤";
  } else if (sellingPressure >= 50) {
    pressureText = "🟡 中度賣壓，需觀察是否爆量突破";
  } else {
    pressureText = "🟢 上方壓力較小";
  }

  let pullbackScore = 5;
  let supportText = "未回5MA";

  if (close >= currentMa5 && nearMa5 <= 0.03 && lowerShadow / range >= 0.25) {
    pullbackScore = 10;
    supportText = "回5MA不破＋下引線";
  } else if (close >= currentMa5 && nearMa5 <= 0.03) {
    pullbackScore = 9;
    supportText = "回5MA不破";
  } else if (close > currentMa5) {
    pullbackScore = 7;
    supportText = "站上5MA";
  }

  const items: ScoreItem[] = [
    { name: "成交量", score: volumeScore, reason: volumeText, auto: true },
    { name: "主力籌碼", score: 5, reason: "尚未接籌碼 API，暫給中性分", auto: false },
    { name: "法人動向", score: 5, reason: "尚未接法人 API，暫給中性分", auto: false },
    { name: "位階", score: positionScore, reason: close >= currentMa5 ? "站上短均" : "短線偏弱", auto: true },
    { name: "技術面", score: technicalScore, reason: trendText, auto: true },
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
      reason: pressureText,
      auto: true,
    },
    {
      name: "攻擊結構",
      score: attack,
      reason: attackText,
      auto: true,
    },
    { name: "籌碼乾淨度", score: 5, reason: "尚未接融資/散戶 API，暫給中性分", auto: false },
    { name: "大戶持股", score: 5, reason: "尚未接大戶 API，暫給中性分", auto: false },
    { name: "平均線觀察", score: technicalScore, reason: trendText, auto: true },
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

  let finalScore = items.reduce((sum, item) => sum + item.score, 0);

  if (sellingPressure >= 80 && attack < 5) {
    finalScore -= 10;
  }

  if (sellingPressure >= 70 && upperShadow > candleBody * 1.5) {
    finalScore -= 8;
  }

  if (attack >= 8 && attackVolume >= 1.5) {
    finalScore += 5;
  }

  finalScore = Math.max(0, Math.round(finalScore));

  return {
    finalScore,
    result: getV2Result(finalScore),
    items,
    ma5: Number(currentMa5.toFixed(2)),
    maMonth: Number(currentMonthMa.toFixed(2)),
    volumeStatus: volumeText,
    maSupport: supportText,
    trendStatus: trendText,
    pressureStatus: pressureText,
    pressureScore: sellingPressure,
    pressurePercent: sellingPressure,
    attackScore: attack,
    attackStatus: attackText,
  };
}