import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  RefreshCw,
  AlertCircle,
  Target,
  Clock,
  Percent,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { Line, Column, Pie, DualAxes, Gauge, Heatmap } from '@ant-design/plots';
import { Button } from '../ui/Button';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { formatCurrency, formatPercent, formatDate } from '../../utils/formatters';

const PERIOD_OPTIONS = [
  { value: 'day', label: '1D' },
  { value: 'week', label: '1W' },
  { value: 'month', label: '1M' },
  { value: 'year', label: '1Y' },
  { value: 'all', label: 'All' }
];

const METRIC_CARDS = [
  { key: 'totalValue', label: 'Total Value', icon: DollarSign, format: 'currency' },
  { key: 'totalPnLPercent', label: 'Total Return', icon: Percent, format: 'percent', showPnL: true },
  { key: 'winRate', label: 'Win Rate', icon: Target, format: 'percent' },
  { key: 'sharpeRatio', label: 'Sharpe Ratio', icon: Activity, format: 'number' }
];

export const PortfolioAnalytics: React.FC = () => {
  const {
    selectedAccount,
    metrics,
    performanceData,
    tradeAnalytics,
    riskMetrics,
    benchmarkComparisons,
    isLoading,
    fetchMetrics,
    fetchPerformanceData,
    fetchTradeAnalytics,
    fetchRiskMetrics,
    compareBenchmarks,
    generateReport
  } = usePortfolioStore();

  const [selectedPeriod, setSelectedPeriod] = useState<string>('month');
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'risk' | 'analytics'>('overview');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  useEffect(() => {
    if (selectedAccount) {
      fetchMetrics(selectedAccount.id);
      fetchPerformanceData(selectedAccount.id, selectedPeriod as any);
      fetchTradeAnalytics(selectedAccount.id);
      fetchRiskMetrics(selectedAccount.id);
      compareBenchmarks(selectedAccount.id);
    }
  }, [selectedAccount, selectedPeriod]);

  const handleRefresh = () => {
    if (selectedAccount) {
      fetchMetrics(selectedAccount.id);
      fetchPerformanceData(selectedAccount.id, selectedPeriod as any);
    }
  };

  const handleGenerateReport = async (format: 'pdf' | 'excel') => {
    if (!selectedAccount) return;
    
    setIsGeneratingReport(true);
    try {
      await generateReport(selectedAccount.id, format);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const renderMetricCard = (metric: typeof METRIC_CARDS[0]) => {
    const value = metrics?.[metric.key as keyof typeof metrics];
    if (value === undefined) return null;

    const isPositive = metric.showPnL ? (value as number) >= 0 : true;
    const Icon = metric.icon;

    return (
      <motion.div
        key={metric.key}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 p-6 rounded-lg"
      >
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-lg ${isPositive ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
            <Icon className={`w-5 h-5 ${isPositive ? 'text-green-400' : 'text-red-400'}`} />
          </div>
          {metric.showPnL && (
            <div className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          )}
        </div>
        <p className="text-gray-400 text-sm mb-1">{metric.label}</p>
        <p className={`text-2xl font-bold ${metric.showPnL ? (isPositive ? 'text-green-400' : 'text-red-400') : 'text-gray-100'}`}>
          {metric.format === 'currency' 
            ? formatCurrency(value as number)
            : metric.format === 'percent'
            ? formatPercent(value as number)
            : (value as number).toFixed(2)
          }
        </p>
        {metric.key === 'totalPnLPercent' && metrics?.totalPnL !== undefined && (
          <p className="text-sm text-gray-400 mt-1">
            {formatCurrency(metrics.totalPnL)}
          </p>
        )}
      </motion.div>
    );
  };

  const renderPerformanceChart = () => {
    if (!performanceData || performanceData.length === 0) {
      return (
        <div className="h-96 flex items-center justify-center text-gray-400">
          <p>No performance data available</p>
        </div>
      );
    }

    const config = {
      data: performanceData.map(d => ({
        date: formatDate(d.date),
        value: d.value,
        pnl: d.pnl
      })),
      xField: 'date',
      yField: ['value', 'pnl'],
      geometryOptions: [
        {
          geometry: 'line',
          color: '#5B8FF9',
          lineStyle: {
            lineWidth: 2
          }
        },
        {
          geometry: 'column',
          color: (datum: any) => datum.pnl >= 0 ? '#10B981' : '#EF4444'
        }
      ],
      yAxis: {
        value: {
          title: {
            text: 'Portfolio Value ($)',
            style: {
              fill: '#9CA3AF'
            }
          },
          label: {
            formatter: (v: string) => formatCurrency(parseFloat(v))
          }
        },
        pnl: {
          title: {
            text: 'Daily P&L ($)',
            style: {
              fill: '#9CA3AF'
            }
          },
          label: {
            formatter: (v: string) => formatCurrency(parseFloat(v))
          }
        }
      },
      theme: 'dark',
      smooth: true,
      animation: {
        appear: {
          animation: 'path-in',
          duration: 1000
        }
      }
    };

    return <DualAxes {...config} />;
  };

  const renderDrawdownChart = () => {
    if (!performanceData || performanceData.length === 0) return null;

    const config = {
      data: performanceData.map(d => ({
        date: formatDate(d.date),
        drawdown: -d.drawdownPercent
      })),
      xField: 'date',
      yField: 'drawdown',
      seriesField: 'type',
      color: '#EF4444',
      areaStyle: {
        fillOpacity: 0.3
      },
      yAxis: {
        label: {
          formatter: (v: string) => `${v}%`
        }
      },
      theme: 'dark',
      smooth: true
    };

    return <Line {...config} />;
  };

  const renderTradeAnalytics = () => {
    if (!tradeAnalytics) return null;

    // Instrument Performance Pie Chart
    const instrumentData = Object.entries(tradeAnalytics.byInstrument).map(([symbol, stats]) => ({
      type: symbol,
      value: stats.totalPnL
    }));

    const pieConfig = {
      appendPadding: 10,
      data: instrumentData,
      angleField: 'value',
      colorField: 'type',
      radius: 0.8,
      label: {
        type: 'outer',
        formatter: (datum: any) => `${datum.type}: ${formatCurrency(datum.value)}`
      },
      theme: 'dark',
      interactions: [
        {
          type: 'element-active'
        }
      ]
    };

    // Time of Day Heatmap
    const timeData = [];
    for (let hour = 0; hour < 24; hour++) {
      const stats = tradeAnalytics.byTimeOfDay[hour];
      if (stats) {
        timeData.push({
          hour: `${hour}:00`,
          day: 'Trades',
          value: stats.trades,
          winRate: stats.winRate
        });
      }
    }

    const heatmapConfig = {
      data: timeData,
      xField: 'hour',
      yField: 'day',
      colorField: 'winRate',
      color: ['#3b82f6', '#10b981'],
      shape: 'square',
      label: {
        formatter: (datum: any) => `${datum.value}`
      },
      theme: 'dark'
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* P&L by Instrument */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">P&L by Instrument</h3>
            <div className="h-64">
              <Pie {...pieConfig} />
            </div>
          </div>

          {/* Performance by Time */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Performance by Hour</h3>
            <div className="h-64">
              <Heatmap {...heatmapConfig} />
            </div>
          </div>
        </div>

        {/* Trade Size Analysis */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Performance by Trade Size</h3>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(tradeAnalytics.bySize).map(([size, stats]) => (
              <div key={size} className="text-center">
                <p className="text-gray-400 text-sm mb-2">{size.charAt(0).toUpperCase() + size.slice(1)}</p>
                <p className="text-2xl font-bold text-gray-100">{stats.trades}</p>
                <p className="text-sm text-gray-400">trades</p>
                <p className={`text-lg font-semibold mt-2 ${stats.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercent(stats.winRate)}
                </p>
                <p className="text-xs text-gray-400">win rate</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderRiskMetrics = () => {
    if (!riskMetrics) return null;

    const riskGauge = {
      percent: Math.min(riskMetrics.omega / 3, 1), // Normalize omega ratio
      range: {
        ticks: [0, 1],
        color: ['#EF4444', '#F59E0B', '#10B981']
      },
      indicator: {
        pointer: {
          style: {
            stroke: '#9CA3AF'
          }
        },
        pin: {
          style: {
            stroke: '#9CA3AF'
          }
        }
      },
      theme: 'dark',
      statistic: {
        title: {
          formatter: () => 'Risk Score',
          style: {
            color: '#9CA3AF'
          }
        },
        content: {
          formatter: () => riskMetrics.omega.toFixed(2),
          style: {
            color: '#fff',
            fontSize: '24px'
          }
        }
      }
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Gauge */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Overall Risk Assessment</h3>
          <div className="h-64">
            <Gauge {...riskGauge} />
          </div>
        </div>

        {/* Risk Metrics Table */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Risk Metrics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Value at Risk (95%)</span>
              <span className="text-gray-100 font-medium">{formatCurrency(riskMetrics.valueAtRisk95)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Expected Shortfall</span>
              <span className="text-gray-100 font-medium">{formatCurrency(riskMetrics.expectedShortfall)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Downside Deviation</span>
              <span className="text-gray-100 font-medium">{formatPercent(riskMetrics.downsideDeviation)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Ulcer Index</span>
              <span className="text-gray-100 font-medium">{riskMetrics.ulcerIndex.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Recovery Time (days)</span>
              <span className="text-gray-100 font-medium">{riskMetrics.recoveryTime.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Concentration Risk */}
        {Object.keys(riskMetrics.concentrationRisk).length > 0 && (
          <div className="bg-gray-800 p-6 rounded-lg lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Portfolio Concentration</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(riskMetrics.concentrationRisk).map(([symbol, percentage]) => (
                <div key={symbol} className="text-center">
                  <p className="text-gray-400 text-sm">{symbol}</p>
                  <p className="text-xl font-bold text-gray-100">{formatPercent(percentage)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBenchmarkComparison = () => {
    if (!benchmarkComparisons || benchmarkComparisons.length === 0) return null;

    const comparisonData = benchmarkComparisons.map(comp => ({
      benchmark: comp.benchmark,
      portfolio: comp.portfolioReturn,
      benchmark_return: comp.benchmarkReturn,
      alpha: comp.alpha,
      beta: comp.beta
    }));

    const config = {
      data: comparisonData,
      xField: 'benchmark',
      yField: ['portfolio', 'benchmark_return'],
      geometryOptions: [
        {
          geometry: 'column',
          color: '#5B8FF9'
        },
        {
          geometry: 'column',
          color: '#5AD8A6'
        }
      ],
      legend: {
        custom: true,
        items: [
          { name: 'Portfolio', value: 'portfolio', marker: { symbol: 'square', style: { fill: '#5B8FF9' } } },
          { name: 'Benchmark', value: 'benchmark_return', marker: { symbol: 'square', style: { fill: '#5AD8A6' } } }
        ]
      },
      theme: 'dark'
    };

    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Benchmark Comparison</h3>
        <div className="h-64 mb-4">
          <Column {...config} />
        </div>
        <div className="space-y-2">
          {benchmarkComparisons.map(comp => (
            <div key={comp.benchmark} className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400">vs {comp.benchmark}</p>
              </div>
              <div>
                <p className="text-gray-400">Alpha</p>
                <p className={`font-medium ${comp.alpha >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercent(comp.alpha)}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Beta</p>
                <p className="font-medium text-gray-100">{comp.beta.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400">Info Ratio</p>
                <p className="font-medium text-gray-100">{comp.informationRatio.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!selectedAccount) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>Please select a trading account to view analytics</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{selectedAccount.accountName} Analytics</h2>
          <p className="text-gray-400 mt-1">
            {selectedAccount.accountType.toUpperCase()} • {selectedAccount.currency}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerateReport('pdf')}
              disabled={isGeneratingReport}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerateReport('excel')}
              disabled={isGeneratingReport}
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-2 bg-gray-800 p-1 rounded-lg w-fit">
        {PERIOD_OPTIONS.map(option => (
          <button
            key={option.value}
            onClick={() => setSelectedPeriod(option.value)}
            className={`px-4 py-2 rounded-md transition-colors ${
              selectedPeriod === option.value
                ? 'bg-blue-600 text-gray-100'
                : 'text-gray-400 hover:text-gray-100'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRIC_CARDS.map(metric => renderMetricCard(metric))}
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 rounded-lg">
        <div className="flex items-center border-b border-gray-700">
          {(['overview', 'performance', 'risk', 'analytics'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 transition-colors relative ${
                activeTab === tab
                  ? 'text-gray-100'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                />
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="h-96">
                  <h3 className="text-lg font-semibold mb-4">Portfolio Performance</h3>
                  {renderPerformanceChart()}
                </div>
                {renderBenchmarkComparison()}
              </motion.div>
            )}

            {activeTab === 'performance' && (
              <motion.div
                key="performance"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-4">Equity Curve</h3>
                  <div className="h-96">
                    {renderPerformanceChart()}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Drawdown Analysis</h3>
                  <div className="h-64">
                    {renderDrawdownChart()}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'risk' && (
              <motion.div
                key="risk"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {renderRiskMetrics()}
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {renderTradeAnalytics()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};