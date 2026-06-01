export default async function handler(req: any, res: any) {
    const code = String(req.query.code || "").trim();
  
    if (!code) {
      return res.status(400).json({
        error: "MISSING_CODE",
        message: "缺少股票代號",
        count: 0,
        data: [],
      });
    }
  
    try {
      const rows: any[] = [];
  
      const today = new Date();
  
      for (let i = 0; i < 10; i++) {
        const targetDate = new Date(
          today.getFullYear(),
          today.getMonth() - i,
          1
        );
  
        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, "0");
        const date = `${year}${month}01`;
  
        const url =
          "https://www.twse.com.tw/exchangeReport/STOCK_DAY" +
          `?response=json&date=${date}&stockNo=${code}`;
  
        try {
          const response = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0",
              Accept: "application/json",
            },
          });
  
          if (!response.ok) {
            continue;
          }
  
          const json = await response.json();
  
          if (!json || !Array.isArray(json.data)) {
            continue;
          }
  
          rows.push(...json.data);
        } catch {
          continue;
        }
      }
  
      const cleanRows = rows
        .filter((row) => Array.isArray(row))
        .filter((row) => row.length >= 7)
        .filter((row) => {
          const volume = toNumber(row[1]);
          const open = toNumber(row[3]);
          const high = toNumber(row[4]);
          const low = toNumber(row[5]);
          const close = toNumber(row[6]);
  
          return (
            volume > 0 &&
            open > 0 &&
            high > 0 &&
            low > 0 &&
            close > 0
          );
        });
  
      const uniqueMap = new Map<string, any[]>();
  
      cleanRows.forEach((row) => {
        const dateKey = normalizeDate(row[0]);
  
        if (dateKey) {
          uniqueMap.set(dateKey, row);
        }
      });
  
      const sortedRows = Array.from(uniqueMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map((entry) => entry[1]);
  
      return res.status(200).json({
        code,
        source: "TWSE_STOCK_DAY_MULTI_MONTH",
        count: sortedRows.length,
        data: sortedRows,
      });
    } catch (error: any) {
      return res.status(500).json({
        error: "HISTORY_API_ERROR",
        message: error?.message || "歷史資料讀取失敗",
        count: 0,
        data: [],
      });
    }
  }
  
  function toNumber(value: any) {
    return Number(
      String(value || "0")
        .replace(/,/g, "")
        .replace("+", "")
        .trim()
    );
  }
  
  function normalizeDate(value: any) {
    const text = String(value || "").trim();
  
    const parts = text.split("/");
  
    if (parts.length !== 3) {
      return text;
    }
  
    const rocYear = Number(parts[0]);
    const month = String(parts[1]).padStart(2, "0");
    const day = String(parts[2]).padStart(2, "0");
  
    if (!rocYear) {
      return text;
    }
  
    const westernYear = rocYear + 1911;
  
    return `${westernYear}-${month}-${day}`;
  }