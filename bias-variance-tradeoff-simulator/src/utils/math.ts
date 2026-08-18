/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TrueFunction {
  id: string;
  name: string;
  formula: string;
  description: string;
  domain: [number, number];
  fn: (x: number) => number;
}

export const TRUE_FUNCTIONS: TrueFunction[] = [
  {
    id: 'cubic',
    name: 'Cubic Polynomial',
    formula: 'f(x) = 0.5x³ - x² - 0.5x + 1',
    description: 'A classic cubic function. The optimal fit is at degree 3. Lower degrees underfit, while higher degrees overfit when noise is present.',
    domain: [-2, 2],
    fn: (x) => 0.5 * Math.pow(x, 3) - Math.pow(x, 2) - 0.5 * x + 1,
  },
  {
    id: 'sine',
    name: 'Sine Wave',
    formula: 'f(x) = sin(π * x)',
    description: 'A periodic wave. No single polynomial fits it perfectly everywhere, but degrees 3 to 5 provide a great trade-off before overfitting occurs.',
    domain: [-1.5, 1.5],
    fn: (x) => Math.sin(Math.PI * x),
  },
  {
    id: 'runge',
    name: 'Runge\'s Phenomenon',
    formula: 'f(x) = 2 / (1 + 5x²)',
    description: 'A bell-shaped curve that demonstrates Runge\'s phenomenon: high-degree polynomial fits oscillate wildly near the edges of the interval.',
    domain: [-1.5, 1.5],
    fn: (x) => 2 / (1 + 5 * x * x),
  },
  {
    id: 'linear',
    name: 'Simple Linear',
    formula: 'f(x) = 0.8x + 0.2',
    description: 'A simple straight line. Degree 1 is the optimal sweet spot. Degrees 2+ only add unnecessary variance, while degree 0 (constant) underfits.',
    domain: [-2, 2],
    fn: (x) => 0.8 * x + 0.2,
  },
];

/**
 * Standard Normal distributed random number using Box-Muller transform
 */
export function randomNormal(mean = 0, stddev = 1): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * stddev + mean;
}

/**
 * Solve a system of linear equations A * x = b using Gaussian elimination with partial pivoting.
 * Includes a small ridge penalty (L2 regularization) on the diagonal of A for numerical stability.
 */
export function solveLinearSystem(A: number[][], b: number[], ridge = 1e-6): number[] {
  const n = b.length;
  // Create an augmented matrix [A | b] and add ridge regularization to the diagonal (except intercept)
  const M = A.map((row, i) => {
    const newRow = [...row, b[i]];
    if (i > 0) {
      newRow[i] += ridge; // Add ridge penalty
    }
    return newRow;
  });

  for (let i = 0; i < n; i++) {
    // Partial pivoting
    let maxEl = Math.abs(M[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > maxEl) {
        maxEl = Math.abs(M[k][i]);
        maxRow = k;
      }
    }

    // Swap row
    const temp = M[maxRow];
    M[maxRow] = M[i];
    M[i] = temp;

    // Check for singularity
    if (Math.abs(M[i][i]) < 1e-12) {
      // If singular even with ridge, we add a stronger regularizer to this pivot
      M[i][i] += 1e-4;
    }

    // Eliminate below
    for (let k = i + 1; k < n; k++) {
      const c = -M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) {
        if (i === j) {
          M[k][j] = 0;
        } else {
          M[k][j] += c * M[i][j];
        }
      }
    }
  }

  // Back substitution
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(M[i][i]) < 1e-12) {
      x[i] = 0;
      continue;
    }
    x[i] = M[i][n] / M[i][i];
    for (let k = i - 1; k >= 0; k--) {
      M[k][n] -= M[k][i] * x[i];
    }
  }
  return x;
}

/**
 * Fit a polynomial of specified degree to the given (x, y) points.
 * Returns the coefficients [w_0, w_1, ..., w_d]
 */
export function fitPolynomial(xPoints: number[], yPoints: number[], degree: number): number[] {
  const n = xPoints.length;
  const m = degree + 1;

  const XT_X: number[][] = Array.from({ length: m }, () => Array(m).fill(0));
  const XT_y: number[] = Array(m).fill(0);

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += Math.pow(xPoints[k], i + j);
      }
      XT_X[i][j] = sum;
    }

    let sumY = 0;
    for (let k = 0; k < n; k++) {
      sumY += yPoints[k] * Math.pow(xPoints[k], i);
    }
    XT_y[i] = sumY;
  }

  return solveLinearSystem(XT_X, XT_y);
}

/**
 * Evaluate a polynomial with given coefficients at x
 */
export function evaluatePolynomial(coefficients: number[], x: number): number {
  let val = 0;
  for (let j = 0; j < coefficients.length; j++) {
    val += coefficients[j] * Math.pow(x, j);
  }
  return val;
}

