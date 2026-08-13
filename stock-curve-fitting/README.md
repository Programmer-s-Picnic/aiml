# Stock Curve Fitting Lab

A browser-based TensorFlow.js training system for multivariable polynomial stock regression. It jointly learns fitted-curve coefficients and normalized, non-negative input-importance weights.

## Run

The application loads TensorFlow.js and Chart.js from a CDN, so an internet connection is needed on first load.

1. Extract the ZIP.
2. Start a local web server in the extracted folder. For example:
   `python -m http.server 8000`
3. Open `http://localhost:8000`.
4. Click **Load sample data** or choose your own CSV.

Opening `index.html` directly may work for uploaded files, but a local server is recommended because browsers often block loading the bundled sample CSV from a `file://` address.

## CSV design

- First row: unique column names.
- Each row represents one date/day.
- Inputs: factors such as CoalPrice, SteelPrice, USDINR, CrudeOil and Volume.
- Every input receives one importance weight entered once in the interface. That same weight applies to all records. CSV weight columns are neither needed nor used.
- Add parameters from the available-column selector and remove them individually before training.
- Outputs: add one or more numeric output columns, such as TargetClose, TargetHigh and TargetLow. The program trains and selects a separate model for every output.
- Label: optional date or timestamp used on the graph.
- Rows with missing/non-numeric selected values are ignored.

For future prediction, build the target in advance. Example: each row's `NextDayClose` should be tomorrow's close while its inputs contain only information known today. Do not include future data among the inputs; that would be data leakage.

## What the program does

- Splits rows into training, validation and untouched test sets (chronologically by default).
- Generates all polynomial terms up to each chosen degree, including interactions.
- In **Learn optimized weights** mode, the one-time weights initialize jointly trained polynomial coefficients and softmax parameter gates. Gates are non-negative and normalized to average 1; curve L2 regularization resolves the otherwise ambiguous scaling between gates and coefficients.
- In **Use configured weights** mode, uses each one-time parameter weight unchanged for every day.
- Normalizes inputs and the target using training data only.
- Selects the best degree by validation RMSE, then reports its final untouched-test RMSE, MAE and R².
- Displays learned parameter weights separately for every output and exports all results.
- Draws fitted-series, training-loss, and actual-vs-predicted graphs.
- Allows manual predictions and exports fitted values as CSV.

## Practical guidance

Start with degrees 1, 2, and 3. The validation set chooses the degree; do not choose a model by its test score. Use substantially more historical rows than the small demonstration CSV. Learned weights describe this dataset and model, not causal influence.

This program is educational. It is not investment advice and does not guarantee future stock prices.
