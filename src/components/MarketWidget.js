import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const DEFAULT_MARKET_TABS = [
  {
    name: "Tech",
    stocks: [
      { ticker: "NASDAQ:AAPL", name: "Apple" },
      { ticker: "NASDAQ:MSFT", name: "Microsoft" },
      { ticker: "NASDAQ:GOOGL", name: "Google" }
    ]
  },
  {
    name: "Market Index",
    stocks: [
      { ticker: "FOREXCOM:SPXUSD", name: "S&P 500" },
      { ticker: "FOREXCOM:NSXUSD", name: "Nasdaq" },
      { ticker: "FOREXCOM:DJI", name: "Dow Jones" }
    ]
  }
];

export default function MarketWidget() {
  const { userPreferences } = useAuth();
  const { theme } = useTheme();
  const containerRef = useRef(null);
  const scriptRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (scriptRef.current) {
      scriptRef.current.remove();
    }

    const script = document.createElement('script');
    scriptRef.current = script;
    
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js";
    script.type = "text/javascript";
    script.async = true;

    const tabs = userPreferences.marketTabs?.map(tab => ({
      title: tab.name,
      symbols: tab.stocks.map(stock => ({
        s: stock.ticker,
        d: stock.name
      }))
    })) || DEFAULT_MARKET_TABS.map(tab => ({
      title: tab.name,
      symbols: tab.stocks.map(stock => ({
        s: stock.ticker,
        d: stock.name
      }))
    }));

    script.innerHTML = JSON.stringify({
      colorTheme: theme === 'dark' ? "dark" : "light",
      dateRange: "1D",
      showChart: true,
      locale: "en",
      width: "100%",
      height: "100%",
      largeChartUrl: "",
      isTransparent: false,
      showSymbolLogo: true,
      showFloatingTooltip: false,
      plotLineColorGrowing: "rgba(41, 98, 255, 1)",
      plotLineColorFalling: "rgba(41, 98, 255, 1)",
      gridLineColor: theme === 'dark' ? "rgba(42, 46, 57, 0)" : "rgba(240, 243, 250, 0)",
      scaleFontColor: theme === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(19, 23, 34, 1)",
      belowLineFillColorGrowing: "rgba(41, 98, 255, 0.12)",
      belowLineFillColorFalling: "rgba(41, 98, 255, 0.12)",
      belowLineFillColorGrowingBottom: "rgba(41, 98, 255, 0)",
      belowLineFillColorFallingBottom: "rgba(41, 98, 255, 0)",
      symbolActiveColor: "rgba(41, 98, 255, 0.12)",
      tabs: tabs
    });

    containerRef.current.appendChild(script);

    return () => {
      if (scriptRef.current) {
        scriptRef.current.remove();
      }
    };
  }, [userPreferences.marketTabs, theme]);

  return (
    <div className="tradingview-widget-container h-[600px] w-full rounded-lg overflow-hidden border dark:border-gray-700">
      <div ref={containerRef} className="tradingview-widget-container__widget h-full"></div>
      <div className="tradingview-widget-copyright">
        <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">
          <span className="text-blue-600 dark:text-blue-400">Track all markets on TradingView</span>
        </a>
      </div>
    </div>
  );
}