import { useEffect, useState } from "react";
import RankingBoard from "./components/RankingBoard";
import type { ScoreItem, StockApiItem, WatchStock } from "./types";
import "./App.css";

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

  useEffect(() => {
    const saved = localStorage.getItem("stock-war-room-watchlist");
    if (saved) setWatchList(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("stock-war-room-watchlist", JSON.stringify(watchList));
  }, [watchList]);

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

  const scanStock = async () => {
    try {
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
        { name: "籌碼乾淨度", score: 5, reason: "尚未接融資/散戶 API，暫給中性分", auto: false },
        { name: "大戶持股", score: 5, reason: "尚未接大戶 API，暫給中性分", auto: false },
        { name: "平均線觀察", score: technicalScore, reason: trendText, auto: true },
      ];

      const newTotalScore = items.reduce((sum, item) => sum + item.score, 0);

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
      <h1>📡 股票戰情中心 V2</h1>

      <div className="stock-card">
        <input
          value={stockCode}
          onChange={(e) => setStockCode(e.target.value)}
          placeholder="輸入股票代號，例如 2330"
        />

        <button onClick={scanStock} disabled={loading}>
          {loading ? "掃描中..." : "查詢並自動評分"}
        </button>

        <h2>目前分數：{totalScore}</h2>
        <h2>目前結果：{getResult(totalScore)}</h2>
        <p>{message}</p>

        {stockData && (
          <>
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

            <button onClick={addToWatchList}>加入主攻排行榜</button>
          </>
        )}
      </div>

      <div className="stock-card">
        <h2>📊 10項評分明細</h2>
        {scoreItems.length === 0 ? (
          <p>尚未評分</p>
        ) : (
          scoreItems.map((item) => (
            <div key={item.name}>
              <h3>
                {item.name}：{item.score}/10
              </h3>
              <p>{item.reason}</p>
              <small>{item.auto ? "自動判斷" : "暫時中性分"}</small>
            </div>
          ))
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
// update
export default App;