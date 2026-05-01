"""Moderate Project: Sales & Customers Dashboard
Data entry: CSV + JSON + (optional) MySQL
Processing: Pandas (joins, groupby KPIs)
Charts: Matplotlib
Export: CSV + JSON + MySQL + PNG

Edit MYSQL_URL before using database export.
"""

import os
import pandas as pd
import matplotlib.pyplot as plt
from sqlalchemy import create_engine

ORDERS_CSV = "../data/orders.csv"
CUSTOMERS_JSON = "../data/customers.json"

OUT_CSV = "../output/moderate_city_revenue.csv"
OUT_JSON = "../output/moderate_top_products.json"
OUT_PNG = "../output/moderate_revenue_by_city.png"

MYSQL_URL = "mysql+pymysql://USER:PASSWORD@localhost:3306/DBNAME"
MYSQL_TABLE = "pp_city_revenue"


def main():
    os.makedirs("../output", exist_ok=True)

    orders = pd.read_csv(ORDERS_CSV, parse_dates=["order_date"])
    customers = pd.read_json(CUSTOMERS_JSON)

    orders.columns = [c.strip().lower().replace(" ", "_") for c in orders.columns]
    customers.columns = [c.strip().lower().replace(" ", "_") for c in customers.columns]

    orders["qty"] = pd.to_numeric(orders["qty"], errors="coerce").fillna(0)
    orders["unit_price"] = pd.to_numeric(orders["unit_price"], errors="coerce").fillna(0)
    orders["revenue"] = orders["qty"] * orders["unit_price"]

    df = orders.merge(customers, on="customer_id", how="left")
    df2 = df[df["status"].isin(["PAID", "SHIPPED"])].copy()

    revenue_by_city = df2.groupby("city")["revenue"].sum().sort_values(ascending=False)
    top_products = df2.groupby("product")["revenue"].sum().sort_values(ascending=False).head(10)

    revenue_by_city.to_csv(OUT_CSV)
    top_products.reset_index().to_json(OUT_JSON, orient="records", indent=2)

    # MySQL export (optional)
    try:
        engine = create_engine(MYSQL_URL, pool_pre_ping=True)
        revenue_by_city.reset_index().to_sql(MYSQL_TABLE, con=engine, if_exists="replace", index=False)
        print(f"MySQL export ✅ table='{MYSQL_TABLE}'")
    except Exception as e:
        print("MySQL export skipped (edit MYSQL_URL). Error:", e)

    plt.figure()
    plt.bar(revenue_by_city.index, revenue_by_city.values)
    plt.title("Revenue by City (PAID + SHIPPED)")
    plt.xlabel("City")
    plt.ylabel("Revenue")
    plt.tight_layout()
    plt.savefig(OUT_PNG, dpi=200)
    plt.show()

    print("Done ✅")
    print("Saved:", OUT_CSV, OUT_JSON, OUT_PNG)


if __name__ == "__main__":
    main()
