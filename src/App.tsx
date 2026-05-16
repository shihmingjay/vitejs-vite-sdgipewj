import { useState } from "react";

function App() {
  const [stockCode, setStockCode] = useState("");
  const [stockData, setStockData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const getStockData = async () => {
    setStockData(null);
    setMessage("");

    if (!stockCode) {
      setMessage("請先輸入股票代號");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/stock"
      );

      if (!response.ok) {
        setMessage("API連線失敗");
        setLoading(false);
        return;
      }

      const data = await response.json();

      const stock = data.find((item: any) => item.Code === stockCode.trim());

      if (!stock) {
        setMessage("查不到這個股票代號，可能是上櫃股或資料尚未更新");
      } else {
        setStockData(stock);
        setMessage("查詢成功");
      }
    } catch (error) {
      setMessage("抓資料失敗，可能是瀏覽器或API擋住連線");
    }

    setLoading(false);
  };

  return (
    <div style={{ background: "#0f172a", minHeight: "100vh", color: "white", padding: "30px", fontFamily: "Arial" }}>
      <h1>📡 台股即時資料中心</h1>

      <div style={{ background: "#1e293b", padding: "20px", borderRadius: "16px", maxWidth: "500px" }}>
        <input
          placeholder="輸入股票代號，例如 2330"
          value={stockCode}
          onChange={(e) => setStockCode(e.target.value)}
          style={{ width: "100%", padding: "12px", borderRadius: "10px", marginBottom: "20px" }}
        />

        <button
          onClick={getStockData}
          style={{ width: "100%", padding: "14px", borderRadius: "10px", border: "none", background: "#2563eb", color: "white", fontSize: "18px", fontWeight: "bold", cursor: "pointer" }}
        >
          查詢股票
        </button>
      </div>

      {loading && <h2>資料抓取中...</h2>}

      {message && <h2 style={{ color: "#facc15" }}>{message}</h2>}

      {stockData && (
        <div style={{ background: "#1e293b", padding: "20px", borderRadius: "16px", maxWidth: "500px", marginTop: "30px" }}>
          <h2>{stockData.Name} ({stockData.Code})</h2>
          <h3>收盤價：{stockData.ClosingPrice}</h3>
          <h3>漲跌價差：{stockData.Change}</h3>
          <h3>成交量：{stockData.TradeVolume}</h3>
          <h3>開盤價：{stockData.OpeningPrice}</h3>
          <h3>最高價：{stockData.HighestPrice}</h3>
          <h3>最低價：{stockData.LowestPrice}</h3>
        </div>
      )}
    </div>
  );
}

export default App;