export interface SimulationMetricPoint {
  degree: number;
  biasSquared: number;
  variance: number;
  noise: number;
  mse: number;
}

export interface SimulationResult {
  evaluationPoints: number[];
  trueValues: number[];
  // For each degree (0 to 8), stores the ensemble of fits evaluated at evaluationPoints
  // Dimension: [degree][trialIndex][evalPointIndex]
  predictionsByDegree: { [degree: number]: number[][] };
  // Fitted coefficients for each trial and degree
  coefficientsByDegree: { [degree: number]: number[][] };
  // The first trial's training data (for plotting individual scatter dots)
  sampleTrainingX: number[];
  sampleTrainingY: number[];
  // Aggregated bias-variance tradeoff metrics for each degree
  metrics: SimulationMetricPoint[];
}

/**
 * Run the Bias-Variance simulation
 */
export function runSimulation(
  functionId: string,
  noiseLevel: number,
  sampleSize: number,
  numTrials: number,
  maxDegree = 8
): SimulationResult {
  const trueFnObj = TRUE_FUNCTIONS.find((f) => f.id === functionId) || TRUE_FUNCTIONS[0];
  const [xMin, xMax] = trueFnObj.domain;

  // 1. Generate standard evaluation points
  const numEval = 50;
  const evaluationPoints: number[] = [];
  const trueValues: number[] = [];
  for (let i = 0; i < numEval; i++) {
    const x = xMin + (i / (numEval - 1)) * (xMax - xMin);
    evaluationPoints.push(x);
    trueValues.push(trueFnObj.fn(x));
  }

  // Initialize prediction and coefficient maps
  const predictionsByDegree: { [degree: number]: number[][] } = {};
  const coefficientsByDegree: { [degree: number]: number[][] } = {};
  for (let d = 0; d <= maxDegree; d++) {
    predictionsByDegree[d] = [];
    coefficientsByDegree[d] = [];
  }

  // To display dots, we save the first trial's training data
  let sampleTrainingX: number[] = [];
  let sampleTrainingY: number[] = [];

  // 2. Perform trials
  for (let t = 0; t < numTrials; t++) {
    // Generate random training points in the domain
    const trainX: number[] = [];
    const trainY: number[] = [];
    for (let i = 0; i < sampleSize; i++) {
      // Sample uniformly in domain
      const x = xMin + Math.random() * (xMax - xMin);
      const y = trueFnObj.fn(x) + randomNormal(0, noiseLevel);
      trainX.push(x);
      trainY.push(y);
    }

    if (t === 0) {
      sampleTrainingX = trainX;
      sampleTrainingY = trainY;
    }

    // Fit polynomials of all degrees
    for (let d = 0; d <= maxDegree; d++) {
      const coeffs = fitPolynomial(trainX, trainY, d);
      coefficientsByDegree[d].push(coeffs);

      const trialPreds: number[] = [];
      for (let i = 0; i < numEval; i++) {
        trialPreds.push(evaluatePolynomial(coeffs, evaluationPoints[i]));
      }
      predictionsByDegree[d].push(trialPreds);
    }
  }

  // 3. Compute bias, variance and MSE for each degree
  const metrics: SimulationMetricPoint[] = [];

  for (let d = 0; d <= maxDegree; d++) {
    const degreePreds = predictionsByDegree[d]; // size: [numTrials][numEval]
    
    let sumBiasSq = 0;
    let sumVar = 0;

    for (let i = 0; i < numEval; i++) {
      const target = trueValues[i];

      // Calculate mean prediction at evaluation point i across all trials
      let sumPred = 0;
      for (let t = 0; t < numTrials; t++) {
        sumPred += degreePreds[t][i];
      }
      const meanPred = sumPred / numTrials;

      // Bias squared at point i: (E[f_hat(x)] - f(x))^2
      const biasSq_i = Math.pow(meanPred - target, 2);
      sumBiasSq += biasSq_i;

      // Variance at point i: E[(f_hat(x) - E[f_hat(x)])^2]
      let sumSqDiff = 0;
      for (let t = 0; t < numTrials; t++) {
        sumSqDiff += Math.pow(degreePreds[t][i] - meanPred, 2);
      }
      const var_i = sumSqDiff / numTrials;
      sumVar += var_i;
    }

    const avgBiasSquared = sumBiasSq / numEval;
    const avgVariance = sumVar / numEval;
    // MSE = Bias^2 + Variance + Noise^2
    const noiseVariance = noiseLevel * noiseLevel;
    const avgMSE = avgBiasSquared + avgVariance + noiseVariance;

    metrics.push({
      degree: d,
      biasSquared: avgBiasSquared,
      variance: avgVariance,
      noise: noiseVariance,
      mse: avgMSE,
    });
  }

  return {
    evaluationPoints,
    trueValues,
    predictionsByDegree,
    coefficientsByDegree,
    sampleTrainingX,
    sampleTrainingY,
    metrics,
  };
}
