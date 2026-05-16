export default async function handler(req, res) {
    try {
      const response = await fetch(
        "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL"
      );
  
      const data = await response.json();
  
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({
        error: "抓取失敗",
      });
    }
  }