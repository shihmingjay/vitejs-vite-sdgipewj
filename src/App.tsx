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
  const [scanLoading, setScanLoading] = useState(false);

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

  const getColor = (score: number) => {
    if (score >= 80) return "#16a34a";
    if (score >= 70) return "#0284c7";
    if (score >= 60) return "#ca8a04";
    return "#dc2626";
  };

  const analyzeStock = async (
    stock: StockApiItem,
    manualScores = {
      mainChip,
      institution,
      chipClean,
      bigHolder,
    }
  ): Promise<WatchStock | null> => {
    const historyRes = await fetch(`/api/history?code=${stock.Code}`);
    const history = await historyRes.json();

    if (!history || !Array.isArray(history.data) || history.data.length < 5) {
      return null;
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
      { name: "主力籌碼", score: manualScores.mainChip, reason: "目前先手動輸入", auto: false },
      { name: "法人動向", score: manualScores.institution, reason: "目前先手動輸入", auto: false },
      { name: "位階", score: positionScore, reason: close >= currentMa5 ? "站上短均" : "短線偏弱", auto: true },
      { name: "技術面", score: technicalScore, reason: trendText, auto: true },
      { name: "K線品質", score: candleScore, reason: candleReason, auto: true },
      { name: "回檔型態", score: pullbackScore, reason: supportText, auto: true },
      { name: "籌碼乾淨度", score: manualScores.chipClean, reason: "目前先手動輸入", auto: false },
      { name: "大戶持股", score: manualScores.bigHolder, reason: "目前先手動輸入", auto: false },
      { name: "黃金交叉趨勢", score: goldenScore, reason: trendText, auto: true },
    ];

    const totalScore = items.reduce((sum, item) => sum + item.score, 0);

    return {
      code: stock.Code,
      name: stock.Name,
      close: stock.ClosingPrice,
      totalScore,
      result: getResult(totalScore),
      items,
      ma5: Number(currentMa5.toFixed(2)),
      maMonth: Number(monthAverage.toFixed(2)),
      volumeStatus: volumeText,
      maSupport: supportText,
      trendStatus: trendText,
    };
  };

  const scanStock = async () => {
    try {
      setLoading(true);
      setMessage("單股雷達掃描中...");
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

      const stock = allStocks.find((item: StockApiItem) => item.Code === code);

      if (!stock) {
        setMessage("找不到股票，可能是上櫃股或資料尚未更新。");
        setLoading(false);
        return;
      }

      const result = await analyzeStock(stock);

      if (!result) {
        setMessage("歷史資料不足，無法完整計算。");
        setLoading(false);
        return;
      }

      setStockData(stock);
      setScoreItems(result.items);
      setMa5(result.ma5);
      setMaMonth(result.maMonth);
      setVolumeStatus(result.volumeStatus);
      setMaSupport(result.maSupport);
      setTrendStatus(result.trendStatus);
      setMessage(`掃描完成，總分 ${result.totalScore}，${result.result}`);
      setLoading(false);
    } catch (error: any) {
      setMessage(`API錯誤：${error.message}`);
      setLoading(false);
    }
  };

  const autoScanMarket = async () => {
    try {
      setScanLoading(true);
      setMessage("盤後自動掃描中，先掃 70 元以下前 80 檔...");

      const stockRes = await fetch("/api/stock");
      const allStocks: StockApiItem[] = await stockRes.json();

      const candidates = allStocks
        .filter((stock) => {
          const price = toNumber(stock.ClosingPrice);
          const volume = toNumber(stock.TradeVolume);
          return stock.Code.length === 4 && price > 0 && price <= 70 && volume > 0;
        })
        .slice(0, 80);

      const results: WatchStock[] = [];

      for (const stock of candidates) {
        try {
          const result = await analyzeStock(stock, {
            mainChip: 5,
            institution: 5,
            chipClean: 5,
            bigHolder: 5,
          });

          if (result && result.totalScore >= 60) {
            results.push(result);
          }
        } catch {
          // 單檔失敗就略過，不讓整個掃描炸掉
        }
      }

      const sorted = results.sort((a, b) => b.totalScore - a.totalScore).slice(0, 30);
      setWatchList(sorted);
      setMessage(`盤後掃描完成，共找到 ${sorted.length} 檔 60 分以上股票。`);
      setScanLoading(false);
    } catch (error: any) {
      setMessage(`盤後掃描失敗：${error.message}`);
      setScanLoading(false);
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

  const deleteOneStock = (code: string) => {
    setWatchList(watchList.filter((stock) => stock.code !== code));
  };

  const clearWatchList = () => {
    setWatchList([]);
  };

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    color: "#0f172a",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
    background:
      "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 42%, #dbeafe 100%)",
  };

  const cardStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.82)",
    border: "1px solid rgba(148,163,184,0.35)",
    boxShadow: "0 18px 45px rgba(15,23,42,0.16)",
    backdropFilter: "blur(14px)",
    borderRadius: "24px",
    padding: "22px",
  };

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: "1120px", margin: "0 auto" }}>
        <div
          style={{
            ...cardStyle,
            minHeight: "230px",
            marginBottom: "22px",
            color: "white",
            background:
              "linear-gradient(135deg, rgba(14,165,233,0.50), rgba(15,23,42,0.65)), url('https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=1400&q=80') center/cover",
          }}
        >
          <h1 style={{ fontSize: "40px", margin: 0 }}>📡 股票戰情中心 v2</h1>
          <p style={{ fontSize: "18px", color: "#e0f2fe" }}>
            10項評分 · 盤後掃描 · 主攻排行榜 · 回5MA / 黃金交叉偵測
          </p>
          <button
            onClick={autoScanMarket}
            disabled={scanLoading}
            style={{
              padding: "14px 18px",
              borderRadius: "14px",
              border: "none",
              background: scanLoading ? "#64748b" : "#22c55e",
              color: "white",
              fontSize: "18px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {scanLoading ? "盤後掃描中..." : "啟動盤後自動掃描"}
          </button>
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
                border: "1px solid #cbd5e1",
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
                background: loading ? "#94a3b8" : "#2563eb",
                color: "white",
                fontSize: "18px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              {loading ? "掃描中..." : "查詢並套用10項評分"}
            </button>

            <p style={{ color: "#92400e", fontWeight: "bold" }}>{message}</p>
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
                    background: "#16a34a",
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
                  background: "#f8fafc",
                  borderLeft: `6px solid ${getColor(item.score * 10)}`,
                }}
              >
                <h3>{item.name}</h3>
                <h2>{item.score}/10</h2>
                <p style={{ color: "#475569" }}>{item.reason}</p>
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
              清空全部
            </button>
          </div>

          {watchList.length === 0 && <p style={{ color: "#475569" }}>尚未加入股票。</p>}

          {watchList.map((stock, index) => (
            <div
              key={stock.code}
              style={{
                marginTop: "14px",
                padding: "16px",
                borderRadius: "18px",
                background: "#f8fafc",
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

              <button
                onClick={() => deleteOneStock(stock.code)}
                style={{
                  padding: "9px 12px",
                  borderRadius: "10px",
                  border: "none",
                  background: "#f97316",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                刪除此股
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;