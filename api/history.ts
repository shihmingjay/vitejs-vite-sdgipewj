export default async function handler(req, res) {
    const { code } = req.query;
  
    if (!code) {
      return res.status(400).json({ error: "缺少股票代號" });
    }
  
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const date = `${yyyy}${mm}${dd}`;
  
    try {
      const response = await fetch(
        `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${date}&stockNo=${code}`
      );
  
      const data = await response.json();
  
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ error: "歷史資料抓取失敗" });
    }
  }