"""Easy Project: Expense Tracker Analytics
Data entry: CSV + JSON
Processing: Pandas
Charts: Matplotlib
Export: CSV + JSON + PNG
"""

import os
import pandas as pd
import matplotlib.pyplot as plt

INPUT_CSV = "../data/expenses.csv"
INPUT_JSON = "../data/expenses_sample.json"

OUT_CSV = "../output/easy_category_summary.csv"
OUT_JSON = "../output/easy_monthly_summary.json"
OUT_PNG = "../output/easy_spend_by_category.png"


def main():
    os.makedirs("../output", exist_ok=True)

    df = pd.read_csv(INPUT_CSV, parse_dates=["date"])
    j = pd.read_json(INPUT_JSON)
    j["date"] = pd.to_datetime(j["date"], errors="coerce")
    df = pd.concat([df, j], ignore_index=True)

    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0)
    df["month"] = df["date"].dt.to_period("M").astype(str)

    by_category = df.groupby("category")["amount"].sum().sort_values(ascending=False)
    monthly = df.groupby("month")["amount"].sum().reset_index().rename(columns={"amount": "total_amount"})

    by_category.to_csv(OUT_CSV)
    monthly.to_json(OUT_JSON, orient="records", indent=2)

    plt.figure()
    plt.bar(by_category.index, by_category.values)
    plt.title("Total Spend by Category")
    plt.xlabel("Category")
    plt.ylabel("Amount")
    plt.xticks(rotation=25, ha="right")
    plt.tight_layout()
    plt.savefig(OUT_PNG, dpi=200)
    plt.show()

    print("Done ✅")
    print("Saved:", OUT_CSV, OUT_JSON, OUT_PNG)


if __name__ == "__main__":
    main()
