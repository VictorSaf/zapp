export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';

export interface MarketQuote {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: Date;
}

export interface Candle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicator {
  name: string;
  values: { timestamp: Date; value: number | number[] }[];
}

export interface MarketSignal {
  type: 'buy' | 'sell' | 'neutral';
  strength: number;
  indicators: string[];
  timestamp: Date;
}