import { useState } from "react";
import "./App.css";

function App() {
  const [stockCode, setStockCode] = useState("");
  const [stockData, setStockData] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [score, setScore] = useState(0);

  const [volumeGood, setVolumeGood] = useState(false);
  const [bigPlayer, setBigPlayer] = useState(false);
  const [maSupport, setMaSupport] = useState(false);
  const [goldenCross, setGoldenCross] = useState(false);
  const [foreignBuy, setForeignBuy] = useState(false);

  const calculateScore = () => {
    let total = 0;

    if (volumeGood) total += 20;
    if (bigPlayer) total += 20;
    if (maSupport) total += 20;
    if (goldenCross) total += 20;
    if (foreignBuy) total += 20;

    setScore(total);
  };

  const getResult = () => {
    if (score >= 80) return "🔥 主攻級";
    if (score >= 60) return "⚡ 觀察級";
    if (score >= 40) return "🟡 普通";
    return "❌ 淘汰";
  };

  const getStockData = async () => {
    setMessage("");
    setStockData(null);

    if (!stockCode) {
      setMessage("請輸入股票代號");
      return;
    }

    try {
      const response = await fetch("/api/stock");

      if (!response.ok) {
        setMessage("API連線失敗");
        return;
      }

      const data = await response.json();

      console.log(data);

      const stock = data.find(
        (item: any) => item.Code === stockCode.trim()
      );

      if (!stock) {
        setMessage("找不到股票");
        return;
      }

      setStockData(stock);
      setMessage("查詢成功");
    } catch (error) {
      console.log(error);
      setMessage("API錯誤");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07122b",
        color: "white",
        padding: "30px",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: "30px" }}>
        📡 股票戰情中心
      </h1>

      <div
        style={{
          maxWidth: "600px",
          margin: "auto",
          background: "#1b2942",
          padding: "25px",
          borderRadius: "20px",
        }}
      >
        <input
          type="text"
          placeholder="股票代號"
          value={stockCode}
          onChange={(e) => setStockCode(e.target.value)}
          style={{
            width: "100%",
            padding: "15px",
            marginBottom: "15px",
            borderRadius: "10px",
            border: "none",
            fontSize: "18px",
          }}
        />

        <button
          onClick={getStockData}
          style={{
            width: "100%",
            padding: "15px",
            background: "#3264e6",
            color: "white",
            border: "none",
            borderRadius: "10px",
            fontSize: "20px",
            cursor: "pointer",
          }}
        >
          查詢股票
        </button>

        <div style={{ marginTop: "20px", lineHeight: "35px" }}>
          <label>
            <input
              type="checkbox"
              checked={volumeGood}
              onChange={(e) => setVolumeGood(e.target.checked)}
            />
            健康成交量
          </label>

          <br />

          <label>
            <input
              type="checkbox"
              checked={bigPlayer}
              onChange={(e) => setBigPlayer(e.target.checked)}
            />
            大戶增加
          </label>

          <br />

          <label>
            <input
              type="checkbox"
              checked={maSupport}
              onChange={(e) => setMaSupport(e.target.checked)}
            />
            回5MA不破
          </label>

          <br />

          <label>
            <input
              type="checkbox"
              checked={goldenCross}
              onChange={(e) => setGoldenCross(e.target.checked)}
            />
            黃金交叉
          </label>

          <br />

          <label>
            <input
              type="checkbox"
              checked={foreignBuy}
              onChange={(e) => setForeignBuy(e.target.checked)}
            />
            外資買超
          </label>
        </div>

        <button
          onClick={calculateScore}
          style={{
            width: "100%",
            marginTop: "20px",
            padding: "12px",
            background: "#ff4747",
            border: "none",
            borderRadius: "10px",
            color: "white",
            fontSize: "18px",
            cursor: "pointer",
          }}
        >
          計算評分
        </button>

        <h2 style={{ marginTop: "20px", color: "#ffd54f" }}>
          目前分數：{score}
        </h2>

        <h2 style={{ color: "#ff7b7b" }}>
          目前結果：{getResult()}
        </h2>

        <p style={{ color: "#ffd54f" }}>{message}</p>

        {stockData && (
          <div
            style={{
              marginTop: "25px",
              background: "#26354f",
              padding: "20px",
              borderRadius: "15px",
            }}
          >
            <h2>
              {stockData.Name} ({stockData.Code})
            </h2>

            <p>收盤價：{stockData.ClosingPrice}</p>
            <p>漲跌：{stockData.Change}</p>
            <p>成交量：{stockData.TradeVolume}</p>
            <p>開盤價：{stockData.OpeningPrice}</p>
            <p>最高價：{stockData.HighestPrice}</p>
            <p>最低價：{stockData.LowestPrice}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;