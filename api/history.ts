export default async function handler(req, res) {
    const { code } = req.query;
  
    if (!code) {
      return res.status(400).json({ error: "缺少股票代號" });
    }
  
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const date = `${yyyy}${mm}${dd}`;
  
      const url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${date}&stockNo=${code}`;
  
      const response = await fetch(url);
      const data = await response.json();
  
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: "歷史資料抓取失敗" });
    }
  }