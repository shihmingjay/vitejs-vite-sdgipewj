export async function getChipData(
    stockCode: string
  ) {
    try {
      // 🚧 V3 預留 API 架構
  
      return {
        foreignBuy: 0,
        investmentBuy: 0,
        dealerBuy: 0,
  
        marginIncrease: 0,
        marginRatio: 0,
  
        bigHolderIncrease: 0,
        smallHolderDecrease: 0,
  
        chipCleanScore: 0,
      };
    } catch (error) {
      console.error(
        "Chip API Error:",
        error
      );
  
      return null;
    }
  }