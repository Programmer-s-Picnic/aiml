# Stock Curve Fitting Lab

A browser-based TensorFlow.js program for parameter-weighted, multivariable polynomial regression on daily stock CSV data.

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
- Every input can use a fixed importance weight or a separate daily CSV weight column. TensorFlow receives `input value × parameter weight`.
- Add parameters from the available-column selector and remove them individually before training.
- Target: numeric column to fit, such as Close or NextDayClose.
- Whole-day weight: optional positive value controlling how strongly the complete daily observation influences training. This is separate from parameter weights.
- Label: optional date or timestamp used on the graph.
- Rows with missing/non-numeric selected values are ignored.

For future prediction, build the target in advance. Example: each row's `NextDayClose` should be tomorrow's close while its inputs contain only information known today. Do not include future data among the inputs; that would be data leakage.

## What the program does

- Generates all polynomial terms up to each chosen degree, including interactions.
- Applies the selected weight to every individual parameter before generating polynomial terms.
- Normalizes polynomial terms and the target using training data only.
- Trains weighted linear coefficients with TensorFlow.js and the Adam optimizer.
- Preserves chronological order by default and uses the final rows as test data.
- Compares train/test RMSE, test MAE, and test R².
- Draws fitted-series, training-loss, and actual-vs-predicted graphs.
- Allows manual predictions and exports fitted values as CSV.

## Practical guidance

Start with degrees 1, 2, and 3. A higher degree can produce a lower training error while performing worse on unseen rows. Prefer the model with lower test RMSE, then check whether its test R² and graph are sensible. Use more historical rows than the small demonstration CSV.

This program is educational. It is not investment advice and does not guarantee future stock prices.
