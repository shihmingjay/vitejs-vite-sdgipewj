import { useEffect, useState } from "react";
import RankingBoard from "./components/RankingBoard";
import type { ScoreItem, StockApiItem, WatchStock } from "./types";
import "./App.css";
import { getChipData } from "./services/chipApi";

type ScreenshotItem = {
  id: string;
  fileName: string;
  imageUrl: string;
};

function App() {
  const [stockCode, setStockCode] = useState("");
  const [stockData, setStockData] = useState<StockApiItem | null>(null);
  const [scoreItems, setScoreItems] = useState<ScoreItem[]>([]);
  const [watchList, setWatchList] = useState<WatchStock[]>([]);
  const [message, setMessage] = useState("輸入股票代號，啟動戰情掃描。");
  const [loading, setLoading] = useState(false);

  const [ma5, setMa5] = useState(0);
  const [maMonth, setMaMonth] = useState(0);
  const [volumeStatus, setVolumeStatus] = useState("-");
  const [maSupport, setMaSupport] = useState("-");
  const [trendStatus, setTrendStatus] = useState("-");
  const [pressureStatus, setPressureStatus] = useState("-");
  const [pressureScore, setPressureScore] = useState(0);
  const [attackScore, setAttackScore] = useState(0);
  const [attackStatus, setAttackStatus] = useState("-");

  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [screenshotNote, setScreenshotNote] = useState("");

  const goV2 = () => {
    window.location.href = "/";
  };

  const goV3 = () => {
    window.location.href = "/v3_index.html";
  };

  useEffect(() => {
    const saved = localStorage.getItem("stock-war-room-watchlist");
    if (saved) setWatchList(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("stock-war-room-watchlist", JSON.stringify(watchList));
  }, [watchList]);

  useEffect(() => {
    return () => {
      screenshots.forEach((item) => {
        URL.revokeObjectURL(item.imageUrl);
      });
    };
  }, [screenshots]);

  const toNumber = (value: any) => {
    return Number(String(value || "0").replace(/,/g, "").replace("+", "").trim());
  };

  const average = (arr: number[]) => {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  };

  const getResult = (score: number) => {
    if (score >= 80) return "🔥 主攻級";
    if (score >= 70) return "⚡ 強觀察";
    if (score >= 60) return "🟡 觀察";
    return "❌ 淘汰";
  };

  const totalScore = scoreItems.reduce((sum, item) => sum + item.score, 0);

  const uploadScreenshots = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (!imageFiles.length) {
      event.target.value = "";
      return;
    }

    const nextImages = imageFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      fileName: file.name,
      imageUrl: URL.createObjectURL(file),
    }));

    setScreenshots((prev) => [...prev, ...nextImages]);

    event.target.value = "";
  };

  const removeScreenshot = (id: string) => {
    setScreenshots((prev) => {
      const target = prev.find((item) => item.id === id);

      if (target) {
        URL.revokeObjectURL(target.imageUrl);
      }

      return prev.filter((item) => item.id !== id);
    });
  };

  const clearScreenshots = () => {
    screenshots.forEach((item) => {
      URL.revokeObjectURL(item.imageUrl);
    });

    setScreenshots([]);
    setScreenshotNote("");
  };

  const scanStock = async () => {
    try {
      const chipData = await getChipData(stockCode);
      console.log("籌碼資料:", chipData);

      setLoading(true);
      setMessage("掃描中...");
      setStockData(null);
      setScoreItems([]);

      const code = stockCode.trim();

      if (!code) {
        setMessage("請輸入股票代號");
        setLoading(false);
        return;
      }

      const stockResponse = await fetch("/api/stock");
      const allStocks = await stockResponse.json();

      if (!Array.isArray(allStocks)) {
        setMessage("stock API 格式錯誤");
        setLoading(false);
        return;
      }

      const stock = allStocks.find((item: StockApiItem) => item.Code === code);

      if (!stock) {
        setMessage("查無股票，可能是上櫃股或資料尚未更新");
        setLoading(false);
        return;
      }

      const historyResponse = await fetch(`/api/history?code=${code}`);
      const historyData = await historyResponse.json();

      if (!historyData || !Array.isArray(historyData.data) || historyData.data.length < 5) {
        setMessage("歷史資料不足，無法計算均線");
        setLoading(false);
        return;
      }

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
      if (close >= currentMa5 && close >= currentMonthMa) positionScore = 9;
      else if (close >= currentMa5) positionScore = 7;
      else positionScore = 4;

      let technicalScore = 5;
      let trendText = "均線普通";

      const previousMa5 = average(closes.slice(-6, -1));
      const shortMaUp = currentMa5 > previousMa5;
      const monthMaUp = currentMonthMa >= average(closes.slice(0, -1));
      const nearCross = Math.abs(currentMa5 - currentMonthMa) / currentMonthMa <= 0.02;

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

      const nearMa5 = Math.abs(close - currentMa5) / currentMa5;
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
      const bodyRatio = candleBody / close;
      const closeNearHigh = (high - close) / close < 0.01;
      const attackVolume = volumes[volumes.length - 1] / avgVolume;

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

      setAttackScore(attack);
      setAttackStatus(attackText);

      if (sellingPressure >= 80) {
        pressureText = "🔴 極高賣壓，容易遇到解套賣盤";
      } else if (sellingPressure >= 50) {
        pressureText = "🟡 中度賣壓，需觀察是否爆量突破";
      } else {
        pressureText = "🟢 上方壓力較小";
      }

      setPressureScore(sellingPressure);
      setPressureStatus(pressureText);

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

      let newTotalScore = items.reduce((sum, item) => sum + item.score, 0);

      if (sellingPressure >= 80 && attack < 5) {
        newTotalScore -= 10;
      }

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

      if (sellingPressure >= 70 && upperShadow > candleBody * 1.5) {
        newTotalScore -= 8;
      }

      if (attack >= 8 && attackVolume >= 1.5) {
        newTotalScore += 5;
      }

      newTotalScore = Math.max(0, Math.round(newTotalScore));

      setStockData(stock);
      setScoreItems(items);
      setMa5(Number(currentMa5.toFixed(2)));
      setMaMonth(Number(currentMonthMa.toFixed(2)));
      setVolumeStatus(volumeText);
      setMaSupport(supportText);
      setTrendStatus(trendText);
      setMessage(`查詢成功，總分 ${newTotalScore}，${getResult(newTotalScore)}`);
      setLoading(false);
    } catch (error: any) {
      setMessage(`API錯誤：${error.message}`);
      setLoading(false);
    }
  };

  const addToWatchList = () => {
    if (!stockData || !scoreItems.length) return;

    const newStock: WatchStock = {
      code: stockData.Code,
      name: stockData.Name,
      close: stockData.ClosingPrice,
      totalScore,
      result: getResult(totalScore),
      items: scoreItems,
      ma5,
      maMonth,
      volumeStatus,
      maSupport,
      trendStatus,
      pressureStatus,
      pressureScore,
      pressurePercent: pressureScore,
      attackScore,
      attackStatus,
    };

    setWatchList((prev) => {
      const filtered = prev.filter((item) => item.code !== newStock.code);
      return [...filtered, newStock].sort((a, b) => b.totalScore - a.totalScore);
    });
  };

  const removeStock = (code: string) => {
    setWatchList((prev) => prev.filter((stock) => stock.code !== code));
  };

  const clearWatchList = () => {
    setWatchList([]);
  };

  return (
    <div className="app">
      <div className="mode-switch">
        <button className="mode-button active" onClick={goV2}>
          🔥 V2 短線爆發
        </button>

        <button className="mode-button" onClick={goV3}>
          🚀 V3 中長期波段
        </button>
      </div>

      <section className="hero-panel">
        <p className="eyebrow">Stock War Room</p>
        <h1>📡 股票戰情中心 V2</h1>
        <p className="hero-text">
          短線爆發掃描、賣壓判斷、攻擊結構與一般截圖輔助區。
        </p>
      </section>

      <div className="dashboard-grid">
        <div className="stock-card main-card">
          <h2>🔥 短線掃描器</h2>

          <input
            value={stockCode}
            onChange={(e) => setStockCode(e.target.value)}
            placeholder="輸入股票代號，例如 2330"
          />

          <button onClick={scanStock} disabled={loading}>
            {loading ? "掃描中..." : "查詢並自動評分"}
          </button>

          <h2
            className={
              totalScore >= 80
                ? "score-high result-glow"
                : totalScore >= 60
                ? "score-medium result-glow"
                : "score-low result-glow"
            }
          >
            目前分數：{totalScore}
          </h2>

          <h2 className="result-glow">目前結果：{getResult(totalScore)}</h2>

          <p>{message}</p>

          {stockData && (
            <div className="info-panel">
              <h2>
                {stockData.Name} ({stockData.Code})
              </h2>
              <p>收盤價：{stockData.ClosingPrice}</p>
              <p>漲跌：{stockData.Change}</p>
              <p>成交量：{stockData.TradeVolume}</p>
              <p>5MA：{ma5}</p>
              <p>近月均線：{maMonth}</p>
              <p>量能判斷：{volumeStatus}</p>
              <p>5MA判斷：{maSupport}</p>
              <p>平均線觀察：{trendStatus}</p>
              <p>近10日賣壓：{pressureStatus}</p>
              <p>賣壓警示分：{pressureScore}/100</p>

              <button onClick={addToWatchList}>加入主攻排行榜</button>
            </div>
          )}
        </div>

        <div className="stock-card screenshot-card">
          <div className="screenshot-header">
            <div>
              <h2>📷 截圖輔助區</h2>
              <p className="helper-text">
                不用分類，直接把籌碼、K線、主力、法人或任何股票截圖丟進來。
              </p>
            </div>

            <button className="danger-button" onClick={clearScreenshots}>
              清空截圖
            </button>
          </div>

          <label className="simple-upload">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={uploadScreenshots}
            />
            <span>點我上傳截圖</span>
            <small>支援多張圖片，適合新手直接使用</small>
          </label>

          <textarea
            className="main-note"
            value={screenshotNote}
            onChange={(event) => setScreenshotNote(event.target.value)}
            placeholder="可輸入臨時觀察，例如：主力連買、散戶下降、今天回5MA、上影線偏長..."
          />

          {screenshots.length > 0 && (
            <div className="preview-grid">
              {screenshots.map((item) => (
                <div className="preview-card" key={item.id}>
                  <img src={item.imageUrl} alt={item.fileName} />
                  <p className="file-name">{item.fileName}</p>

                  <button
                    className="small-button"
                    onClick={() => removeScreenshot(item.id)}
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="stock-card wide-card">
        <h2>📊 10項評分明細</h2>

        {scoreItems.length === 0 ? (
          <p>尚未評分</p>
        ) : (
          <div className="score-grid">
            {scoreItems.map((item) => (
              <div className="score-item" key={item.name}>
                <h3>
                  {item.name}：{item.score}/10
                </h3>
                <p>{item.reason}</p>
                <small>{item.auto ? "自動判斷" : "暫時中性分"}</small>
              </div>
            ))}
          </div>
        )}
      </div>

      <RankingBoard
        watchList={watchList}
        removeStock={removeStock}
        clearAll={clearWatchList}
      />
    </div>
  );
}

export default App;