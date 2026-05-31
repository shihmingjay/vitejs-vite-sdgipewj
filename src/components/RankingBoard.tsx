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
  if (index === 0) return "👑 PRIME TARGET";
  if (index === 1) return "🥈 SECOND WATCH";
  if (index === 2) return "🥉 THIRD WATCH";
  return `#${index + 1} WATCHLIST`;
}

function getScoreLabel(score: number) {
  if (score >= 80) return "主攻候選";
  if (score >= 70) return "強觀察";
  if (score >= 60) return "觀察";
  return "暫不主攻";
}

function getPressureColor(value: number) {
  if (value >= 80) return "#ef4444";
  if (value >= 50) return "#f59e0b";
  return "#22c55e";
}

function getPressureLabel(value: number) {
  if (value >= 80) return "賣壓偏重";
  if (value >= 50) return "賣壓中等";
  return "賣壓健康";
}

function safeText(value: unknown, fallback = "尚無資料") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function RankingBoard({ watchList, removeStock, clearAll }: Props) {
  const topStock = watchList[0];

  return (
    <div className="stock-card wide-card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p className="eyebrow">V2 DARK RANKING</p>
          <h2>🏆 主攻排行榜</h2>
          <p className="helper-text">
            黑夜作戰看板：分數、賣壓、攻擊結構、5MA 與量能狀態集中觀察。
          </p>
        </div>

        {watchList.length > 0 && (
          <button
            onClick={clearAll}
            style={{
              background: "linear-gradient(135deg,#7c3aed,#2563eb)",
              minWidth: "120px",
            }}
          >
            清空排行榜
          </button>
        )}
      </div>

      {watchList.length === 0 && (
        <div
          style={{
            marginTop: "18px",
            padding: "28px",
            borderRadius: "24px",
            background:
              "radial-gradient(circle at 50% 15%, rgba(34,211,238,0.14), transparent 40%), rgba(2,6,23,0.72)",
            border: "1px solid rgba(34,211,238,0.22)",
            textAlign: "center",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 34px rgba(0,0,0,0.28)",
          }}
        >
          <h3 style={{ marginTop: 0 }}>目前沒有主攻標的</h3>
          <p className="helper-text">
            先輸入股票代號完成評分，再按「加入主攻排行榜」。這裡會變成你的夜間作戰清單。
          </p>
        </div>
      )}

      {topStock && (
        <div
          style={{
            marginTop: "20px",
            padding: "18px",
            borderRadius: "24px",
            background:
              "linear-gradient(135deg, rgba(2,6,23,0.96), rgba(30,41,59,0.86)), radial-gradient(circle at 80% 20%, rgba(34,211,238,0.18), transparent 34%)",
            color: "white",
            border: "1px solid rgba(250,204,21,0.38)",
            boxShadow:
              "0 18px 36px rgba(0,0,0,0.36), 0 0 28px rgba(250,204,21,0.12)",
          }}
        >
          <p style={{ margin: 0, color: "#94a3b8", fontWeight: 800 }}>
            PRIME TARGET
          </p>

          <h3 style={{ margin: "8px 0 6px", color: "#f8fafc" }}>
            👑 {topStock.name} ({topStock.code})
          </h3>

          <p style={{ margin: 0, color: "#cbd5e1" }}>
            分數 {topStock.totalScore}｜{getScoreLabel(topStock.totalScore)}｜
            {safeText(topStock.attackStatus, "攻擊結構尚無資料")}
          </p>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "18px",
          marginTop: "20px",
        }}
      >
        {watchList.map((stock, index) => {
          const pressureValue = Math.max(
            0,
            Math.min(100, stock.pressurePercent ?? stock.pressureScore ?? 0)
          );

          return (
            <div
              key={stock.code}
              style={{
                background:
                  "linear-gradient(145deg, rgba(15,23,42,0.94), rgba(2,6,23,0.86))",
                borderRadius: "24px",
                padding: "18px",
                border:
                  index === 0
                    ? "1px solid rgba(250,204,21,0.44)"
                    : "1px solid rgba(125,211,252,0.2)",
                boxShadow:
                  index === 0
                    ? "0 18px 38px rgba(0,0,0,0.36), 0 0 24px rgba(250,204,21,0.12)"
                    : "0 14px 30px rgba(0,0,0,0.3)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  right: "-60px",
                  top: "-60px",
                  width: "160px",
                  height: "160px",
                  borderRadius: "50%",
                  border: "1px solid rgba(34,211,238,0.16)",
                  boxShadow: "inset 0 0 28px rgba(34,211,238,0.08)",
                }}
              />

              <div style={{ position: "relative", zIndex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: "0 0 8px",
                        fontSize: "13px",
                        color: index === 0 ? "#fde68a" : "#67e8f9",
                        fontWeight: 900,
                        letterSpacing: "1.5px",
                      }}
                    >
                      {getRankBadge(index)}
                    </p>

                    <h3 style={{ margin: 0, color: "#f8fafc" }}>
                      {stock.name} ({stock.code})
                    </h3>

                    <p style={{ margin: "8px 0 0", color: "#94a3b8" }}>
                      收盤價：{safeText(stock.close)}
                    </p>
                  </div>

                  <div
                    style={{
                      minWidth: "82px",
                      padding: "10px 12px",
                      borderRadius: "18px",
                      background: "rgba(2,6,23,0.78)",
                      border: "1px solid rgba(148,163,184,0.18)",
                      textAlign: "center",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 20px rgba(0,0,0,0.24)",
                    }}
                  >
                    <div
                      className={getScoreClass(stock.totalScore)}
                      style={{
                        fontSize: "30px",
                        fontWeight: 950,
                        lineHeight: 1,
                      }}
                    >
                      {stock.totalScore}
                    </div>
                    <small>{getScoreLabel(stock.totalScore)}</small>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "16px",
                    padding: "12px",
                    borderRadius: "18px",
                    background: "rgba(15,23,42,0.72)",
                    border: "1px solid rgba(148,163,184,0.16)",
                  }}
                >
                  <strong style={{ color: "#e0f2fe" }}>判斷結果</strong>
                  <p style={{ margin: "8px 0 0", color: "#cbd5e1" }}>
                    {safeText(stock.result, "尚無結論")}
                  </p>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    marginTop: "12px",
                  }}
                >
                  {[
                    ["量能", safeText(stock.volumeStatus)],
                    ["5MA", safeText(stock.maSupport)],
                    ["均線結構", safeText(stock.trendStatus)],
                    ["攻擊結構", safeText(stock.attackStatus)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        padding: "12px",
                        borderRadius: "16px",
                        background: "rgba(2,6,23,0.58)",
                        border: "1px solid rgba(125,211,252,0.14)",
                      }}
                    >
                      <small style={{ color: "#67e8f9", fontWeight: 800 }}>
                        {label}
                      </small>
                      <p
                        style={{
                          margin: "6px 0 0",
                          fontWeight: 800,
                          color: "#cbd5e1",
                          fontSize: "15px",
                        }}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: "14px",
                    padding: "14px",
                    borderRadius: "18px",
                    background: "rgba(15,23,42,0.72)",
                    border: "1px solid rgba(148,163,184,0.16)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      alignItems: "center",
                    }}
                  >
                    <strong style={{ color: "#e0f2fe" }}>賣壓雷達</strong>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 900,
                        color: getPressureColor(pressureValue),
                      }}
                    >
                      {getPressureLabel(pressureValue)}
                    </span>
                  </div>

                  <p style={{ margin: "8px 0", color: "#94a3b8" }}>
                    {safeText(stock.pressureStatus)}
                  </p>

                  <div
                    style={{
                      width: "100%",
                      height: "14px",
                      background: "rgba(15,23,42,0.95)",
                      borderRadius: "999px",
                      overflow: "hidden",
                      border: "1px solid rgba(148,163,184,0.12)",
                    }}
                  >
                    <div
                      style={{
                        width: `${pressureValue}%`,
                        height: "100%",
                        background: getPressureColor(pressureValue),
                        boxShadow: `0 0 16px ${getPressureColor(
                          pressureValue
                        )}`,
                        transition: "0.3s",
                      }}
                    />
                  </div>

                  <p style={{ margin: "8px 0 0", fontWeight: 800 }}>
                    賣壓分：{safeText(stock.pressureScore, "0")}/100
                  </p>
                </div>

                <div
                  style={{
                    marginTop: "14px",
                    padding: "12px",
                    borderRadius: "18px",
                    background: "rgba(2,6,23,0.62)",
                    border: "1px dashed rgba(125,211,252,0.28)",
                  }}
                >
                  <strong style={{ color: "#e0f2fe" }}>資料來源</strong>
                  <p style={{ margin: "8px 0 0", fontSize: "14px" }}>
                    價格 / K線 / 量能：盤後 API
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "14px" }}>
                    均線 / Trigger / 熔斷：V2 短線引擎
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "14px" }}>
                    主力 / 法人 / 大戶：未套截圖時為中性估算
                  </p>
                </div>

                <button
                  onClick={() => removeStock(stock.code)}
                  style={{
                    marginTop: "14px",
                    width: "100%",
                    background: "linear-gradient(135deg,#dc2626,#f97316)",
                  }}
                >
                  刪除此股票
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RankingBoard;