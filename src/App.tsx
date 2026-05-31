import { useEffect, useState } from "react";
import RankingBoard from "./components/RankingBoard";
import type { ScoreItem, StockApiItem, WatchStock } from "./types";
import "./App.css";
import { getChipData } from "./services/chipApi";
import {
  analyzeV2ShortStock,
  type V2ShortAnalysis,
} from "./engine/v2ShortEngine";
import {
  checkApplicability,
  convertAiResultToScores,
  normalizeAiScreenshotResult,
  type AiScreenshotResult,
  type V2HybridScores,
} from "./engine/v2AiScreenshotSchema";
import {
  buildScreenshotPayload,
  type ScreenshotPayloadItem,
} from "./engine/v2ImagePayload";

type ScreenshotItem = {
  id: string;
  fileName: string;
  imageUrl: string;
  mimeType: string;
  base64: string;
};

function getBattleResult(score: number) {
  if (score >= 80) {
    return {
      label: "刺客出擊",
      icon: "🗡",
      className: "result-assassin",
    };
  }

  if (score >= 60) {
    return {
      label: "斥侯觀察",
      icon: "🏹",
      className: "result-scout",
    };
  }

  return {
    label: "騎士撤守",
    icon: "🛡",
    className: "result-knight",
  };
}

function App() {
  const [stockCode, setStockCode] = useState("");
  const [stockData, setStockData] = useState<StockApiItem | null>(null);
  const [historyDataCache, setHistoryDataCache] = useState<any | null>(null);
  const [analysis, setAnalysis] = useState<V2ShortAnalysis | null>(null);
  const [scoreItems, setScoreItems] = useState<ScoreItem[]>([]);
  const [watchList, setWatchList] = useState<WatchStock[]>([]);
  const [message, setMessage] = useState("輸入股票代號，派出斥侯探路。");
  const [loading, setLoading] = useState(false);

  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [screenshotNote, setScreenshotNote] = useState("");

  const [aiResult, setAiResult] = useState<AiScreenshotResult | null>(null);
  const [hybridScores, setHybridScores] = useState<V2HybridScores | null>(null);
  const [aiMessage, setAiMessage] = useState("尚未解析情報卷軸。");
  const [aiLoading, setAiLoading] = useState(false);
  const [isAiApplied, setIsAiApplied] = useState(false);

  const totalScore = analysis?.finalScore ?? 0;
  const battleResult = getBattleResult(totalScore);

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

  const uploadScreenshots = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (!imageFiles.length) {
      event.target.value = "";
      return;
    }

    try {
      setAiMessage("正在整理情報卷軸...");

      const payload: ScreenshotPayloadItem[] = await buildScreenshotPayload(
        imageFiles
      );

      const nextImages: ScreenshotItem[] = imageFiles
        .map((file, index) => {
          const imagePayload = payload[index];

          if (!imagePayload || !imagePayload.base64) {
            return null;
          }

          return {
            id: `${file.name}-${Date.now()}-${Math.random()}`,
            fileName: file.name,
            imageUrl: URL.createObjectURL(file),
            mimeType: imagePayload.mimeType,
            base64: imagePayload.base64,
          };
        })
        .filter((item): item is ScreenshotItem => item !== null);

      if (!nextImages.length) {
        setAiMessage("卷軸讀取失敗，請重新上傳。");
        event.target.value = "";
        return;
      }

      setScreenshots((prev) => [...prev, ...nextImages]);
      setAiResult(null);
      setHybridScores(null);
      setIsAiApplied(false);
      setAiMessage("情報卷軸已送達，尚未解析。");
    } catch (error: any) {
      setAiMessage(`卷軸讀取失敗：${error.message}`);
    }

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

    setAiResult(null);
    setHybridScores(null);
    setIsAiApplied(false);
    setAiMessage("卷軸已變更，請重新解析情報。");
  };

  const clearScreenshots = () => {
    screenshots.forEach((item) => {
      URL.revokeObjectURL(item.imageUrl);
    });

    setScreenshots([]);
    setScreenshotNote("");
    setAiResult(null);
    setHybridScores(null);
    setIsAiApplied(false);
    setAiMessage("尚未解析情報卷軸。");
  };

  const scanStock = async () => {
    try {
      const chipData = await getChipData(stockCode);
      console.log("籌碼資料:", chipData);

      setLoading(true);
      setMessage("斥侯探路中...");
      setStockData(null);
      setHistoryDataCache(null);
      setAnalysis(null);
      setScoreItems([]);
      setAiResult(null);
      setHybridScores(null);
      setIsAiApplied(false);
      setAiMessage("尚未解析情報卷軸。");

      const code = stockCode.trim();

      if (!code) {
        setMessage("請先輸入股票代號。");
        setLoading(false);
        return;
      }

      const stockResponse = await fetch("/api/stock");
      const allStocks = await stockResponse.json();

      if (!Array.isArray(allStocks)) {
        setMessage("stock API 格式錯誤。");
        setLoading(false);
        return;
      }

      const stock = allStocks.find((item: StockApiItem) => item.Code === code);

      if (!stock) {
        setMessage("查無股票，可能是上櫃股或資料尚未更新。");
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
        setMessage("歷史資料不足，斥侯無法判讀均線。");
        setLoading(false);
        return;
      }

      const nextAnalysis = analyzeV2ShortStock(stock, historyData);
      const nextBattleResult = getBattleResult(nextAnalysis.finalScore);

      setStockData(stock);
      setHistoryDataCache(historyData);
      setAnalysis(nextAnalysis);
      setScoreItems(nextAnalysis.items);
      setMessage(
        `探路完成，戰力 ${nextAnalysis.finalScore}，${nextBattleResult.label}`
      );
      setLoading(false);
    } catch (error: any) {
      setMessage(`探路失敗：${error.message}`);
      setLoading(false);
    }
  };

  const analyzeScreenshotByApi = async () => {
    const code = stockCode.trim();

    if (!code) {
      setAiMessage("請先輸入股票代號，再解析情報卷軸。");
      return;
    }

    if (screenshots.length === 0) {
      setAiMessage("請先上傳至少一張情報卷軸。");
      return;
    }

    try {
      setAiLoading(true);
      setAiMessage("卷軸解析中，正在交叉判讀截圖資訊...");

      const response = await fetch("/api/analyze-screenshot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputCode: code,
          imageCount: screenshots.length,
          note: screenshotNote,
          images: screenshots.map((item) => ({
            fileName: item.fileName,
            mimeType: item.mimeType,
            base64: item.base64,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAiMessage(
          `卷軸解析失敗：${data?.message || data?.error || "未知錯誤"}`
        );
        setAiLoading(false);
        return;
      }

      const normalizedResult = normalizeAiScreenshotResult(data);
      const applyStatus = checkApplicability(normalizedResult);
      const nextHybridScores = convertAiResultToScores(normalizedResult);

      setAiResult(normalizedResult);
      setHybridScores(nextHybridScores);
      setIsAiApplied(false);

      if (applyStatus === "CAN_APPLY") {
        setAiMessage("卷軸解析成功，可套用至戰力評分。");
      } else if (applyStatus === "NEEDS_CONFIRMATION") {
        setAiMessage("卷軸解析完成，但需要確認後再套用。");
      } else {
        setAiMessage("卷軸結果不可套用，請檢查截圖股號。");
      }

      setAiLoading(false);
    } catch (error: any) {
      setAiMessage(`卷軸解析失敗：${error.message}`);
      setAiLoading(false);
    }
  };

  const applyAiScoresToV2 = () => {
    if (!stockData || !historyDataCache || !hybridScores) {
      setAiMessage("缺少股票資料或卷軸解析資料，無法套用。");
      return;
    }

    if (!hybridScores.canApply) {
      setAiMessage("目前卷軸解析結果不可直接套用。");
      return;
    }

    const nextAnalysis = analyzeV2ShortStock(
      stockData,
      historyDataCache,
      hybridScores
    );
    const nextBattleResult = getBattleResult(nextAnalysis.finalScore);

    setAnalysis(nextAnalysis);
    setScoreItems(nextAnalysis.items);
    setIsAiApplied(true);
    setMessage(
      `已套用卷軸籌碼分數，戰力 ${nextAnalysis.finalScore}，${nextBattleResult.label}`
    );
    setAiMessage("卷軸解析結果已套用至 V2 戰力評分。");
  };

  const addToWatchList = () => {
    if (!stockData || !analysis || !scoreItems.length) return;

    const newStock: WatchStock = {
      code: stockData.Code,
      name: stockData.Name,
      close: stockData.ClosingPrice,
      totalScore: analysis.finalScore,
      result: getBattleResult(analysis.finalScore).label,
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
          🏹 V2 斥侯短擊
        </button>

        <button className="mode-button" onClick={goV3}>
          🛡 V3 波段遠征
        </button>
      </div>

      <section className="hero-panel assassin-hero-panel">
        <img
          className="assassin-hero-image"
          src="/assassin-hero.png"
          alt="情報斥侯主視覺"
        />

        <div className="assassin-hero-shade" />

        <div className="assassin-hero-content">
          <h1>情報斥侯</h1>
          <p className="assassin-hero-subtitle">彭姊的福音</p>
          <p className="assassin-hero-text">不用很會也可以</p>
        </div>
      </section>

      <div className="dashboard-grid">
        <div className="stock-card main-card">
          <h2>🗡 短線斥侯掃描器</h2>

          <input
            value={stockCode}
            onChange={(e) => setStockCode(e.target.value)}
            placeholder="輸入股票代號，例如 2330"
          />

          <button onClick={scanStock} disabled={loading}>
            {loading ? "斥侯探路中..." : "送出斥侯掃描"}
          </button>

          <div className="score-orb">
            <span className="score-orb-label">戰力評分</span>
            <strong
              className={
                totalScore >= 80
                  ? "score-high"
                  : totalScore >= 60
                  ? "score-medium"
                  : "score-low"
              }
            >
              {totalScore}
            </strong>
          </div>

          <div className={`result-banner ${battleResult.className}`}>
            <span className="result-banner-icon">{battleResult.icon}</span>
            <div className="result-banner-text">
              <small>目前結果</small>
              <strong>{battleResult.label}</strong>
            </div>
          </div>

          <p className="scan-status">{message}</p>

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

              <div className="info-panel">
                <h3>📜 資料來源狀態</h3>
                <p>價格 / K線 / 量能：盤後 API</p>
                <p>均線 / Trigger / 熔斷：V2 短線引擎自動計算</p>

                {isAiApplied ? (
                  <>
                    <p>主力籌碼：情報卷軸已套用</p>
                    <p>法人動向：情報卷軸已套用</p>
                    <p>大戶持股：情報卷軸已套用</p>
                    <p>籌碼乾淨度：情報卷軸已套用</p>
                  </>
                ) : (
                  <>
                    <p>主力籌碼：未提供情報卷軸，使用中性分</p>
                    <p>法人動向：未提供情報卷軸，使用中性分</p>
                    <p>大戶持股：未提供情報卷軸，使用中性分</p>
                    <p>籌碼乾淨度：未提供情報卷軸，使用中性分</p>
                  </>
                )}
              </div>

              <button onClick={addToWatchList}>加入主攻戰情榜</button>
            </div>
          )}
        </div>

        <div className="stock-card screenshot-card">
          <div className="screenshot-header">
            <div>
              <h2>🧙 情報卷軸輔助區</h2>
              <p className="helper-text">
                不用分類，直接把籌碼、K線、主力、法人或任何股票截圖丟進來。
              </p>
            </div>

            <button className="danger-button" onClick={clearScreenshots}>
              清空卷軸
            </button>
          </div>

          <label className="simple-upload">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={uploadScreenshots}
            />
            <span>點我上傳情報卷軸</span>
            <small>支援多張圖片，適合新手直接使用</small>
          </label>

          <textarea
            className="main-note"
            value={screenshotNote}
            onChange={(event) => setScreenshotNote(event.target.value)}
            placeholder="可輸入臨時觀察，例如：主力連買、散戶下降、今天回5MA、上影線偏長..."
          />

          <div className="info-panel">
            <h3>卷軸解析狀態</h3>
            <p>{aiMessage}</p>

            <button onClick={analyzeScreenshotByApi} disabled={aiLoading}>
              {aiLoading ? "解析中..." : "解析情報卷軸"}
            </button>

            <button
              onClick={applyAiScoresToV2}
              disabled={!hybridScores?.canApply}
            >
              套用至戰力評分
            </button>

            {aiResult && hybridScores && (
              <div className="ai-result-scroll">
                <p>偵測股號：{aiResult.meta.detectedCodes.join("、")}</p>
                <p>輸入股號：{aiResult.meta.inputCode}</p>
                <p>股號一致：{aiResult.meta.isCodeMatched ? "是" : "否"}</p>
                <p>整體信心度：{aiResult.meta.overallConfidence}%</p>
                <p>套用狀態：{hybridScores.applyStatus}</p>
                <p>資料來源：{hybridScores.sourceLabel}</p>

                <p>
                  主力籌碼：
                  {aiResult.chipsData.mainForce.value}｜
                  {aiResult.chipsData.mainForce.rawText}｜ 信心度{" "}
                  {aiResult.chipsData.mainForce.confidence}%
                </p>

                <p>
                  大戶持股：
                  {aiResult.chipsData.bigHolder.value}｜
                  {aiResult.chipsData.bigHolder.rawText}｜ 信心度{" "}
                  {aiResult.chipsData.bigHolder.confidence}%
                </p>

                <p>
                  散戶持股：
                  {aiResult.chipsData.retail.value}｜
                  {aiResult.chipsData.retail.rawText}｜ 信心度{" "}
                  {aiResult.chipsData.retail.confidence}%
                </p>

                <p>
                  法人動向：
                  {aiResult.chipsData.institution.value}｜
                  {aiResult.chipsData.institution.rawText}｜ 信心度{" "}
                  {aiResult.chipsData.institution.confidence}%
                </p>

                <p>
                  籌碼乾淨度：
                  {aiResult.chipsData.chipCleanliness.value}｜
                  {aiResult.chipsData.chipCleanliness.rawText}｜ 信心度{" "}
                  {aiResult.chipsData.chipCleanliness.confidence}%
                </p>
              </div>
            )}
          </div>

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
        <h2>📜 評分明細</h2>

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