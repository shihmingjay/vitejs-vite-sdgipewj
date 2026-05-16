import { useState } from 'react';

type Stock = {
  name: string;
  code: string;
  score: number;
  result: string;
};

function App() {
  const [stockName, setStockName] = useState('');
  const [stockCode, setStockCode] = useState('');
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

  let result = '淘汰';
  let color = '#ef4444';

  if (score >= 80) {
    result = '主攻';
    color = '#22c55e';
  } else if (score >= 60) {
    result = '觀察';
    color = '#eab308';
  }

  const addStock = () => {
    if (!stockName || !stockCode) return;

    const newStock = {
      name: stockName,
      code: stockCode,
      score,
      result,
    };

    setStocks([...stocks, newStock].sort((a, b) => b.score - a.score));

    setStockName('');
    setStockCode('');
    setVolume(false);
    setBigPlayer(false);
    setPullback(false);
    setGoldenCross(false);
    setForeignBuy(false);
  };

  const deleteStock = (code: string) => {
    setStocks(stocks.filter((stock) => stock.code !== code));
  };

  return (
    <div
      style={{
        background: '#111827',
        minHeight: '100vh',
        color: 'white',
        padding: '30px',
        fontFamily: 'Arial',
      }}
    >
      <h1>股票戰情評分系統</h1>

      <div
        style={{
          background: '#1f2937',
          padding: '20px',
          borderRadius: '16px',
          maxWidth: '520px',
          marginBottom: '25px',
        }}
      >
        <input
          placeholder="股票名稱"
          value={stockName}
          onChange={(e) => setStockName(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '10px',
            borderRadius: '8px',
          }}
        />

        <input
          placeholder="股票代號"
          value={stockCode}
          onChange={(e) => setStockCode(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '20px',
            borderRadius: '8px',
          }}
        />

        <label>
          <input
            type="checkbox"
            checked={volume}
            onChange={() => setVolume(!volume)}
          />
          健康成交量
        </label>
        <br />

        <label>
          <input
            type="checkbox"
            checked={bigPlayer}
            onChange={() => setBigPlayer(!bigPlayer)}
          />
          大戶增加
        </label>
        <br />

        <label>
          <input
            type="checkbox"
            checked={pullback}
            onChange={() => setPullback(!pullback)}
          />
          回5MA不破
        </label>
        <br />

        <label>
          <input
            type="checkbox"
            checked={goldenCross}
            onChange={() => setGoldenCross(!goldenCross)}
          />
          黃金交叉
        </label>
        <br />

        <label>
          <input
            type="checkbox"
            checked={foreignBuy}
            onChange={() => setForeignBuy(!foreignBuy)}
          />
          外資買超
        </label>

        <div style={{ marginTop: '25px' }}>
          <h2 style={{ color }}>目前分數：{score}</h2>
          <h2 style={{ color }}>目前結果：{result}</h2>

          <button
            onClick={addStock}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: color,
              color: 'white',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            加入觀察清單
          </button>
        </div>
      </div>

      <h2>觀察清單，自動依分數排序</h2>

      {stocks.map((stock) => (
        <div
          key={stock.code}
          style={{
            background: '#1f2937',
            padding: '18px',
            borderRadius: '14px',
            maxWidth: '520px',
            marginBottom: '12px',
          }}
        >
          <h2>
            {stock.name} ({stock.code})
          </h2>
          <p>分數：{stock.score}</p>
          <p>結果：{stock.result}</p>

          <button
            onClick={() => deleteStock(stock.code)}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            刪除
          </button>
        </div>
      ))}
    </div>
  );
}

export default App;
