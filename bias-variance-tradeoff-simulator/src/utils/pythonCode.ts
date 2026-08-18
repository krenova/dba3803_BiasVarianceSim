/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function generatePythonCode(
  functionId: string,
  noiseLevel: number,
  sampleSize: number,
  numTrials: number,
  selectedDegree: number,
  maxDegree = 8
): string {
  // Map JS true function to Python equivalent
  let pyTrueFnDef = '';
  let pyFormulaStr = '';

  if (functionId === 'cubic') {
    pyTrueFnDef = '    return 0.5 * (x ** 3) - (x ** 2) - 0.5 * x + 1.0';
    pyFormulaStr = '0.5x^3 - x^2 - 0.5x + 1';
  } else if (functionId === 'sine') {
    pyTrueFnDef = '    return np.sin(np.pi * x)';
    pyFormulaStr = 'sin(\\pi * x)';
  } else if (functionId === 'runge') {
    pyTrueFnDef = '    return 2.0 / (1.0 + 5.0 * (x ** 2))';
    pyFormulaStr = '2 / (1 + 5x^2)';
  } else {
    pyTrueFnDef = '    return 0.8 * x + 0.2';
    pyFormulaStr = '0.8x + 0.2';
  }

  // Set the domain range based on the function
  const domainStr = functionId === 'sine' || functionId === 'runge' ? '-1.5, 1.5' : '-2.0, 2.0';

  return `import numpy as np
import matplotlib.pyplot as plt

# ==========================================
# 1. PARAMETERS & CONFIGURATION
# ==========================================
# Configured live from the Bias-Variance Tradeoff Simulator app
FUNCTION_ID = "${functionId}"
NOISE_LEVEL = ${noiseLevel}       # Noise standard deviation (sigma)
SAMPLE_SIZE = ${sampleSize}       # Number of training samples per dataset (N)
NUM_TRIALS = ${numTrials}         # Number of simulated datasets for Monte Carlo estimation
SELECTED_DEGREE = ${selectedDegree}     # Selected polynomial degree for detail visualization
MAX_DEGREE = ${maxDegree}          # Maximum degree to compute tradeoff curve

# Range/domain for our input variable x
X_MIN, X_MAX = ${domainStr}

# ==========================================
# 2. DATA GENERATING PROCESS (DGP)
# ==========================================
def true_function(x):
    """
    True target function (f(x)) without noise.
    Formula: ${pyFormulaStr}
    """
${pyTrueFnDef}

def generate_dataset(n_samples, noise_std):
    """
    Generates a random training dataset y = f(x) + epsilon
    where epsilon ~ Normal(0, noise_std^2)
    """
    x = np.random.uniform(X_MIN, X_MAX, n_samples)
    epsilon = np.random.normal(0, noise_std, n_samples)
    y = true_function(x) + epsilon
    return x, y

# ==========================================
# 3. MONTE CARLO SIMULATION
# ==========================================
# Setup dense grid of points for evaluation
n_eval = 50
x_eval = np.linspace(X_MIN, X_MAX, n_eval)
y_true = true_function(x_eval)

# Pre-allocate predictions: [degree][trial][eval_point]
predictions = {d: np.zeros((NUM_TRIALS, n_eval)) for d in range(MAX_DEGREE + 1)}

# Run trials
np.random.seed(42)  # For reproducibility
sample_x, sample_y = None, None

for trial in range(NUM_TRIALS):
    x_train, y_train = generate_dataset(SAMPLE_SIZE, NOISE_LEVEL)
    if trial == 0:
        sample_x, sample_y = x_train, y_train  # Save first dataset for plotting
        
    for d in range(MAX_DEGREE + 1):
        # Fit polynomial using numpy.polyfit
        # polyfit returns coefficients [w_d, ..., w_1, w_0]
        coeffs = np.polyfit(x_train, y_train, d)
        # Evaluate model on our evaluation points
        preds = np.polyval(coeffs, x_eval)
        predictions[d][trial, :] = preds

# ==========================================
# 4. CALCULATING BIAS, VARIANCE AND MSE
# ==========================================
bias_squared_curve = []
variance_curve = []
noise_floor = [NOISE_LEVEL ** 2] * (MAX_DEGREE + 1)
mse_curve = []

for d in range(MAX_DEGREE + 1):
    preds_d = predictions[d] # shape: (NUM_TRIALS, n_eval)
    
    # E[f_hat(x)] - average prediction across all simulated trials
    mean_pred_d = np.mean(preds_d, axis=0)
    
    # Squared Bias: (E[f_hat(x)] - f(x))^2 averaged over the domain
    bias_sq_d = np.mean((mean_pred_d - y_true) ** 2)
    
    # Variance: E[(f_hat(x) - E[f_hat(x)])^2] averaged over the domain
    variance_d = np.mean(np.var(preds_d, axis=0))
    
    # MSE = Bias^2 + Variance + Irreducible Noise Variance
    mse_d = bias_sq_d + variance_d + (NOISE_LEVEL ** 2)
    
    bias_squared_curve.append(bias_sq_d)
    variance_curve.append(variance_d)
    mse_curve.append(mse_d)

# ==========================================
# 5. VISUALIZATION USING MATPLOTLIB
# ==========================================
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

# Plot 1: Model Ensemble Plot
ax1.set_title(f"Model Fits Ensemble (Degree {SELECTED_DEGREE})", fontsize=12, fontweight='bold')

# Plot all trial fits with transparency to show variance
for trial in range(NUM_TRIALS):
    coeffs_trial = np.polyfit(sample_x if trial == 0 else np.random.uniform(X_MIN, X_MAX, SAMPLE_SIZE), 
                              sample_y if trial == 0 else true_function(np.random.uniform(X_MIN, X_MAX, SAMPLE_SIZE)) + np.random.normal(0, NOISE_LEVEL, SAMPLE_SIZE), 
                              SELECTED_DEGREE)
    ax1.plot(x_eval, np.polyval(coeffs_trial, x_eval), color='gray', alpha=0.1, linewidth=1)

# Plot the saved first trial's training data
ax1.scatter(sample_x, sample_y, color='#3b82f6', alpha=0.8, edgecolors='white', label='Training Sample (Trial 1)', zorder=5)

# Plot average prediction E[f_hat(x)]
mean_pred_selected = np.mean(predictions[SELECTED_DEGREE], axis=0)
ax1.plot(x_eval, mean_pred_selected, color='#f97316', linestyle='--', linewidth=2.5, label='Expected Fit E[f̂(x)]')

# Plot True target f(x)
ax1.plot(x_eval, y_true, color='#059669', linewidth=2.5, label='True Function f(x)')

ax1.set_ylim(-2.5, 2.5)
ax1.set_xlabel("Input variable (x)", fontsize=10)
ax1.set_ylabel("Target value (y)", fontsize=10)
ax1.grid(True, linestyle=':', alpha=0.6)
ax1.legend(loc='upper right')

# Plot 2: Bias-Variance Tradeoff Curves
degrees = list(range(MAX_DEGREE + 1))
ax2.set_title("Bias-Variance Tradeoff Curve", fontsize=12, fontweight='bold')
ax2.plot(degrees, bias_squared_curve, 'o-', color='#rose', label='Bias² (Underfitting error)', color='#ef4444', linewidth=2)
ax2.plot(degrees, variance_curve, 's-', color='#blue', label='Variance (Overfitting sensitivity)', color='#3b82f6', linewidth=2)
ax2.axhline(NOISE_LEVEL**2, color='#94a3b8', linestyle='--', label='Irreducible Noise (Var(e))')
ax2.plot(degrees, mse_curve, 'D-', color='#emerald', label='Total MSE (Prediction Error)', color='#10b981', linewidth=3)

# Highlight active degree
ax2.axvline(SELECTED_DEGREE, color='#3b82f6', linestyle=':', linewidth=2, label=f'Selected Complexity (d={SELECTED_DEGREE})')

ax2.set_xlabel("Model Complexity (Polynomial Degree)", fontsize=10)
ax2.set_ylabel("Error Magnitude", fontsize=10)
ax2.set_xticks(degrees)
ax2.grid(True, linestyle=':', alpha=0.6)
ax2.legend(loc='upper right')

plt.tight_layout()
print(f"Results for Polynomial Degree {SELECTED_DEGREE}:")
print(f"  - Bias Squared: {bias_squared_curve[SELECTED_DEGREE]:.4f}")
print(f"  - Variance:     {variance_curve[SELECTED_DEGREE]:.4f}")
print(f"  - Noise Floor:  {NOISE_LEVEL**2:.4f}")
print(f"  - Total MSE:    {mse_curve[SELECTED_DEGREE]:.4f}")

plt.show()
`;
}
