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

function getRankBadge(index: number) {
  if (index === 0) return "♕ 首席目標";
  if (index === 1) return "♘ 第二斥侯";
  if (index === 2) return "♙ 第三觀察";
  return `第 ${index + 1} 位候選`;
}

function getScoreLabel(score: number) {
  if (score >= 80) return "刺客出擊";
  if (score >= 70) return "強勢斥侯";
  if (score >= 60) return "斥侯觀察";
  return "騎士撤守";
}

function getPressureColor(value: number) {
  if (value >= 80) return "#b68a62";
  if (value >= 50) return "#c9a86a";
  return "#9fb8a4";
}

function getPressureLabel(value: number) {
  if (value >= 80) return "城門壓力重";
  if (value >= 50) return "防線有壓";
  return "路徑尚穩";
}

function safeText(value: unknown, fallback = "尚無資料") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function RankingBoard({ watchList, removeStock, clearAll }: Props) {
  const topStock = watchList[0];

  return (
    <div className="stock-card wide-card ranking-board">
      <div className="ranking-header">
        <div>
          <p className="ranking-eyebrow">SCOUT WAR TABLE</p>
          <h2>♜ 斥侯戰情榜</h2>
          <p className="helper-text">
            依照 V2 評分排序，集中觀察戰力、賣壓、攻擊結構、5MA 與量能狀態。
          </p>
        </div>

        {watchList.length > 0 && (
          <button className="ranking-clear-button" onClick={clearAll}>
            清空戰情榜
          </button>
        )}
      </div>

      {watchList.length === 0 && (
        <div className="ranking-empty">
          <h3>尚無斥侯標的</h3>
          <p>
            先輸入股票代號完成評分，再按「加入主攻戰情榜」。這裡會成為你的候選任務板。
          </p>
        </div>
      )}

      {topStock && (
        <div className="ranking-leader">
          <p>首席目標</p>
          <h3>
            ♕ {topStock.name} ({topStock.code})
          </h3>
          <span>
            戰力 {topStock.totalScore}｜{getScoreLabel(topStock.totalScore)}｜
            {safeText(topStock.attackStatus, "攻擊結構尚無資料")}
          </span>
        </div>
      )}

      <div className="ranking-grid">
        {watchList.map((stock, index) => {
          const pressureValue = Math.max(
            0,
            Math.min(100, stock.pressurePercent ?? stock.pressureScore ?? 0)
          );

          return (
            <div
              key={stock.code}
              className={index === 0 ? "ranking-card leader-card" : "ranking-card"}
            >
              <div className="ranking-card-mark" />

              <div className="ranking-card-top">
                <div>
                  <p className="ranking-badge">{getRankBadge(index)}</p>

                  <h3>
                    {stock.name} ({stock.code})
                  </h3>

                  <p className="ranking-close">收盤價：{safeText(stock.close)}</p>
                </div>

                <div className="ranking-score-box">
                  <strong className={getScoreClass(stock.totalScore)}>
                    {stock.totalScore}
                  </strong>
                  <small>{getScoreLabel(stock.totalScore)}</small>
                </div>
              </div>

              <div className="ranking-section">
                <strong>判斷結果</strong>
                <p>{safeText(stock.result, "尚無結論")}</p>
              </div>

              <div className="ranking-stats-grid">
                {[
                  ["量能", safeText(stock.volumeStatus)],
                  ["5MA", safeText(stock.maSupport)],
                  ["均線結構", safeText(stock.trendStatus)],
                  ["攻擊結構", safeText(stock.attackStatus)],
                ].map(([label, value]) => (
                  <div className="ranking-stat" key={label}>
                    <small>{label}</small>
                    <p>{value}</p>
                  </div>
                ))}
              </div>

              <div className="ranking-pressure">
                <div className="ranking-pressure-head">
                  <strong>賣壓防線</strong>
                  <span style={{ color: getPressureColor(pressureValue) }}>
                    {getPressureLabel(pressureValue)}
                  </span>
                </div>

                <p>{safeText(stock.pressureStatus)}</p>

                <div className="ranking-pressure-bar">
                  <div
                    style={{
                      width: `${pressureValue}%`,
                      background: getPressureColor(pressureValue),
                      boxShadow: `0 0 14px ${getPressureColor(pressureValue)}`,
                    }}
                  />
                </div>

                <p className="ranking-pressure-score">
                  賣壓分：{safeText(stock.pressureScore, "0")}/100
                </p>
              </div>

              <div className="ranking-source">
                <strong>資料卷宗</strong>
                <p>價格 / K線 / 量能：盤後 API</p>
                <p>均線 / Trigger / 熔斷：V2 短線引擎</p>
                <p>主力 / 法人 / 大戶：未套截圖時為中性估算</p>
              </div>

              <button
                className="ranking-delete-button"
                onClick={() => removeStock(stock.code)}
              >
                移除此標的
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RankingBoard;