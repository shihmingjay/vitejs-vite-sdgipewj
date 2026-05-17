import type { WatchStock } from "../types";

type Props = {
  watchList: WatchStock[];
  removeStock: (code: string) => void;
  clearAll: () => void;
};

function getScoreClass(score: number) {
  if (score >= 80) return "score-high";
  if (score >= 60) return "score-medium";
  return "score-low";
}

function RankingBoard({
  watchList,
  removeStock,
  clearAll,
}: Props) {
  return (
    <div className="stock-card">
      <h2>🏆 主攻排行榜</h2>

      {watchList.length === 0 && (
        <p>目前沒有資料</p>
      )}

      {watchList.map((stock, index) => (
        <div
          key={stock.code}
          style={{
            background: "#f8fafc",
            borderRadius: "18px",
            padding: "18px",
            marginTop: "18px",
            border: "1px solid #cbd5e1",
            boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
          }}
        >
          <h3>
            #{index + 1} {stock.name} ({stock.code})
          </h3>

          <p>
            收盤價：{stock.close}
          </p>

          <p
            className={getScoreClass(stock.totalScore)}
          >
            分數：{stock.totalScore}
          </p>

          <p>{stock.result}</p>

          <p>
            量能：{stock.volumeStatus}
          </p>

          <p>
            5MA：{stock.maSupport}
          </p>

          <p>
            平均線：{stock.trendStatus}
          </p>
          <p>
  賣壓：
  {stock.pressureStatus}
</p>

<p>
  賣壓分：
  {stock.pressureScore}/100
</p>
          <button
            onClick={() =>
              removeStock(stock.code)
            }
            style={{
              background:
                "linear-gradient(135deg,#ef4444,#f97316)",
            }}
          >
            刪除此股票
          </button>
        </div>
      ))}

      {watchList.length > 0 && (
        <button
          onClick={clearAll}
          style={{
            marginTop: "20px",
            background:
              "linear-gradient(135deg,#7c3aed,#2563eb)",
          }}
        >
          清空排行榜
        </button>
      )}
    </div>
  );
}

export default RankingBoard;