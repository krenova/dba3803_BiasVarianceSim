/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';

// Common margins and dimensions for our SVG viewBox (600 x 360)
const W = 600;
const H = 360;
const margin = { top: 25, right: 30, bottom: 45, left: 55 };
const plotW = W - margin.left - margin.right;
const plotH = H - margin.top - margin.bottom;

interface ModelEnsembleChartProps {
  evaluationPoints: number[];
  trueValues: number[];
  fittedCurves: number[][]; // [trialIndex][evalPointIndex]
  averageCurve: number[];
  trainingX: number[];
  trainingY: number[];
  xDomain: [number, number];
  selectedDegree: number;
}

export const ModelEnsembleChart: React.FC<ModelEnsembleChartProps> = ({
  evaluationPoints,
  trueValues,
  fittedCurves,
  averageCurve,
  trainingX,
  trainingY,
  xDomain,
  selectedDegree,
}) => {
  const [hoverX, setHoverX] = useState<number | null>(null);
  const containerRef = useRef<SVGSVGElement | null>(null);

  const [xMin, xMax] = xDomain;
  // Cap Y values to keep the plot highly readable, even with high-variance wild oscillations
  const yMin = -2.5;
  const yMax = 2.5;

  // Coordinate mapping functions
  const mapX = (x: number) => margin.left + ((x - xMin) / (xMax - xMin)) * plotW;
  const mapY = (y: number) => {
    const clampedY = Math.max(yMin, Math.min(yMax, y));
    return margin.top + (1 - (clampedY - yMin) / (yMax - yMin)) * plotH;
  };

  // Convert coordinate back to data X
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * W;

    if (svgX >= margin.left && svgX <= W - margin.right) {
      const dataX = xMin + ((svgX - margin.left) / plotW) * (xMax - xMin);
      setHoverX(dataX);
    } else {
      setHoverX(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverX(null);
  };

  // Generate SVG path for a curve
  const getPathData = (xs: number[], ys: number[]) => {
    if (xs.length === 0) return '';
    return xs
      .map((x, i) => {
        const cmd = i === 0 ? 'M' : 'L';
        return `${cmd} ${mapX(x).toFixed(1)} ${mapY(ys[i]).toFixed(1)}`;
      })
      .join(' ');
  };

  // Calculate coordinates for grid lines
  const xTicks = 5;
  const yTicks = 5;
  const xTickValues = Array.from({ length: xTicks }, (_, i) => xMin + (i / (xTicks - 1)) * (xMax - xMin));
  const yTickValues = Array.from({ length: yTicks }, (_, i) => yMin + (i / (yTicks - 1)) * (yMax - yMin));

  // Find hover index to display tooltips
  let tooltipData = null;
  if (hoverX !== null) {
    // Find closest evaluation point
    let closestIndex = 0;
    let minDiff = Infinity;
    for (let i = 0; i < evaluationPoints.length; i++) {
      const diff = Math.abs(evaluationPoints[i] - hoverX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    
    // Grab average curve prediction, true function value, and one sample fit value
    const xVal = evaluationPoints[closestIndex];
    const trueVal = trueValues[closestIndex];
    const avgVal = averageCurve[closestIndex];
    const sampleFits = fittedCurves.map(curve => curve[closestIndex]).filter(v => !isNaN(v) && isFinite(v));
    
    tooltipData = {
      x: xVal,
      trueVal,
      avgVal,
      sampleFitsCount: sampleFits.length,
    };
  }

  // Create active sample fit path (just using the 1st fitted curve as a highlighted sample)
  const sampleFitPath = fittedCurves.length > 0 ? getPathData(evaluationPoints, fittedCurves[0]) : '';

  return (
    <div className="relative bg-white rounded-xl border border-slate-100 shadow-xs p-4 flex flex-col h-full">
      <div className="mb-3 flex flex-wrap justify-between items-center gap-2">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm md:text-base">
            Model Ensemble & Fits (Degree {selectedDegree})
          </h3>
          <p className="text-xs text-slate-500">
            Light grey lines show fits from {fittedCurves.length} separate random trials.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <span className="flex items-center gap-1.5 font-medium text-emerald-600">
            <span className="w-3 h-0.5 bg-emerald-600 inline-block"></span> True f(x)
          </span>
          <span className="flex items-center gap-1.5 font-medium text-orange-500">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-orange-500 inline-block"></span> Avg Fit E[f̂(x)]
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500/85 inline-block"></span> Training Sample
          </span>
        </div>
      </div>

      <div className="relative flex-1 min-h-[220px]">
        <svg
          id="model-ensemble-svg"
          ref={containerRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full select-none cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Definitions for clip path and styling */}
          <defs>
            <clipPath id="ensemble-clip">
              <rect x={margin.left} y={margin.top} width={plotW} height={plotH} />
            </clipPath>
          </defs>

          {/* Grid lines (X direction) */}
          {xTickValues.map((val, i) => (
            <g key={`grid-x-${i}`}>
              <line
                x1={mapX(val)}
                y1={margin.top}
                x2={mapX(val)}
                y2={H - margin.bottom}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
              <text
                x={mapX(val)}
                y={H - margin.bottom + 18}
                textAnchor="middle"
                className="text-[10px] font-mono fill-slate-400 font-medium"
              >
                {val.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Grid lines (Y direction) */}
          {yTickValues.map((val, i) => (
            <g key={`grid-y-${i}`}>
              <line
                x1={margin.left}
                y1={mapY(val)}
                x2={W - margin.right}
                y2={mapY(val)}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
              <text
                x={margin.left - 8}
                y={mapY(val) + 4}
                textAnchor="end"
                className="text-[10px] font-mono fill-slate-400 font-medium"
              >
                {val.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Axes labels */}
          <text
            x={margin.left + plotW / 2}
            y={H - 5}
            textAnchor="middle"
            className="text-xs font-semibold fill-slate-500"
          >
            Input Variable (x)
          </text>
          <text
            x={15}
            y={margin.top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 15 ${margin.top + plotH / 2})`}
            className="text-xs font-semibold fill-slate-500"
          >
            Target Value (y)
          </text>

          {/* --- Plotted curves inside clipped area --- */}
          <g clipPath="url(#ensemble-clip)">
            {/* 1. All fitted models in trial ensemble (transparent gray lines) */}
            {fittedCurves.slice(1).map((curve, idx) => (
              <path
                key={`fit-curve-${idx}`}
                d={getPathData(evaluationPoints, curve)}
                fill="none"
                stroke="#64748b"
                strokeWidth={1.2}
                strokeOpacity={0.12}
              />
            ))}

            {/* 2. Highlighted 1st fit (just to give contrast) */}
            {sampleFitPath && (
              <path
                d={sampleFitPath}
                fill="none"
                stroke="#6366f1"
                strokeWidth={1.8}
                strokeOpacity={0.4}
              />
            )}

            {/* 3. Expected Value / Average Prediction Curve (Orange dashed) */}
            <path
              d={getPathData(evaluationPoints, averageCurve)}
              fill="none"
              stroke="#f97316"
              strokeWidth={3}
              strokeDasharray="4,4"
            />

            {/* 4. True Function f(x) (Thick Emerald Solid) */}
            <path
              d={getPathData(evaluationPoints, trueValues)}
              fill="none"
              stroke="#059669"
              strokeWidth={3}
            />

            {/* 5. Scatter dots of current sample training data */}
            {trainingX.map((x, i) => {
              const cx = mapX(x);
              const cy = mapY(trainingY[i]);
              const inside = cy >= margin.top && cy <= H - margin.bottom;
              if (!inside) return null;
              return (
                <circle
                  key={`train-point-${i}`}
                  cx={cx}
                  cy={cy}
                  r={3.5}
                  className="fill-indigo-500/80 stroke-white stroke-[1]"
                />
              );
            })}
          </g>

          {/* Border box around plot area */}
          <rect
            x={margin.left}
            y={margin.top}
            width={plotW}
            height={plotH}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth={1.5}
          />

          {/* Interactive Hover Tooltip Line */}
          {hoverX !== null && tooltipData && (
            <g>
              <line
                x1={mapX(tooltipData.x)}
                y1={margin.top}
                x2={mapX(tooltipData.x)}
                y2={H - margin.bottom}
                stroke="#64748b"
                strokeWidth={1}
                strokeDasharray="3,3"
              />
              <circle
                cx={mapX(tooltipData.x)}
                cy={mapY(tooltipData.trueVal)}
                r={4}
                className="fill-emerald-500 stroke-white stroke-[1.5]"
              />
              <circle
                cx={mapX(tooltipData.x)}
                cy={mapY(tooltipData.avgVal)}
                r={4}
                className="fill-orange-500 stroke-white stroke-[1.5]"
              />
            </g>
          )}
        </svg>

        {/* Float HTML Tooltip Box */}
        {hoverX !== null && tooltipData && (
          <div
            className="absolute z-10 pointer-events-none bg-slate-900/95 text-white text-[11px] font-mono rounded-lg shadow-lg p-2.5 border border-slate-800 flex flex-col gap-1"
            style={{
              left: `${Math.min(W - 170, Math.max(10, (mapX(tooltipData.x) / W) * 100))}%`,
              top: '12px',
            }}
          >
            <div className="font-semibold text-slate-300 border-b border-slate-800 pb-1 mb-1">
              x = {tooltipData.x.toFixed(3)}
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-emerald-400">f(x) True:</span>
              <span className="font-semibold">{tooltipData.trueVal.toFixed(3)}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-orange-400">E[f̂(x)] Avg Fit:</span>
              <span className="font-semibold">{tooltipData.avgVal.toFixed(3)}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-indigo-400">Abs Bias:</span>
              <span className="font-semibold">{Math.abs(tooltipData.avgVal - tooltipData.trueVal).toFixed(3)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* --- TradeoffChart --- */

interface TradeoffChartProps {
  metrics: {
    degree: number;
    biasSquared: number;
    variance: number;
    noise: number;
    mse: number;
  }[];
  selectedDegree: number;
  onSelectDegree: (deg: number) => void;
}

export const TradeoffChart: React.FC<TradeoffChartProps> = ({
  metrics,
  selectedDegree,
  onSelectDegree,
}) => {
  const [hoveredDegree, setHoveredDegree] = useState<number | null>(null);

  // Find max value to auto-scale the Y axis
  const maxMetric = Math.max(...metrics.map(m => Math.max(m.mse, m.biasSquared, m.variance, m.noise, 0.1)));
  // Round up to a nice clean number
  const yAxisMax = Math.ceil(maxMetric * 1.1 * 10) / 10;
  const yAxisMin = 0;

  const degrees = metrics.map((m) => m.degree);
  const degMin = degrees[0];
  const degMax = degrees[degrees.length - 1];

  // Map to SVG coordinates
  const mapX = (deg: number) => margin.left + ((deg - degMin) / (degMax - degMin)) * plotW;
  const mapY = (val: number) => margin.top + (1 - (val - yAxisMin) / (yAxisMax - yAxisMin)) * plotH;

  // Generate SVG path for metric arrays
  const getPathData = (getter: (m: typeof metrics[0]) => number) => {
    return metrics
      .map((m, i) => {
        const cmd = i === 0 ? 'M' : 'L';
        return `${cmd} ${mapX(m.degree).toFixed(1)} ${mapY(getter(m)).toFixed(1)}`;
      })
      .join(' ');
  };

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => yAxisMin + (i / (yTicks - 1)) * (yAxisMax - yAxisMin));

  const activeDegreeData = metrics.find((m) => m.degree === (hoveredDegree ?? selectedDegree)) || metrics[selectedDegree];

  return (
    <div className="relative bg-white rounded-xl border border-slate-100 shadow-xs p-4 flex flex-col h-full">
      <div className="mb-3 flex flex-wrap justify-between items-center gap-2">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm md:text-base">
            Bias-Variance Tradeoff Curves
          </h3>
          <p className="text-xs text-slate-500">
            Click on any column/point or use the slider to select a model complexity level.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <span className="flex items-center gap-1 font-medium text-rose-500">
            <span className="w-3 h-0.5 bg-rose-500 inline-block"></span> Bias²
          </span>
          <span className="flex items-center gap-1 font-medium text-indigo-500">
            <span className="w-3 h-0.5 bg-indigo-500 inline-block"></span> Variance
          </span>
          <span className="flex items-center gap-1 font-medium text-slate-400">
            <span className="w-3 h-0.5 border-t border-dashed border-slate-400 inline-block"></span> Noise
          </span>
          <span className="flex items-center gap-1 font-medium text-emerald-600">
            <span className="w-3 h-0.5 bg-emerald-600 inline-block"></span> Total MSE
          </span>
        </div>
      </div>

      <div className="relative flex-1 min-h-[220px]">
        <svg
          id="tradeoff-chart-svg"
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full select-none cursor-pointer overflow-visible"
        >
          {/* Grid lines (X direction: vertical degree bars) */}
          {degrees.map((deg) => (
            <g key={`grid-deg-${deg}`}>
              <line
                x1={mapX(deg)}
                y1={margin.top}
                x2={mapX(deg)}
                y2={H - margin.bottom}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
              <text
                x={mapX(deg)}
                y={H - margin.bottom + 18}
                textAnchor="middle"
                className={`text-[10px] font-mono font-bold ${
                  deg === selectedDegree ? 'fill-indigo-600 font-extrabold text-xs' : 'fill-slate-400'
                }`}
              >
                d={deg}
              </text>
            </g>
          ))}

          {/* Grid lines (Y direction) */}
          {yTickValues.map((val, i) => (
            <g key={`grid-tr-y-${i}`}>
              <line
                x1={margin.left}
                y1={mapY(val)}
                x2={W - margin.right}
                y2={mapY(val)}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
              <text
                x={margin.left - 8}
                y={mapY(val) + 4}
                textAnchor="end"
                className="text-[10px] font-mono fill-slate-400 font-medium"
              >
                {val.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Axes labels */}
          <text
            x={margin.left + plotW / 2}
            y={H - 5}
            textAnchor="middle"
            className="text-xs font-semibold fill-slate-500"
          >
            Model Complexity (Polynomial Degree d)
          </text>
          <text
            x={15}
            y={margin.top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 15 ${margin.top + plotH / 2})`}
            className="text-xs font-semibold fill-slate-500"
          >
            Error Magnitude
          </text>

          {/* Shaded background columns for interactive clicks */}
          {degrees.map((deg) => (
            <rect
              key={`clickable-col-${deg}`}
              x={mapX(deg) - plotW / (degrees.length - 1) / 2}
              y={margin.top}
              width={plotW / (degrees.length - 1)}
              height={plotH}
              fill={deg === selectedDegree ? 'rgba(99, 102, 241, 0.05)' : 'transparent'}
              className="hover:fill-slate-100/50 cursor-pointer transition-all duration-150"
              onClick={() => onSelectDegree(deg)}
              onMouseEnter={() => setHoveredDegree(deg)}
              onMouseLeave={() => setHoveredDegree(null)}
            />
          ))}

          {/* Vertical dashed indicator bar for currently active degree */}
          <line
            x1={mapX(selectedDegree)}
            y1={margin.top}
            x2={mapX(selectedDegree)}
            y2={H - margin.bottom}
            stroke="#6366f1"
            strokeWidth={1.5}
            strokeDasharray="4,3"
          />

          {/* 1. Constant Noise Floor Line */}
          <path
            d={getPathData((m) => m.noise)}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="4,4"
          />

          {/* 2. Bias Squared Curve (Red) */}
          <path
            d={getPathData((m) => m.biasSquared)}
            fill="none"
            stroke="#ef4444"
            strokeWidth={2.5}
          />

          {/* 3. Variance Curve (Indigo) */}
          <path
            d={getPathData((m) => m.variance)}
            fill="none"
            stroke="#6366f1"
            strokeWidth={2.5}
          />

          {/* 4. Total MSE Curve (Emerald - Thickest) */}
          <path
            d={getPathData((m) => m.mse)}
            fill="none"
            stroke="#10b981"
            strokeWidth={3.5}
          />

          {/* Markers / Dots on curves */}
          {metrics.map((m) => {
            const cx = mapX(m.degree);
            const isSelected = m.degree === selectedDegree;
            const r = isSelected ? 5.5 : 3.5;
            const strokeW = isSelected ? 2 : 1.5;

            return (
              <g key={`markers-${m.degree}`}>
                {/* Bias² markers (red circles) */}
                <circle
                  cx={cx}
                  cy={mapY(m.biasSquared)}
                  r={r}
                  className={`${
                    isSelected ? 'fill-rose-500 stroke-white' : 'fill-white stroke-rose-400'
                  }`}
                  strokeWidth={strokeW}
                  onClick={() => onSelectDegree(m.degree)}
                />
                {/* Variance markers (indigo squares) */}
                <rect
                  x={cx - r}
                  y={mapY(m.variance) - r}
                  width={r * 2}
                  height={r * 2}
                  className={`${
                    isSelected ? 'fill-indigo-500 stroke-white' : 'fill-white stroke-indigo-400'
                  }`}
                  strokeWidth={strokeW}
                  onClick={() => onSelectDegree(m.degree)}
                />
                {/* MSE markers (emerald diamonds) */}
                <path
                  d={`M ${cx} ${mapY(m.mse) - r - 1} L ${cx + r + 1} ${mapY(m.mse)} L ${cx} ${
                    mapY(m.mse) + r + 1
                  } L ${cx - r - 1} ${mapY(m.mse)} Z`}
                  className={`${
                    isSelected ? 'fill-emerald-500 stroke-white' : 'fill-white stroke-emerald-400'
                  }`}
                  strokeWidth={strokeW}
                  onClick={() => onSelectDegree(m.degree)}
                />
              </g>
            );
          })}

          {/* Border box */}
          <rect
            x={margin.left}
            y={margin.top}
            width={plotW}
            height={plotH}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth={1.5}
          />
        </svg>

        {/* Hover / Highlight Information Card on Bottom Left */}
        <div className="absolute top-2 right-2 bg-slate-950/90 text-white rounded-lg p-2.5 text-[11px] font-mono shadow-md border border-slate-800 flex flex-col gap-1 min-w-[170px]">
          <div className="font-bold text-slate-300 border-b border-slate-800 pb-1 mb-1 flex items-center justify-between">
            <span>Polynomial Degree:</span>
            <span className="text-indigo-400 font-extrabold text-xs">d = {activeDegreeData.degree}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-rose-400 font-semibold">Bias² (Underfit):</span>
            <span className="font-semibold">{activeDegreeData.biasSquared.toFixed(4)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-indigo-400 font-semibold">Variance (Overfit):</span>
            <span className="font-semibold">{activeDegreeData.variance.toFixed(4)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-800/60 pt-0.5 mt-0.5">
            <span className="text-slate-400">Irreducible Noise:</span>
            <span className="font-semibold">{activeDegreeData.noise.toFixed(4)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-800 pt-1 mt-1 font-bold text-emerald-400">
            <span>Total MSE Error:</span>
            <span>{activeDegreeData.mse.toFixed(4)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
