/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Sliders,
  Download,
  Copy,
  Check,
  BookOpen,
  Code,
  Info,
  Sparkles,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { ModelEnsembleChart, TradeoffChart } from './components/Charts';
import { TRUE_FUNCTIONS, runSimulation } from './utils/math';
import { generatePythonCode } from './utils/pythonCode';

export default function App() {
  // 1. Simulation Parameters State
  const [selectedFunctionId, setSelectedFunctionId] = useState<string>('cubic');
  const [noiseLevel, setNoiseLevel] = useState<number>(0.4);
  const [sampleSize, setSampleSize] = useState<number>(40);
  const [numTrials, setNumTrials] = useState<number>(50);
  const [selectedDegree, setSelectedDegree] = useState<number>(1); // default to linear

  // 2. Active Tab State (Educational vs. Python Code)
  const [activeTab, setActiveTab] = useState<'education' | 'python'>('education');

  // 3. UI State
  const [copied, setCopied] = useState(false);
  const [seed, setSeed] = useState(0); // allows manual rerolling of data

  const currentFunction = useMemo(() => {
    return TRUE_FUNCTIONS.find((f) => f.id === selectedFunctionId) || TRUE_FUNCTIONS[0];
  }, [selectedFunctionId]);

  // Adjust default degree if sweet spot is different
  useEffect(() => {
    if (selectedFunctionId === 'cubic') {
      setSelectedDegree(3);
    } else if (selectedFunctionId === 'sine') {
      setSelectedDegree(3);
    } else if (selectedFunctionId === 'runge') {
      setSelectedDegree(4);
    } else if (selectedFunctionId === 'linear') {
      setSelectedDegree(1);
    }
  }, [selectedFunctionId]);

  // 4. Run the Monte Carlo Simulation on parameter changes
  const simulationResult = useMemo(() => {
    // We include 'seed' to force re-computation when user clicks "Reroll Data"
    return runSimulation(selectedFunctionId, noiseLevel, sampleSize, numTrials, 8);
  }, [selectedFunctionId, noiseLevel, sampleSize, numTrials, seed]);

  const activeMetrics = useMemo(() => {
    return simulationResult.metrics.find((m) => m.degree === selectedDegree) || simulationResult.metrics[selectedDegree];
  }, [simulationResult, selectedDegree]);

  // Find the degree with the absolute minimum total MSE to label the optimal choice
  const optimalDegree = useMemo(() => {
    let minMse = Infinity;
    let optDeg = 0;
    simulationResult.metrics.forEach((m) => {
      if (m.mse < minMse) {
        minMse = m.mse;
        optDeg = m.degree;
      }
    });
    return optDeg;
  }, [simulationResult]);

  // Determine underfitting/overfitting status dynamically
  const modelStatus = useMemo(() => {
    if (selectedDegree === optimalDegree) {
      return {
        label: 'Optimal Sweet Spot ✨',
        colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        textColor: 'text-emerald-700',
        desc: 'This degree provides the best balance between bias and variance, minimizing the overall test prediction error (MSE).',
      };
    }

    const metric = activeMetrics;
    const ratioBiasToVar = metric.biasSquared / (metric.variance + 1e-9);

    if (selectedDegree < optimalDegree) {
      return {
        label: 'Underfitting ⚠️ (High Bias)',
        colorClass: 'bg-rose-50 text-rose-700 border-rose-200',
        textColor: 'text-rose-700',
        desc: 'The model is too simple to capture the underlying pattern of the data. Increasing polynomial complexity will reduce the bias squared without increasing variance significantly.',
      };
    } else {
      return {
        label: 'Overfitting ⚠️ (High Variance)',
        colorClass: 'bg-blue-50 text-blue-700 border-blue-200',
        textColor: 'text-blue-700',
        desc: 'The model is excessively complex and fits the random training noise. It has low bias but high variance, meaning the fit varies drastically from trial to trial.',
      };
    }
  }, [selectedDegree, optimalDegree, activeMetrics]);

  // 5. Code Exporter Actions
  const pythonCode = useMemo(() => {
    return generatePythonCode(selectedFunctionId, noiseLevel, sampleSize, numTrials, selectedDegree, 8);
  }, [selectedFunctionId, noiseLevel, sampleSize, numTrials, selectedDegree]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pythonCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadCode = () => {
    const blob = new Blob([pythonCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bias_variance_tradeoff_${selectedFunctionId}_deg${selectedDegree}.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* ================= HEADER ================= */}
      <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-6 shrink-0 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center font-bold text-lg text-white">
            Σ
          </div>
          <h1 className="text-lg md:text-xl font-semibold tracking-tight">
            Bias-Variance Lab <span className="text-slate-400 text-xs md:text-sm font-normal ml-2 tracking-normal">Interactive Simulation</span>
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Process Model</p>
            <p className="text-xs md:text-sm font-mono text-indigo-300 underline underline-offset-4 decoration-indigo-500">y = f(x) + ε</p>
          </div>
        </div>
      </header>

      {/* ================= MAIN LAYOUT ================= */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
        
        {/* SIDEBAR CONTROLS (Left side) */}
        <aside className="w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-6 flex flex-col space-y-5 overflow-y-auto shrink-0">
          
          {/* Resample Button */}
          <button
            onClick={() => setSeed((prev) => prev + 1)}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs hover:shadow transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Resample Datasets
          </button>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 block">
              1. Data Generating Process
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {TRUE_FUNCTIONS.map((fn) => (
                <button
                  key={fn.id}
                  onClick={() => setSelectedFunctionId(fn.id)}
                  className={`text-left p-2 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
                    selectedFunctionId === fn.id
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-3xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="font-bold truncate mb-0.5">{fn.name}</div>
                  <div className="text-[9px] font-mono text-slate-400 truncate">{fn.formula}</div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 leading-normal bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 mt-2 italic">
              {currentFunction.description}
            </p>
          </div>

          <div className="space-y-4 pt-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              2. Simulation Parameters
            </label>

            {/* Polynomial Degree Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-700">Model Complexity (Degree)</span>
                <span className="text-xs font-bold text-indigo-600">d = {selectedDegree}</span>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                step="1"
                value={selectedDegree}
                onChange={(e) => setSelectedDegree(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[8px] font-mono font-medium text-slate-400 mt-1">
                <span>0 (Constant)</span>
                <span>1 (Linear)</span>
                <span>3 (Cubic)</span>
                <span>8 (Complex)</span>
              </div>
            </div>

            {/* Noise Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-700">Noise Level (σ)</span>
                <span className="text-xs font-bold text-slate-800">{noiseLevel.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.2"
                step="0.1"
                value={noiseLevel}
                onChange={(e) => setNoiseLevel(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Sample Size Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-700">Sample Size (N)</span>
                <span className="text-xs font-bold text-slate-800">{sampleSize}</span>
              </div>
              <input
                type="range"
                min="15"
                max="100"
                step="5"
                value={sampleSize}
                onChange={(e) => setSampleSize(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Number of Trials Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-700">Monte Carlo Trials</span>
                <span className="text-xs font-bold text-slate-800">{numTrials}</span>
              </div>
              <input
                type="range"
                min="15"
                max="80"
                step="5"
                value={numTrials}
                onChange={(e) => setNumTrials(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {/* Current Estimates Section */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Current Estimates (Expected Error)
            </label>
            <div className="grid grid-cols-1 gap-2 text-xs font-mono">
              <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg flex justify-between items-center">
                <div>
                  <div className="text-[9px] text-rose-600 font-bold uppercase tracking-wider">Bias² (Underfit)</div>
                  <div className="text-base font-bold text-rose-700">{activeMetrics.biasSquared.toFixed(4)}</div>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold uppercase font-sans">
                  {selectedDegree < optimalDegree ? 'High' : 'Low'}
                </span>
              </div>
              <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-lg flex justify-between items-center">
                <div>
                  <div className="text-[9px] text-indigo-600 font-bold uppercase tracking-wider">Variance (Overfit)</div>
                  <div className="text-base font-bold text-indigo-700">{activeMetrics.variance.toFixed(4)}</div>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold uppercase font-sans">
                  {selectedDegree > optimalDegree ? 'High' : 'Low'}
                </span>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg flex justify-between items-center">
                <div>
                  <div className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Total MSE</div>
                  <div className="text-base font-bold text-emerald-700">{activeMetrics.mse.toFixed(4)}</div>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase font-sans">
                  {selectedDegree === optimalDegree ? 'Optimal' : 'Subopt'}
                </span>
              </div>
            </div>
          </div>

        </aside>

        {/* CONTENT AREA (Right side) */}
        <main className="flex-1 p-6 md:p-8 flex flex-col space-y-6 overflow-y-auto bg-slate-50">
          
          {/* Charts Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
            <div className="h-full">
              <ModelEnsembleChart
                evaluationPoints={simulationResult.evaluationPoints}
                trueValues={simulationResult.trueValues}
                fittedCurves={simulationResult.predictionsByDegree[selectedDegree]}
                averageCurve={simulationResult.predictionsByDegree[selectedDegree].reduce((acc, curve) => {
                  return acc.map((val, idx) => val + curve[idx] / numTrials);
                }, Array(simulationResult.evaluationPoints.length).fill(0))}
                trainingX={simulationResult.sampleTrainingX}
                trainingY={simulationResult.sampleTrainingY}
                xDomain={currentFunction.domain}
                selectedDegree={selectedDegree}
              />
            </div>
            
            <div className="h-full">
              <TradeoffChart
                metrics={simulationResult.metrics}
                selectedDegree={selectedDegree}
                onSelectDegree={setSelectedDegree}
              />
            </div>
          </div>

          {/* Diagnostic Report Overlay Block / Summary Row */}
          <div className="bg-indigo-950 text-white rounded-xl shadow-lg border border-indigo-900 p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-bold text-indigo-200 mb-1 flex items-center gap-2 text-sm md:text-base">
                <span className="w-2.5 h-2.5 bg-rose-400 rounded-full animate-pulse inline-block"></span>
                Diagnostic Analysis — Model Complexity d = {selectedDegree}
              </h3>
              <p className="text-xs text-indigo-100 leading-relaxed max-w-3xl">
                Currently configured at degree <span className="font-extrabold text-white">d = {selectedDegree}</span>, the model is exhibiting <span className="font-bold underline underline-offset-4 decoration-indigo-400">{modelStatus.label}</span>. {modelStatus.desc}
              </p>
            </div>
            <div className="p-3 bg-white/10 rounded-lg border border-white/10 shrink-0 text-center md:text-left min-w-[200px]">
              <p className="text-[10px] text-indigo-300 uppercase tracking-wider font-bold mb-0.5">Recommendation</p>
              <p className="text-xs leading-normal italic text-indigo-100 font-medium">
                {selectedDegree === optimalDegree ? (
                  `Perfect fit! Maintain complexity at d=${selectedDegree} for optimal balance.`
                ) : selectedDegree < optimalDegree ? (
                  `Increase complexity to d=${optimalDegree} to resolve severe underfitting.`
                ) : (
                  `Reduce complexity to d=${optimalDegree} to lower overfitting variance.`
                )}
              </p>
            </div>
          </div>

          {/* LOWER TABS */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            
            {/* Tab Headers */}
            <div className="flex border-b border-slate-200 bg-slate-50/60">
              <button
                onClick={() => setActiveTab('education')}
                className={`flex items-center gap-2 px-6 py-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'education'
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Theory & Explanation
              </button>
              <button
                onClick={() => setActiveTab('python')}
                className={`flex items-center gap-2 px-6 py-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'python'
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                }`}
              >
                <Code className="w-4 h-4" />
                Python Code Generator
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6">
              
              {activeTab === 'education' && (
                <div className="flex flex-col gap-6 text-sm leading-relaxed text-slate-600">
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    
                    {/* Bias definition */}
                    <div className="bg-rose-50/40 border border-rose-100 rounded-xl p-4.5 flex flex-col gap-2">
                      <h4 className="font-bold text-rose-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        1. Bias (Systematic Error)
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Bias represents the difference between the average prediction of our model (across multiple simulated training datasets) and the true underlying function. 
                      </p>
                      <p className="text-xs font-medium text-rose-700 mt-1">
                        Simple models (underfitting) make rigid assumptions, leading to <strong>high bias</strong>.
                      </p>
                    </div>

                    {/* Variance definition */}
                    <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-4.5 flex flex-col gap-2">
                      <h4 className="font-bold text-indigo-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        2. Variance (Sensitivity)
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Variance measures how much the model's predictions vary when trained on different random samples from the same process. It captures fitting instability.
                      </p>
                      <p className="text-xs font-medium text-indigo-700 mt-1">
                        Complex models (overfitting) adjust wildly to specific noise patterns, causing <strong>high variance</strong>.
                      </p>
                    </div>

                    {/* Irreducible noise definition */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4.5 flex flex-col gap-2">
                      <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        3. Irreducible Noise
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        This is the variance of the random error term (σ²) in the data generating process itself. No model, no matter how perfect, can eliminate this baseline error.
                      </p>
                      <p className="text-xs font-medium text-slate-600 mt-1">
                        It sets a lower bound on the Mean Squared Error (MSE).
                      </p>
                    </div>

                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      The Fundamental Bias-Variance Equation
                    </h3>
                    <p className="mb-4">
                      Any supervised learning algorithm's expected out-of-sample prediction error (measured as Mean Squared Error) can be decomposed mathematically into three additive terms:
                    </p>
                    
                    {/* Math Box */}
                    <div className="bg-slate-900 text-slate-100 font-mono text-center py-4 px-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-1.5 shadow-inner">
                      <div className="text-sm md:text-base font-extrabold tracking-wide text-indigo-400">
                        Expected Error (MSE) = Bias² + Variance + Irreducible Noise
                      </div>
                      <div className="text-xs text-slate-400">
                        E[(y - f̂(x))²] = (E[f̂(x)] - f(x))² + E[(f̂(x) - E[f̂(x)])²] + Var(e)
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                        Key Observations from this simulation:
                      </h4>
                      <ul className="list-disc list-inside space-y-2.5 text-xs text-slate-600 pl-1">
                        <li>
                          <strong>Underfitting Region (Left side of tradeoff curve):</strong> At low degrees (e.g., d=0 or d=1), Bias² is high because a assumptions are too rigid. Variance is minimal because different data batches generate almost identical flat models.
                        </li>
                        <li>
                          <strong>Overfitting Region (Right side of tradeoff curve):</strong> At high degrees (e.g., d=7 or d=8), the model has enough freedom to fit random noise. Bias² drops, but Variance explodes. Shift any single training point slightly, and the model fit oscillates wildly.
                        </li>
                        <li>
                          <strong>The Sweet Spot:</strong> The optimal model complexity lies at the trough of the <strong>green MSE curve</strong>, where the combined sum of Bias² and Variance is minimized.
                        </li>
                      </ul>
                    </div>
                  </div>

                </div>
              )}

              {activeTab === 'python' && (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl p-4 flex-wrap gap-2">
                    <div>
                      <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <Code className="w-4 h-4 text-indigo-600" />
                        Ready-to-run Python Code Exporter
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        This script generates the exact same parameters and simulation plots locally using NumPy and Matplotlib.
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyCode}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:bg-slate-100 rounded-lg shadow-2xs transition-all cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Code</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleDownloadCode}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-2xs transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download .py</span>
                      </button>
                    </div>
                  </div>

                  {/* Preformated Code block */}
                  <div className="relative">
                    <pre className="text-xs font-mono bg-slate-950 text-slate-100 rounded-xl p-4 overflow-x-auto max-h-[420px] shadow-inner border border-slate-900 leading-relaxed scrollbar-thin">
                      <code>{pythonCode}</code>
                    </pre>
                  </div>
                </div>
              )}

            </div>
          </div>

        </main>
      </div>

      {/* ================= FOOTER BAR ================= */}
      <footer className="h-8 bg-white border-t border-slate-200 px-6 flex items-center justify-between shrink-0 font-mono text-[10px] text-slate-400">
        <div>Computational Statistics & Learning Theory Lab</div>
        <div>AI Accelerator: ACTIVE | Sim ID: BV-912X</div>
      </footer>
        
    </div>
  );
}
