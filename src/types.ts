export type StockApiItem = {
    Code: string;
    Name: string;
    ClosingPrice: string;
    Change: string;
    TradeVolume: string;
    OpeningPrice: string;
    HighestPrice: string;
    LowestPrice: string;
  };
  
  export type ScoreItem = {
    name: string;
    score: number;
    reason: string;
    auto: boolean;
  };
  
  export type WatchStock = {
    code: string;
    name: string;
    close: string;
    totalScore: number;
    result: string;
    items: ScoreItem[];
    ma5: number;
    maMonth: number;
    volumeStatus: string;
    maSupport: string;
    trendStatus: string;

    pressureStatus: string;
    pressureScore: number;
    pressurePercent: number;
    attackScore: number;
    attackStatus: string;
  };