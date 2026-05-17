import { useEffect, useState } from "react";

type StockApiItem = {
  Code: string;
  Name: string;
  ClosingPrice: string;
  Change: string;
  TradeVolume: string;
  OpeningPrice: string;
  HighestPrice: string;
  LowestPrice: string;
};

type ScoreItem = {
  name: string;
  score: number;
  reason: string;
  auto: boolean;
};

type WatchStock = {
  code: string;
  name: string;
  close: string;
  totalScore: number;
  result: string;
  items: ScoreItem[];
  ma5: number;
  maMonth: number;
  volumeStatus: string;
  maSupport: string;
  trendStatus: string;
};

function App() {
  const [stockCode, setStockCode] = useState("");
  const [stockData, setStockData] = useState<StockApiItem | null>(null);
  const [message, setMessage] = useState("輸入股票代號，啟動戰情掃描。");
  const [loading, setLoading] = useState(false);

  const [watchList, setWatchList] = useState<WatchStock[]>([]);

  const [mainChip, setMainChip] = useState(5);
  const [institution, setInstitution] = useState(5);
  const [chipClean, setChipClean] = useState(5);
  const [bigHolder, setBigHolder] = useState(5);

  const [scoreItems, setScoreItems] = useState<ScoreItem[]>([]);
  const [ma5, setMa5] = useState(0);
  const [maMonth, setMaMonth] = useState(0);
  const [volumeStatus, setVolumeStatus] = useState("-");
  const [maSupport, setMaSupport] = useState("-");
  const [trendStatus, setTrendStatus] = useState("-");

  useEffect(() => {
    const saved = localStorage.getItem("stock-war-room-watchlist");
    if (saved) {
      setWatchList(JSON.parse(saved));
    }
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

  const getColor = (score: number) => {
    if (score >= 80) return "#22c55e";
    if (score >= 70) return "#38bdf8";
    if (score >= 60) return "#facc15";
    return "#fb7185";
  };

  const scanStock = async () => {
    try {
      setLoading(true);
      setMessage("AI 戰情雷達掃描中...");
      setStockData(null);
      setScoreItems([]);

      const code = stockCode.trim();

      if (!code) {
        setMessage("請先輸入股票代號。");
        setLoading(false);
        return;
      }

      const stockRes = await fetch("/api/stock");
      const allStocks = await stockRes.json();

      if (!Array.isArray(allStocks)) {
        setMessage("stock API 格式錯誤。");
        setLoading(false);
        return;
      }

      const stock = allStocks.find((item: StockApiItem) => item.Code === code);

      if (!stock) {
        setMessage("找不到股票，可能是上櫃股或資料尚未更新。");
        setLoading(false);
        return;
      }

      const historyRes = await fetch(`/api/history?code=${code}`);
      const history = await historyRes.json();

      if (!history || !Array.isArray(history.data) || history.data.length < 5) {
        setMessage("歷史資料不足，無法完整計算均線。");
        setLoading(false);
        return;
      }

      const closes = history.data.map((row: any[]) => toNumber(row[6]));
      const volumes = history.data.map((row: any[]) => toNumber(row[1]));

      const lastClose = closes[closes.length - 1];
      const currentMa5 = average(closes.slice(-5));
      const monthAverage = average(closes);

      const open = toNumber(stock.OpeningPrice);
      const high = toNumber(stock.HighestPrice);
      const low = toNumber(stock.LowestPrice);
      const close = toNumber(stock.ClosingPrice);

      const avgVolume = average(volumes);
      const todayVolume = volumes[volumes.length - 1];
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
      if (close >= currentMa5 && close >= monthAverage) positionScore = 9;
      else if (close >= currentMa5) positionScore = 7;
      else if (close < currentMa5) positionScore = 4;

      let technicalScore = 5;
      if (currentMa5 > monthAverage) technicalScore = 9;
      else if (Math.abs(currentMa5 - monthAverage) / monthAverage <= 0.02) technicalScore = 7;

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

      const nearMa5 = Math.abs(lastClose - currentMa5) / currentMa5;

      let pullbackScore = 5;
      let supportText = "未回5MA";
      if (lastClose >= currentMa5 && nearMa5 <= 0.03 && lowerShadow / range >= 0.25) {
        pullbackScore = 10;
        supportText = "回5MA不破＋下引線";
      } else if (lastClose >= currentMa5 && nearMa5 <= 0.03) {
        pullbackScore = 9;
        supportText = "回5MA不破";
      } else if (lastClose > currentMa5) {
        pullbackScore = 7;
        supportText = "站上5MA";
      }

      let goldenScore = 5;
      let trendText = "均線普通";
      if (currentMa5 > monthAverage) {
        goldenScore = 9;
        trendText = "5MA高於近月均線";
      } else if (Math.abs(currentMa5 - monthAverage) / monthAverage <= 0.02) {
        goldenScore = 8;
        trendText = "接近黃金交叉";
      }

      const items: ScoreItem[] = [
        { name: "成交量", score: volumeScore, reason: volumeText, auto: true },
        { name: "主力籌碼", score: mainChip, reason: "目前先手動輸入，之後接籌碼資料", auto: false },
        { name: "法人動向", score: institution, reason: "目前先手動輸入，之後接外資/投信", auto: false },
        { name: "位階", score: positionScore, reason: close >= currentMa5 ? "站上短均" : "短線偏弱", auto: true },
        { name: "技術面", score: technicalScore, reason: trendText, auto: true },
        { name: "K線品質", score: candleScore, reason: candleReason, auto: true },
        { name: "回檔型態", score: pullbackScore, reason: supportText, auto: true },
        { name: "籌碼乾淨度", score: chipClean, reason: "目前先手動輸入，之後接散戶/融資資料", auto: false },
        { name: "大戶持股", score: bigHolder, reason: "目前先手動輸入，之後接大戶持股", auto: false },
        { name: "黃金交叉趨勢", score: goldenScore, reason: trendText, auto: true },
      ];

      const total = items.reduce((sum, item) => sum + item.score, 0);

      setStockData(stock);
      setScoreItems(items);
      setMa5(Number(currentMa5.toFixed(2)));
      setMaMonth(Number(monthAverage.toFixed(2)));
      setVolumeStatus(volumeText);
      setMaSupport(supportText);
      setTrendStatus(trendText);
      setMessage(`掃描完成，總分 ${total}，${getResult(total)}`);
      setLoading(false);
    } catch (error: any) {
      setMessage(`API錯誤：${error.message}`);
      setLoading(false);
    }
  };

  const totalScore = scoreItems.reduce((sum, item) => sum + item.score, 0);

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

    const filtered = watchList.filter((s) => s.code !== stockData.Code);
    setWatchList([...filtered, newStock].sort((a, b) => b.totalScore - a.totalScore));
  };

  const clearWatchList = () => {
    setWatchList([]);
  };

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    color: "white",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
    background:
      "radial-gradient(circle at top left, rgba(56,189,248,0.35), transparent 30%), radial-gradient(circle at top right, rgba(34,197,94,0.25), transparent 25%), linear-gradient(135deg, #e0f2fe 0%, #0f172a 38%, #020617 100%)",
  };

  const cardStyle: React.CSSProperties = {
    background: "rgba(15, 23, 42, 0.76)",
    border: "1px solid rgba(255,255,255,0.15)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    backdropFilter: "blur(14px)",
    borderRadius: "24px",
    padding: "22px",
  };

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div
          style={{
            ...cardStyle,
            minHeight: "220px",
            marginBottom: "22px",
            background:
              "linear-gradient(135deg, rgba(14,165,233,0.38), rgba(15,23,42,0.88)), url('https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=1400&q=80') center/cover",
          }}
        >
          <h1 style={{ fontSize: "38px", margin: 0 }}>📡 股票戰情中心 v2</h1>
          <p style={{ fontSize: "18px", color: "#dbeafe" }}>
            10項評分 · 主攻排行榜 · AI戰情雷達 · 回5MA / 黃金交叉偵測
          </p>
          <p style={{ color: "#bae6fd" }}>
            自動資料目前支援上市股；籌碼、法人、大戶先用手動分數，之後逐步接 API。
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px" }}>
          <div style={cardStyle}>
            <h2>🔍 單股掃描</h2>

            <input
              placeholder="輸入股票代號，例如 2330"
              value={stockCode}
              onChange={(e) => setStockCode(e.target.value)}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "14px",
                border: "none",
                fontSize: "18px",
                marginBottom: "14px",
              }}
            />

            <h3>手動評分區</h3>

            {[
              ["主力籌碼", mainChip, setMainChip],
              ["法人動向", institution, setInstitution],
              ["籌碼乾淨度", chipClean, setChipClean],
              ["大戶持股", bigHolder, setBigHolder],
            ].map(([label, value, setter]: any) => (
              <div key={label} style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{label}</span>
                  <b>{value}/10</b>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={value}
                  onChange={(e) => setter(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>
            ))}

            <button
              onClick={scanStock}
              disabled={loading}
              style={{
                width: "100%",
                padding: "15px",
                borderRadius: "14px",
                border: "none",
                background: loading ? "#64748b" : "#2563eb",
                color: "white",
                fontSize: "18px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              {loading ? "掃描中..." : "查詢並套用10項評分"}
            </button>

            <p style={{ color: "#fde68a" }}>{message}</p>
          </div>

          <div style={cardStyle}>
            <h2>🧠 評分結果</h2>

            <h1 style={{ color: getColor(totalScore), fontSize: "46px", margin: 0 }}>
              {totalScore}
            </h1>
            <h2 style={{ color: getColor(totalScore) }}>{getResult(totalScore)}</h2>

            {stockData && (
              <>
                <h3>
                  {stockData.Name} ({stockData.Code})
                </h3>
                <p>收盤價：{stockData.ClosingPrice}</p>
                <p>漲跌：{stockData.Change}</p>
                <p>成交量：{stockData.TradeVolume}</p>
                <p>5MA：{ma5}</p>
                <p>近月均線：{maMonth}</p>
                <p>量能：{volumeStatus}</p>
                <p>回檔：{maSupport}</p>
                <p>均線：{trendStatus}</p>

                <button
                  onClick={addToWatchList}
                  style={{
                    width: "100%",
                    padding: "13px",
                    borderRadius: "14px",
                    border: "none",
                    background: "#22c55e",
                    color: "white",
                    fontSize: "18px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  加入主攻排行榜
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ ...cardStyle, marginTop: "22px" }}>
          <h2>📊 10項評分明細</h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
            {scoreItems.map((item) => (
              <div
                key={item.name}
                style={{
                  padding: "14px",
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.08)",
                  borderLeft: `6px solid ${getColor(item.score * 10)}`,
                }}
              >
                <h3>{item.name}</h3>
                <h2>{item.score}/10</h2>
                <p style={{ color: "#cbd5e1" }}>{item.reason}</p>
                <small>{item.auto ? "自動判斷" : "手動輸入"}</small>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...cardStyle, marginTop: "22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>🏆 主攻排行榜</h2>
            <button
              onClick={clearWatchList}
              style={{
                padding: "10px 14px",
                borderRadius: "12px",
                border: "none",
                background: "#ef4444",
                color: "white",
                cursor: "pointer",
              }}
            >
              清空
            </button>
          </div>

          {watchList.length === 0 && <p style={{ color: "#cbd5e1" }}>尚未加入股票。</p>}

          {watchList.map((stock, index) => (
            <div
              key={stock.code}
              style={{
                marginTop: "14px",
                padding: "16px",
                borderRadius: "18px",
                background: "rgba(255,255,255,0.08)",
                borderLeft: `8px solid ${getColor(stock.totalScore)}`,
              }}
            >
              <h2>
                #{index + 1} {stock.name} ({stock.code})
              </h2>
              <h2 style={{ color: getColor(stock.totalScore) }}>
                {stock.totalScore}分 ｜ {stock.result}
              </h2>
              <p>收盤價：{stock.close}</p>
              <p>{stock.volumeStatus} ｜ {stock.maSupport} ｜ {stock.trendStatus}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;