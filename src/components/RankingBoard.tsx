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
  if (index === 0) return "👑 主攻一號";
  if (index === 1) return "🥈 第二觀察";
  if (index === 2) return "🥉 第三觀察";
  return `#${index + 1} 追蹤觀察`;
}

function getScoreLabel(score: number) {
  if (score >= 80) return "主攻候選";
  if (score >= 70) return "強觀察";
  if (score >= 60) return "觀察";
  return "暫不主攻";
}

function getPressureColor(value: number) {
  if (value >= 80) return "#dc2626";
  if (value >= 50) return "#f59e0b";
  return "#16a34a";
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
          <p className="eyebrow">V2 Attack Ranking</p>
          <h2>🏆 主攻排行榜</h2>
          <p className="helper-text">
            依照 V2 短線爆發評分排序，重點觀察分數、賣壓、攻擊結構、5MA 與量能狀態。
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
            padding: "24px",
            borderRadius: "20px",
            background: "linear-gradient(135deg,#f8fafc,#eef2ff)",
            border: "1px solid #cbd5e1",
            textAlign: "center",
          }}
        >
          <h3>目前沒有主攻標的</h3>
          <p className="helper-text">
            先輸入股票代號完成評分，再按「加入主攻排行榜」。排行榜會變成你的短線作戰看板。
          </p>
        </div>
      )}

      {topStock && (
        <div
          style={{
            marginTop: "20px",
            padding: "18px",
            borderRadius: "22px",
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,64,175,0.9))",
            color: "white",
            boxShadow: "0 14px 32px rgba(15,23,42,0.25)",
          }}
        >
          <p style={{ margin: 0, opacity: 0.8 }}>目前排行榜龍頭</p>
          <h3 style={{ margin: "8px 0 6px" }}>
            👑 {topStock.name} ({topStock.code})
          </h3>
          <p style={{ margin: 0 }}>
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
                background: "#f8fafc",
                borderRadius: "22px",
                padding: "18px",
                border:
                  index === 0
                    ? "2px solid #facc15"
                    : "1px solid #cbd5e1",
                boxShadow:
                  index === 0
                    ? "0 14px 30px rgba(250,204,21,0.22)"
                    : "0 8px 20px rgba(0,0,0,0.08)",
              }}
            >
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
                      color: "#475569",
                      fontWeight: 700,
                    }}
                  >
                    {getRankBadge(index)}
                  </p>

                  <h3 style={{ margin: 0 }}>
                    {stock.name} ({stock.code})
                  </h3>

                  <p style={{ margin: "8px 0 0", color: "#475569" }}>
                    收盤價：{safeText(stock.close)}
                  </p>
                </div>

                <div
                  style={{
                    minWidth: "78px",
                    padding: "10px 12px",
                    borderRadius: "18px",
                    background: "white",
                    textAlign: "center",
                    boxShadow: "0 6px 16px rgba(15,23,42,0.08)",
                  }}
                >
                  <div
                    className={getScoreClass(stock.totalScore)}
                    style={{
                      fontSize: "28px",
                      fontWeight: 900,
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
                  background: "white",
                  border: "1px solid #e2e8f0",
                }}
              >
                <strong>判斷結果</strong>
                <p style={{ margin: "8px 0 0" }}>
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
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "16px",
                    background: "#eef2ff",
                  }}
                >
                  <small>量能</small>
                  <p style={{ margin: "6px 0 0", fontWeight: 700 }}>
                    {safeText(stock.volumeStatus)}
                  </p>
                </div>

                <div
                  style={{
                    padding: "12px",
                    borderRadius: "16px",
                    background: "#ecfeff",
                  }}
                >
                  <small>5MA</small>
                  <p style={{ margin: "6px 0 0", fontWeight: 700 }}>
                    {safeText(stock.maSupport)}
                  </p>
                </div>

                <div
                  style={{
                    padding: "12px",
                    borderRadius: "16px",
                    background: "#f0fdf4",
                  }}
                >
                  <small>均線結構</small>
                  <p style={{ margin: "6px 0 0", fontWeight: 700 }}>
                    {safeText(stock.trendStatus)}
                  </p>
                </div>

                <div
                  style={{
                    padding: "12px",
                    borderRadius: "16px",
                    background: "#fff7ed",
                  }}
                >
                  <small>攻擊結構</small>
                  <p style={{ margin: "6px 0 0", fontWeight: 700 }}>
                    {safeText(stock.attackStatus)}
                  </p>
                </div>
              </div>

              <div
                style={{
                  marginTop: "14px",
                  padding: "14px",
                  borderRadius: "18px",
                  background: "white",
                  border: "1px solid #e2e8f0",
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
                  <strong>賣壓雷達</strong>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 800,
                      color: getPressureColor(pressureValue),
                    }}
                  >
                    {getPressureLabel(pressureValue)}
                  </span>
                </div>

                <p style={{ margin: "8px 0", color: "#475569" }}>
                  {safeText(stock.pressureStatus)}
                </p>

                <div
                  style={{
                    width: "100%",
                    height: "14px",
                    background: "#e2e8f0",
                    borderRadius: "999px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pressureValue}%`,
                      height: "100%",
                      background: getPressureColor(pressureValue),
                      transition: "0.3s",
                    }}
                  />
                </div>

                <p style={{ margin: "8px 0 0", fontWeight: 700 }}>
                  賣壓分：{safeText(stock.pressureScore, "0")}/100
                </p>
              </div>

              <div
                style={{
                  marginTop: "14px",
                  padding: "12px",
                  borderRadius: "18px",
                  background: "#f1f5f9",
                  border: "1px dashed #94a3b8",
                }}
              >
                <strong>資料來源</strong>
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
                  background: "linear-gradient(135deg,#ef4444,#f97316)",
                }}
              >
                刪除此股票
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RankingBoard;