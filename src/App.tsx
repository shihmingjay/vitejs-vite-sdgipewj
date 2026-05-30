import { useEffect, useState } from "react";
import RankingBoard from "./components/RankingBoard";
import type { ScoreItem, StockApiItem, WatchStock } from "./types";
import "./App.css";
import { getChipData } from "./services/chipApi";
import {
  analyzeV2ShortStock,
  getV2Result,
  type V2ShortAnalysis,
} from "./engine/v2ShortEngine";

type ScreenshotItem = {
  id: string;
  fileName: string;
  imageUrl: string;
};

function App() {
  const [stockCode, setStockCode] = useState("");
  const [stockData, setStockData] = useState<StockApiItem | null>(null);
  const [analysis, setAnalysis] = useState<V2ShortAnalysis | null>(null);
  const [scoreItems, setScoreItems] = useState<ScoreItem[]>([]);
  const [watchList, setWatchList] = useState<WatchStock[]>([]);
  const [message, setMessage] = useState("輸入股票代號，啟動戰情掃描。");
  const [loading, setLoading] = useState(false);

  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [screenshotNote, setScreenshotNote] = useState("");

  const totalScore = analysis?.finalScore ?? 0;

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
      setAnalysis(null);
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

      if (
        !historyData ||
        !Array.isArray(historyData.data) ||
        historyData.data.length < 5
      ) {
        setMessage("歷史資料不足，無法計算均線");
        setLoading(false);
        return;
      }

      const nextAnalysis = analyzeV2ShortStock(stock, historyData);

      setStockData(stock);
      setAnalysis(nextAnalysis);
      setScoreItems(nextAnalysis.items);
      setMessage(
        `查詢成功，總分 ${nextAnalysis.finalScore}，${nextAnalysis.result}`
      );
      setLoading(false);
    } catch (error: any) {
      setMessage(`API錯誤：${error.message}`);
      setLoading(false);
    }
  };

  const addToWatchList = () => {
    if (!stockData || !analysis || !scoreItems.length) return;

    const newStock: WatchStock = {
      code: stockData.Code,
      name: stockData.Name,
      close: stockData.ClosingPrice,
      totalScore: analysis.finalScore,
      result: getV2Result(analysis.finalScore),
      items: scoreItems,
      ma5: analysis.ma5,
      maMonth: analysis.maMonth,
      volumeStatus: analysis.volumeStatus,
      maSupport: analysis.maSupport,
      trendStatus: analysis.trendStatus,
      pressureStatus: analysis.pressureStatus,
      pressureScore: analysis.pressureScore,
      pressurePercent: analysis.pressurePercent,
      attackScore: analysis.attackScore,
      attackStatus: analysis.attackStatus,
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

          <h2 className="result-glow">
            目前結果：{getV2Result(totalScore)}
          </h2>

          <p>{message}</p>

          {stockData && analysis && (
            <div className="info-panel">
              <h2>
                {stockData.Name} ({stockData.Code})
              </h2>
              <p>收盤價：{stockData.ClosingPrice}</p>
              <p>漲跌：{stockData.Change}</p>
              <p>成交量：{stockData.TradeVolume}</p>
              <p>5MA：{analysis.ma5}</p>
              <p>近月均線：{analysis.maMonth}</p>
              <p>量能判斷：{analysis.volumeStatus}</p>
              <p>5MA判斷：{analysis.maSupport}</p>
              <p>平均線觀察：{analysis.trendStatus}</p>
              <p>近10日賣壓：{analysis.pressureStatus}</p>
              <p>賣壓警示分：{analysis.pressureScore}/100</p>

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