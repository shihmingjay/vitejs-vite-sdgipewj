import type { WatchStock } from "../types";

type Props = {
  watchList: WatchStock[];
  removeStock: (code: string) => void;
  clearAll: () => void;
};

function RankingBoard({ watchList, removeStock, clearAll }: Props) {
  return (
    <div className="stock-card">
      <h2>🏆 主攻排行榜</h2>

      {watchList.length === 0 ? (
        <p>目前沒有資料</p>
      ) : (
        watchList.map((stock, index) => (
          <div key={stock.code} className="stock-card">
            <h3>
              #{index + 1} {stock.name} ({stock.code})
            </h3>

            <p>收盤價：{stock.close}</p>
            <p>分數：{stock.totalScore}</p>
            <p>結果：{stock.result}</p>
            <p>量能：{stock.volumeStatus}</p>
            <p>5MA：{stock.maSupport}</p>
            <p>平均線：{stock.trendStatus}</p>

            <button onClick={() => removeStock(stock.code)}>刪除此股票</button>
          </div>
        ))
      )}

      {watchList.length > 0 && (
        <button onClick={clearAll}>清空排行榜</button>
      )}
    </div>
  );
}

export default RankingBoard;