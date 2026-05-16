import { useState } from "react";
import "./App.css";

type StockResult = {
  Code: string;
  Name: string;
  ClosingPrice: string;
  Change: string;
  TradeVolume: string;
  OpeningPrice: string;
  HighestPrice: string;
  LowestPrice: string;
};

function App() {
  const [stockCode, setStockCode] = useState("");
  const [stockData, setStockData] = useState<StockResult | null>(null);
  const [message, setMessage] = useState("");
  const [score, setScore] = useState(0);
  const [ma5, setMa5] = useState(0);
  const [ma20, setMa20] = useState(0);
  const [volumeStatus, setVolumeStatus] = useState("");
  const [maSupport, setMaSupport] = useState("");
  const [goldenCross, setGoldenCross] = useState("");

  const toNumber = (value: string) => {
    return Number(String(value).replace(/,/g, "").replace("+", ""));
  };

  const average = (arr: number[]) => {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  };

  const getResult = (s: number) => {
    if (s >= 80) return "🔥 主攻級";
    if (s >= 60) return "⚡ 觀察級";
    if (s >= 40) return "🟡 普通";
    return "❌ 淘汰";
  };

  const getStockData = async () => {
    setMessage("");
    setStockData(null);
    setScore(0);

    if (!stockCode) {
      setMessage("請輸入股票代號");
      return;
    }

    try {
      const stockResponse = await fetch("/api/stock");
      const allStocks = await stockResponse.json();

      const stock = allStocks.find(
        (item: StockResult) => item.Code === stockCode.trim()
      );

      if (!stock) {
        setMessage("找不到股票，可能是上櫃股或資料尚未更新");
        return;
      }

      setStockData(stock);

      const historyResponse = await fetch(`/api/history?code=${stockCode.trim()}`);
      const history = await historyResponse.json();

      if (!history.data || history.data.length < 5) {
        setMessage("查詢成功，但歷史資料不足，無法計算5MA");
        return;
      }

      const closes = history.data.map((row: string[]) => toNumber(row[6]));
      const volumes = history.data.map((row: string[]) => toNumber(row[1]));

      const lastClose = closes[closes.length - 1];
      const currentMa5 = average(closes.slice(-5));
      const currentMa20 = average(closes);
      const previousMa5 = average(closes.slice(-6, -1));
      const previousMa20 = average(closes.slice(0, -1));

      const avgVolume = average(volumes);
      const todayVolume = volumes[volumes.length - 1];
      const volumeRatio = todayVolume / avgVolume;

      let autoScore = 0;

      let volumeText = "量能普通";
      if (volumeRatio >= 1.2 && volumeRatio <= 1.5) {
        autoScore += 25;
        volumeText = "健康增量";
      } else if (volumeRatio > 1 && volumeRatio < 2) {
        autoScore += 15;
        volumeText = "量能尚可";
      } else if (volumeRatio >= 3) {
        volumeText = "爆量過熱";
      }

      let supportText = "未回5MA";
      const nearMa5 = Math.abs(lastClose - currentMa5) / currentMa5;

      if (lastClose >= currentMa5 && nearMa5 <= 0.03) {
        autoScore += 25;
        supportText = "回5MA不破";
      } else if (lastClose > currentMa5) {
        autoScore += 15;
        supportText = "站上5MA";
      }

      let crossText = "無黃金交叉";
      if (currentMa5 > currentMa20 && previousMa5 <= previousMa20) {
        autoScore += 25;
        crossText = "黃金交叉成立";
      } else if (currentMa5 > currentMa20) {
        autoScore += 20;
        crossText = "多頭排列";
      } else if (Math.abs(currentMa5 - currentMa20) / currentMa20 <= 0.02) {
        autoScore += 12;
        crossText = "接近黃金交叉";
      }

      const open = toNumber(stock.OpeningPrice);
      const close = toNumber(stock.ClosingPrice);

      if (close >= open) {
        autoScore += 25;
      } else if (close >= currentMa5) {
        autoScore += 15;
      }

      setScore(autoScore);
      setMa5(Number(currentMa5.toFixed(2)));
      setMa20(Number(currentMa20.toFixed(2)));
      setVolumeStatus(volumeText);
      setMaSupport(supportText);
      setGoldenCross(crossText);
      setMessage("查詢成功，已自動評分");
    } catch (error) {
      console.log(error);
      setMessage("API錯誤，請檢查 /api/stock 或 /api/history");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07122b", color: "white", padding: "30px", fontFamily: "sans-serif" }}>
      <h1 style={{ textAlign: "center" }}>📡 股票戰情中心 v2</h1>

      <div style={{ maxWidth: "650px", margin: "auto", background: "#1b2942", padding: "25px", borderRadius: "20px" }}>
        <input
          type="text"
          placeholder="輸入股票代號，例如 2330"
          value={stockCode}
          onChange={(e) => setStockCode(e.target.value)}
          style={{ width: "100%", padding: "15px", marginBottom: "15px", borderRadius: "10px", border: "none", fontSize: "18px" }}
        />

        <button
          onClick={getStockData}
          style={{ width: "100%", padding: "15px", background: "#3264e6", color: "white", border: "none", borderRadius: "10px", fontSize: "20px", cursor: "pointer" }}
        >
          查詢並自動評分
        </button>

        <h2 style={{ color: "#ffd54f" }}>目前分數：{score}</h2>
        <h2 style={{ color: "#ff7b7b" }}>目前結果：{getResult(score)}</h2>
        <p style={{ color: "#ffd54f" }}>{message}</p>

        {stockData && (
          <div style={{ marginTop: "25px", background: "#26354f", padding: "20px", borderRadius: "15px" }}>
            <h2>{stockData.Name} ({stockData.Code})</h2>
            <p>收盤價：{stockData.ClosingPrice}</p>
            <p>漲跌：{stockData.Change}</p>
            <p>成交量：{stockData.TradeVolume}</p>
            <p>5MA：{ma5}</p>
            <p>近月均線：{ma20}</p>
            <p>量能判斷：{volumeStatus}</p>
            <p>5MA判斷：{maSupport}</p>
            <p>均線判斷：{goldenCross}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;