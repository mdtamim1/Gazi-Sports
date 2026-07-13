import { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp, ArrowUpRight, ArrowDownRight, Target, DollarSign,
  Calculator, HelpCircle, Zap, ChevronRight, Activity, Percent
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Legend
} from 'recharts';
import { revenueData, formatCurrency } from '../../mock/data';

interface BaselineOption {
  value: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'ytd';
  label: string;
  defaultDuration: number;
  defaultRevenue: number;
}

const BASELINE_OPTIONS: BaselineOption[] = [
  { value: 'daily', label: 'Daily', defaultDuration: 7, defaultRevenue: 160300 }, // 22,900 * 7
  { value: 'weekly', label: 'Weekly', defaultDuration: 4, defaultRevenue: 495000 },
  { value: 'monthly', label: 'Monthly', defaultDuration: 1, defaultRevenue: 495000 },
  { value: 'quarterly', label: 'Quarterly', defaultDuration: 1, defaultRevenue: 1485000 },
  { value: 'ytd', label: 'Year-To-Date (YTD)', defaultDuration: 6, defaultRevenue: 543000 }, // June is month 6
];

export default function RunRateCalculator() {
  const [baselinePeriod, setBaselinePeriod] = useState<BaselineOption['value']>('monthly');
  const [revenueInput, setRevenueInput] = useState<number>(495000);
  const [durationInput, setDurationInput] = useState<number>(1);
  const [annualGrowthRate, setAnnualGrowthRate] = useState<number>(15); // in %
  const [annualTarget, setAnnualTarget] = useState<number>(6500000); // 6.5M BDT
  const [showTooltipInfo, setShowTooltipInfo] = useState<string | null>(null);

  // Sync default values when changing period
  const handlePeriodChange = (period: BaselineOption['value']) => {
    setBaselinePeriod(period);
    const option = BASELINE_OPTIONS.find(o => o.value === period);
    if (option) {
      // Auto-populate based on system data
      let rev = option.defaultRevenue;
      if (period === 'daily' && revenueData.today) {
        rev = revenueData.today * option.defaultDuration;
      } else if (period === 'monthly' && revenueData.monthly) {
        rev = revenueData.monthly;
      } else if (period === 'ytd' && revenueData.total) {
        rev = revenueData.total;
      } else if (period === 'quarterly' && revenueData.monthly) {
        rev = revenueData.monthly * 3;
      } else if (period === 'weekly' && revenueData.today) {
        rev = revenueData.today * 7 * option.defaultDuration;
      }

      setRevenueInput(rev);
      setDurationInput(option.defaultDuration);
    }
  };

  // Quick auto-populate buttons
  const loadSystemValue = () => {
    if (baselinePeriod === 'daily') {
      setRevenueInput(revenueData.today || 22900);
      setDurationInput(1);
    } else if (baselinePeriod === 'monthly') {
      setRevenueInput(revenueData.monthly || 495000);
      setDurationInput(1);
    } else if (baselinePeriod === 'ytd') {
      setRevenueInput(revenueData.total || 543000);
      setDurationInput(6); // Jan - Jun
    } else if (baselinePeriod === 'quarterly') {
      setRevenueInput((revenueData.monthly || 495000) * 3);
      setDurationInput(1);
    } else if (baselinePeriod === 'weekly') {
      setRevenueInput((revenueData.today || 22900) * 7);
      setDurationInput(1);
    }
  };

  // Perform computations using useMemo
  const calculations = useMemo(() => {
    const revenue = Math.max(0, revenueInput);
    const duration = Math.max(0.1, durationInput);
    const growth = Math.max(0, annualGrowthRate);

    // Calculate flat MRR & ARR
    let flatMRR = 0;
    let flatARR = 0;

    switch (baselinePeriod) {
      case 'daily':
        flatMRR = (revenue / duration) * 30.4167;
        flatARR = (revenue / duration) * 365;
        break;
      case 'weekly':
        flatMRR = (revenue / duration) * 4.3452;
        flatARR = (revenue / duration) * 52.1786;
        break;
      case 'monthly':
        flatMRR = revenue / duration;
        flatARR = (revenue / duration) * 12;
        break;
      case 'quarterly':
        flatMRR = (revenue / duration) / 3;
        flatARR = (revenue / duration) * 4;
        break;
      case 'ytd':
        flatMRR = revenue / duration;
        flatARR = (revenue / duration) * 12;
        break;
    }

    // Monthly compounding growth rate g
    // (1 + G/100) = (1 + g)^12  =>  g = (1 + G/100)^(1/12) - 1
    const g = (1 + growth / 100) ** (1 / 12) - 1;

    // Calculate Year 1, 2, 3, 4, 5 Compounded Projections
    // Year n spans month (12n-11) to 12n
    // Let's compute monthly revenue arrays first
    const projectedMonths: number[] = [];
    let currentMRR = flatMRR;
    for (let i = 1; i <= 60; i++) {
      currentMRR = currentMRR * (1 + g);
      projectedMonths.push(currentMRR);
    }

    const year1Compounded = projectedMonths.slice(0, 12).reduce((sum, val) => sum + val, 0);
    const year2Compounded = projectedMonths.slice(12, 24).reduce((sum, val) => sum + val, 0);
    const year3Compounded = projectedMonths.slice(24, 36).reduce((sum, val) => sum + val, 0);
    const year5Compounded = projectedMonths.slice(48, 60).reduce((sum, val) => sum + val, 0);

    // Target Deficits
    const flatTargetDiff = flatARR - annualTarget;
    const growthTargetDiff = year1Compounded - annualTarget;
    const pctTargetFlat = Math.min(100, Math.round((flatARR / annualTarget) * 100));
    const pctTargetGrowth = Math.min(100, Math.round((year1Compounded / annualTarget) * 100));

    // Simple annual growth rate needed to reach target
    const requiredGrowthRateSimple = flatARR > 0 ? ((annualTarget / flatARR) - 1) * 100 : 0;

    // Compounded monthly growth rate needed to reach target
    // ARR_compounded = MRR_0 * (1+g) * [(1+g)^12 - 1] / g = Target
    // Approximation: (Target / flatARR) => convert simple annual growth into compounded
    let requiredGrowthCompounded = 0;
    if (flatARR > 0 && annualTarget > 0) {
      requiredGrowthCompounded = ((annualTarget / flatARR) - 1) * 100;
    }

    return {
      flatMRR,
      flatARR,
      year1Compounded,
      year2Compounded,
      year3Compounded,
      year5Compounded,
      flatTargetDiff,
      growthTargetDiff,
      pctTargetFlat,
      pctTargetGrowth,
      requiredGrowthRateSimple,
      requiredGrowthCompounded,
      projectedMonths,
      monthlyCompoundingRate: g * 100
    };
  }, [baselinePeriod, revenueInput, durationInput, annualGrowthRate, annualTarget]);

  // Chart data for 12 months projection
  const chartData = useMemo(() => {
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, index) => {
      const compoundingRate = (1 + calculations.monthlyCompoundingRate / 100) ** (index + 1);
      const flatProjected = calculations.flatMRR;
      const growthProjected = calculations.flatMRR * compoundingRate;

      return {
        name: month,
        'Flat Projection': Math.round(flatProjected),
        'Growth Adjusted': Math.round(growthProjected),
        'Target Path': Math.round(annualTarget / 12),
      };
    });
  }, [calculations, annualTarget]);

  return (
    <div className="run-rate-calculator" style={{ animation: 'fadeIn 0.4s ease' }}>
      <style>{`
        .calculator-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-6);
        }
        @media(min-width: 1024px) {
          .calculator-grid {
            grid-template-columns: 380px 1fr;
          }
        }
        .control-panel-card {
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-xl);
          backdrop-filter: blur(16px);
          padding: var(--space-5);
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
          box-shadow: var(--shadow-card);
          height: fit-content;
        }
        .results-panel {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }
        .calculator-stat-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-4);
        }
        @media(min-width: 640px) {
          .calculator-stat-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .calc-stat-card {
          background: rgba(15, 23, 50, 0.4);
          border: 1px solid var(--border-secondary);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          position: relative;
          transition: all var(--transition-base);
        }
        .calc-stat-card:hover {
          border-color: var(--border-hover);
          transform: translateY(-2px);
          background: rgba(20, 30, 65, 0.55);
        }
        .calc-stat-card.highlight {
          border-color: var(--accent-primary);
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08));
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.1);
        }
        .calc-label {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          margin-bottom: var(--space-1);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .calc-value {
          font-size: var(--text-xl);
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }
        .calc-subtext {
          font-size: 11px;
          margin-top: 4px;
        }
        .calc-subtext.positive { color: var(--color-success); }
        .calc-subtext.negative { color: var(--color-danger); }
        .calc-subtext.neutral { color: var(--text-tertiary); }

        .form-group-custom {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-label-custom {
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--text-secondary);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .info-button {
          color: var(--text-tertiary);
          cursor: pointer;
          transition: color var(--transition-fast);
        }
        .info-button:hover {
          color: var(--text-primary);
        }
        .input-with-action {
          display: flex;
          gap: 8px;
        }
        .input-styled {
          background: var(--bg-input);
          border: 1px solid var(--border-secondary);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          color: var(--text-primary);
          font-size: var(--text-sm);
          font-weight: 500;
          width: 100%;
          transition: all var(--transition-fast);
        }
        .input-styled:focus {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px var(--accent-primary-glow);
        }
        .btn-inline {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-secondary);
          color: var(--text-secondary);
          padding: 0 12px;
          border-radius: var(--radius-md);
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          transition: all var(--transition-fast);
        }
        .btn-inline:hover {
          background: var(--accent-primary-glow);
          border-color: var(--accent-primary);
          color: var(--text-primary);
        }
        .slider-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .slider-styled {
          flex: 1;
          height: 6px;
          border-radius: var(--radius-full);
          outline: none;
          background: var(--border-secondary);
          cursor: pointer;
          accent-color: var(--accent-primary);
        }
        .slider-val {
          font-family: var(--font-mono);
          font-weight: 700;
          color: var(--accent-primary-hover);
          font-size: var(--text-sm);
          min-width: 36px;
          text-align: right;
        }
        .period-selector {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-1);
          background: rgba(10, 14, 26, 0.4);
          padding: 4px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-secondary);
        }
        .period-selector button {
          padding: 8px var(--space-1);
          font-size: 11px;
          font-weight: 600;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }
        .period-selector button.active {
          background: var(--accent-primary);
          color: white;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        }

        .target-bar-container {
          background: var(--bg-input);
          border-radius: var(--radius-full);
          height: 10px;
          width: 100%;
          overflow: hidden;
          margin: 8px 0;
          border: 1px solid var(--border-secondary);
        }
        .target-bar-fill {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width var(--transition-slow) ease;
        }
        .target-bar-fill.on-track {
          background: var(--gradient-success);
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
        }
        .target-bar-fill.off-track {
          background: var(--gradient-warning);
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
        }

        .compounding-matrix {
          background: rgba(15, 20, 45, 0.35);
          border: 1px solid var(--border-secondary);
          border-radius: var(--radius-xl);
          padding: var(--space-5);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .matrix-title {
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: var(--space-1);
        }
        .matrix-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px dashed var(--border-secondary);
          font-size: var(--text-sm);
        }
        .matrix-row:last-child {
          border-bottom: none;
        }
        .matrix-label {
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .matrix-val {
          font-weight: 700;
          color: var(--text-primary);
        }
        .matrix-badge {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }
        .matrix-badge.success {
          background: var(--color-success-bg);
          color: var(--color-success);
        }
        .matrix-badge.warning {
          background: var(--color-warning-bg);
          color: var(--color-warning);
        }

        .help-popover {
          background: #0f1329;
          border: 1px solid var(--border-active);
          border-radius: var(--radius-md);
          padding: 12px;
          box-shadow: var(--shadow-xl);
          position: absolute;
          z-index: 50;
          max-width: 250px;
          font-size: 11px;
          color: var(--text-secondary);
          line-height: 1.4;
          top: 30px;
          left: 0;
        }
        
        .chart-visual-card {
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-xl);
          padding: var(--space-5);
          box-shadow: var(--shadow-card);
          backdrop-filter: blur(16px);
        }
        .chart-header-custom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-5);
        }
        .badge-live-pulse {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(99, 102, 241, 0.1);
          color: var(--accent-primary-hover);
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 600;
        }
        .live-pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent-primary-hover);
          position: relative;
        }
        .live-pulse-dot::after {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: var(--accent-primary-hover);
          animation: livePulse 1.5s infinite ease-in-out;
          top: 0;
          left: 0;
        }
      `}</style>

      <div className="calculator-grid">
        {/* INPUTS / CONTROLS PANEL */}
        <div className="control-panel-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px' }}>
            <Calculator color="var(--accent-primary)" size={22} />
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Run Rate Settings</h3>
          </div>

          {/* Baseline Type Selection */}
          <div className="form-group-custom">
            <label className="form-label-custom">
              Baseline Period
              <HelpCircle size={14} className="info-button" onClick={() => setShowTooltipInfo(showTooltipInfo === 'period' ? null : 'period')} />
            </label>
            {showTooltipInfo === 'period' && (
              <div className="help-popover" style={{ position: 'relative', top: '0', marginBottom: '8px' }}>
                Select the historical frequency to base your projections on. Daily and weekly scale up based on daily averages, whereas monthly / quarterly extrapolate standard intervals.
              </div>
            )}
            <div className="period-selector">
              {(['daily', 'weekly', 'monthly', 'quarterly', 'ytd'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={baselinePeriod === p ? 'active' : ''}
                  onClick={() => handlePeriodChange(p)}
                  style={{ gridColumn: p === 'ytd' ? 'span 2' : 'span 1' }}
                >
                  {p === 'ytd' ? 'Year-To-Date' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Baseline Revenue Input */}
          <div className="form-group-custom">
            <label className="form-label-custom">
              Baseline Revenue (৳)
              <button className="btn-inline" onClick={loadSystemValue} type="button">
                <Zap size={11} style={{ marginRight: '2px', display: 'inline' }} /> Pull System Data
              </button>
            </label>
            <div className="input-with-action">
              <input
                type="number"
                className="input-styled"
                value={revenueInput || ''}
                onChange={(e) => setRevenueInput(Number(e.target.value))}
                placeholder="e.g. 500000"
              />
            </div>
          </div>

          {/* Baseline Duration Input */}
          <div className="form-group-custom">
            <label className="form-label-custom">
              {baselinePeriod === 'daily' && 'Days Elapsed'}
              {baselinePeriod === 'weekly' && 'Weeks Elapsed'}
              {baselinePeriod === 'monthly' && 'Months Elapsed'}
              {baselinePeriod === 'quarterly' && 'Quarters Elapsed'}
              {baselinePeriod === 'ytd' && 'Months Elapsed in Year'}
            </label>
            <input
              type="number"
              className="input-styled"
              step={baselinePeriod === 'ytd' ? 1 : 0.5}
              min={0.1}
              value={durationInput || ''}
              onChange={(e) => setDurationInput(Number(e.target.value))}
            />
          </div>

          {/* Growth Projection slider */}
          <div className="form-group-custom">
            <label className="form-label-custom">
              Est. Annual Growth Rate (%)
              <span className="slider-val">{annualGrowthRate}%</span>
            </label>
            <div className="slider-wrapper">
              <Percent size={14} color="var(--text-tertiary)" />
              <input
                type="range"
                className="slider-styled"
                min="0"
                max="100"
                value={annualGrowthRate}
                onChange={(e) => setAnnualGrowthRate(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Target Goal Input */}
          <div className="form-group-custom">
            <label className="form-label-custom">Annual Revenue Target (৳)</label>
            <input
              type="number"
              className="input-styled"
              value={annualTarget || ''}
              onChange={(e) => setAnnualTarget(Number(e.target.value))}
              placeholder="e.g. 2000000"
            />
          </div>
        </div>

        {/* RESULTS / VISUALIZATIONS */}
        <div className="results-panel">
          {/* STATS ROW */}
          <div className="calculator-stat-grid">
            {/* FLAT ARR */}
            <div className="calc-stat-card">
              <div className="calc-label">
                Flat Annual Run Rate
                <HelpCircle size={12} className="info-button" onClick={() => setShowTooltipInfo(showTooltipInfo === 'arr' ? null : 'arr')} />
              </div>
              {showTooltipInfo === 'arr' && (
                <div className="help-popover">
                  Annualized Run Rate (ARR) assuming current revenue remains exactly flat with no growth for the next 12 months.
                </div>
              )}
              <div className="calc-value">{formatCurrency(calculations.flatARR)}</div>
              <div className="calc-subtext neutral" style={{ fontFamily: 'var(--font-mono)' }}>
                MRR: {formatCurrency(calculations.flatMRR)} / mo
              </div>
            </div>

            {/* GROWTH ARR */}
            <div className="calc-stat-card highlight">
              <div className="calc-label" style={{ color: 'var(--accent-primary-hover)' }}>
                Growth-Adjusted ARR (12m)
                <HelpCircle size={12} className="info-button" onClick={() => setShowTooltipInfo(showTooltipInfo === 'grow-arr' ? null : 'grow-arr')} />
              </div>
              {showTooltipInfo === 'grow-arr' && (
                <div className="help-popover">
                  Projected revenue for the next 12 months based on compound monthly growth to reach the annual growth rate target.
                </div>
              )}
              <div className="calc-value" style={{ color: 'var(--text-primary)' }}>
                {formatCurrency(calculations.year1Compounded)}
              </div>
              <div className="calc-subtext positive" style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                <TrendingUp size={12} /> +{annualGrowthRate}% Compounded YoY
              </div>
            </div>

            {/* TARGET GOAL PROGRESS */}
            <div className="calc-stat-card">
              <div className="calc-label">
                Target Progress
              </div>
              <div className="calc-value">
                {calculations.pctTargetGrowth}%
              </div>
              <div className="target-bar-container">
                <div
                  className={`target-bar-fill ${calculations.pctTargetGrowth >= 100 ? 'on-track' : 'off-track'}`}
                  style={{ width: `${calculations.pctTargetGrowth}%` }}
                />
              </div>
              {calculations.growthTargetDiff >= 0 ? (
                <div className="calc-subtext positive" style={{ fontWeight: 600 }}>
                  Surplus: +{formatCurrency(calculations.growthTargetDiff)}
                </div>
              ) : (
                <div className="calc-subtext negative" style={{ fontWeight: 600 }}>
                  Deficit: -{formatCurrency(Math.abs(calculations.growthTargetDiff))}
                </div>
              )}
            </div>
          </div>

          {/* PROJECTIONS TABLE & COMPONENT */}
          <div className="calculator-grid" style={{ gridTemplateColumns: '1fr', gap: 'var(--space-6)' }}>
            {/* Chart Area */}
            <div className="chart-visual-card">
              <div className="chart-header-custom">
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>12-Month Extrapolation Curve</h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Flat MRR vs. Growth Compounded vs. Target Path</span>
                </div>
                <div className="badge-live-pulse">
                  <div className="live-pulse-dot" />
                  <span>Real-time Modeling</span>
                </div>
              </div>

              <div style={{ width: '100%', height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="flatGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                    <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#475569"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `৳${v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : (v / 1000).toFixed(0) + 'k'}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(15, 19, 41, 0.95)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: '8px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        color: 'var(--text-primary)',
                        fontSize: '12px'
                      }}
                      formatter={(value: any) => [formatCurrency(Number(value)), '']}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }}
                    />
                    <Area type="monotone" dataKey="Flat Projection" stroke="#3b82f6" strokeWidth={2} fill="url(#flatGrad)" />
                    <Area type="monotone" dataKey="Growth Adjusted" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#growthGrad)" />
                    <Area type="monotone" dataKey="Target Path" stroke="#10b981" strokeWidth={1.5} strokeDasharray="5 5" fill="none" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Projections Matrix */}
            <div className="compounding-matrix">
              <h4 className="matrix-title">Compound Future Projections Matrix</h4>

              <div className="matrix-row">
                <div className="matrix-label">
                  <Activity size={14} color="var(--accent-primary)" />
                  <span>Year 1 Revenue Projections</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="matrix-val">{formatCurrency(calculations.year1Compounded)}</span>
                  <span className={`matrix-badge ${calculations.year1Compounded >= annualTarget ? 'success' : 'warning'}`}>
                    {calculations.year1Compounded >= annualTarget ? 'Target Met' : `${calculations.pctTargetGrowth}% Met`}
                  </span>
                </div>
              </div>

              <div className="matrix-row">
                <div className="matrix-label">
                  <Activity size={14} color="var(--accent-secondary)" />
                  <span>Year 3 Cumulative Projections</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="matrix-val">{formatCurrency(calculations.year3Compounded)}</span>
                  <span className={`matrix-badge ${calculations.year3Compounded >= annualTarget ? 'success' : 'warning'}`}>
                    {calculations.year3Compounded >= annualTarget ? 'Target Met' : `${Math.round((calculations.year3Compounded / annualTarget) * 100)}% Met`}
                  </span>
                </div>
              </div>

              <div className="matrix-row">
                <div className="matrix-label">
                  <Activity size={14} color="var(--accent-tertiary)" />
                  <span>Year 5 Cumulative Projections</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="matrix-val">{formatCurrency(calculations.year5Compounded)}</span>
                  <span className={`matrix-badge ${calculations.year5Compounded >= annualTarget ? 'success' : 'warning'}`}>
                    {calculations.year5Compounded >= annualTarget ? 'Target Met' : `${Math.round((calculations.year5Compounded / annualTarget) * 100)}% Met`}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-2)', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-secondary)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Required Annual Growth (Simple):</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-primary-hover)' }}>{calculations.requiredGrowthRateSimple.toFixed(2)}%</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Compounding Monthly Growth Rate (g):</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-primary-hover)' }}>{calculations.monthlyCompoundingRate.toFixed(3)}% / mo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
