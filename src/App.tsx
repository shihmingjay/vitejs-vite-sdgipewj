import { useState } from "react";

type Stock = {
  name: string;
  code: string;
  score: number;
  result: string;
  color: string;
  warning: string;
};

function App() {
  const [stockName, setStockName] = useState("");
  const [stockCode, setStockCode] = useState("");
  const [stocks, setStocks] = useState<Stock[]>([]);

  const [volume, setVolume] = useState(false);
  const [bigPlayer, setBigPlayer] = useState(false);
  const [pullback, setPullback] = useState(false);
  const [goldenCross, setGoldenCross] = useState(false);
  const [foreignBuy, setForeignBuy] = useState(false);

  let score = 0;

  if (volume) score += 20;
  if (bigPlayer) score += 20;
  if (pullback) score += 20;
  if (goldenCross) score += 20;
  if (foreignBuy) score += 20;

  let result = "淘汰";
  let color = "#ef4444";
  let warning = "⚠️ 主力與趨勢尚未同步";

  if (score >= 80) {
    result = "主攻";
    color = "#22c55e";
    warning = "🔥 可列入主攻觀察";
  } else if (score >= 60) {
    result = "觀察";
    color = "#eab308";
    warning = "⚠️ 尚未完全轉強";
  }

  const addStock = () => {
    if (!stockName || !stockCode) return;

    const newStock = {
      name: stockName,
      code: stockCode,
      score,
      result,
      color,
      warning,
    };

    setStocks([...stocks, newStock].sort((a, b) => b.score - a.score));

    setStockName("");
    setStockCode("");
    setVolume(false);
    setBigPlayer(false);
    setPullback(false);
    setGoldenCross(false);
    setForeignBuy(false);
  };

  const clearStocks = () => {
    setStocks([]);
  };

  return (
    <div
      style={{
        background: "#0f172a",
        minHeight: "100vh",
        color: "white",
        padding: "30px",
        fontFamily: "Arial",
      }}
    >
      <h1 style={{ marginBottom: "20px" }}>
        📡 股票戰情中心
      </h1>

      <div
        style={{
          background: "#1e293b",
          padding: "20px",
          borderRadius: "16px",
          maxWidth: "520px",
        }}
      >
        <input
          placeholder="股票名稱"
          value={stockName}
          onChange={(e) => setStockName(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "10px",
            borderRadius: "8px",
          }}
        />

        <input
          placeholder="股票代號"
          value={stockCode}
          onChange={(e) => setStockCode(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "20px",
            borderRadius: "8px",
          }}
        />

        <label>
          <input type="checkbox" checked={volume} onChange={() => setVolume(!volume)} />
          健康成交量
        </label>

        <br />

        <label>
          <input type="checkbox" checked={bigPlayer} onChange={() => setBigPlayer(!bigPlayer)} />
          大戶增加
        </label>

        <br />

        <label>
          <input type="checkbox" checked={pullback} onChange={() => setPullback(!pullback)} />
          回5MA不破
        </label>

        <br />

        <label>
          <input type="checkbox" checked={goldenCross} onChange={() => setGoldenCross(!goldenCross)} />
          黃金交叉
        </label>

        <br />

        <label>
          <input type="checkbox" checked={foreignBuy} onChange={() => setForeignBuy(!foreignBuy)} />
          外資買超
        </label>

        <div style={{ marginTop: "20px" }}>
          <h2 style={{ color }}>
            目前分數：{score}
          </h2>

          <h2 style={{ color }}>
            目前結果：{result}
          </h2>

          <div
            style={{
              background: "#334155",
              height: "16px",
              borderRadius: "999px",
              overflow: "hidden",
              marginTop: "15px",
              marginBottom: "15px",
            }}
          >
            <div
              style={{
                width: `${score}%`,
                background: color,
                height: "100%",
              }}
            />
          </div>

          <button
            onClick={addStock}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "10px",
              background: color,
              color: "white",
              fontSize: "18px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            加入觀察清單
          </button>
        </div>
      </div>

      <div style={{ marginTop: "40px", maxWidth: "520px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "15px",
          }}
        >
          <h2>🏆 主攻排行榜</h2>

          <button
            onClick={clearStocks}
            style={{
              background: "#ef4444",
              border: "none",
              color: "white",
              padding: "8px 12px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            清空
          </button>
        </div>

        {stocks.map((stock, index) => (
          <div
            key={stock.code}
            style={{
              background: "#1e293b",
              padding: "18px",
              borderRadius: "14px",
              marginBottom: "14px",
              borderLeft: `8px solid ${stock.color}`,
            }}
          >
            <h2>
              #{index + 1} {stock.name} ({stock.code})
            </h2>

            <h3 style={{ color: stock.color }}>
              分數：{stock.score} ｜ {stock.result}
            </h3>

            <p>{stock.warning}</p>

            <div
              style={{
                background: "#334155",
                height: "12px",
                borderRadius: "999px",
                overflow: "hidden",
                marginTop: "10px",
              }}
            >
              <div
                style={{
                  width: `${stock.score}%`,
                  background: stock.color,
                  height: "100%",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;