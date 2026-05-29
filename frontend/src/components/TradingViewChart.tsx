"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, ISeriesApi } from "lightweight-charts";

interface BarData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface MarkerData {
  time: string;
  position: "aboveBar" | "belowBar" | "inBar";
  color: string;
  shape: "circle" | "arrowUp" | "arrowDown" | "square";
  text: string;
}

interface TradingViewChartProps {
  data: BarData[];
  markers?: MarkerData[];
  indicators?: {
    sma?: number[];
    ema?: number[];
  };
}

export default function TradingViewChart({ data, markers = [], indicators }: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current!.clientWidth });
    };

    // Create Chart with glassmorphic parameters
    const chart: any = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#111827" }, // dark bg
        textColor: "#9CA3AF",
      },
      grid: {
        vertLines: { color: "#1F2937" },
        horzLines: { color: "#1F2937" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#10B981",
      downColor: "#EF4444",
      borderVisible: false,
      wickUpColor: "#10B981",
      wickDownColor: "#EF4444",
    });

    candlestickSeries.setData(data);

    // Apply markers (BUY/SELL entries)
    if (markers.length > 0) {
      candlestickSeries.setMarkers(markers);
    }

    // Add moving averages if supplied
    let smaLineSeries: any = null;
    if (indicators?.sma && indicators.sma.length === data.length) {
      smaLineSeries = chart.addLineSeries({
        color: "#3B82F6",
        lineWidth: 2,
        title: "SMA",
      });
      const smaData = data.map((d, index) => ({
        time: d.time,
        value: indicators.sma![index],
      })).filter(d => d.value !== undefined);
      smaLineSeries.setData(smaData);
    }

    let emaLineSeries: any = null;
    if (indicators?.ema && indicators.ema.length === data.length) {
      emaLineSeries = chart.addLineSeries({
        color: "#F59E0B",
        lineWidth: 2,
        title: "EMA",
      });
      const emaData = data.map((d, index) => ({
        time: d.time,
        value: indicators.ema![index],
      })).filter(d => d.value !== undefined);
      emaLineSeries.setData(emaData);
    }

    chart.timeScale().fitContent();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, markers, indicators]);

  return (
    <div className="w-full bg-gray-900/60 backdrop-blur-xl border border-gray-800/80 rounded-2xl p-4 shadow-2xl relative overflow-hidden">
      <div className="absolute top-4 left-4 z-10 flex gap-4 text-xs font-semibold">
        <span className="text-emerald-400">● Live Feed</span>
        <span className="text-gray-400">Symbol: SPY (Daily)</span>
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
