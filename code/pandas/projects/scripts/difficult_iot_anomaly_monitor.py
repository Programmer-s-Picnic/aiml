"""Difficult Project: IoT Anomaly Monitor
Data entry: MongoDB + JSONL + (optional) MySQL
Processing: Pandas (rolling stats, anomaly detection)
Charts: Matplotlib
Export: CSV + JSON + MongoDB + MySQL + PNG

Run with JSONL first, then enable Mongo/MySQL.
"""

import os
import json
import pandas as pd
import matplotlib.pyplot as plt
from sqlalchemy import create_engine
from pymongo import MongoClient

IN_JSONL = "../data/iot_readings.jsonl"

OUT_CSV = "../output/iot_anomalies.csv"
OUT_JSON = "../output/iot_anomalies.json"
OUT_PNG = "../output/iot_daily_temp_trend.png"

MONGO_URL = "mongodb://localhost:27017"
MONGO_DB = "pp_iot"
MONGO_COLLECTION_IN = "readings"
MONGO_COLLECTION_OUT = "anomalies"

MYSQL_URL = "mysql+pymysql://USER:PASSWORD@localhost:3306/DBNAME"
MYSQL_TABLE_OUT = "pp_iot_anomalies"


def load_from_jsonl(path: str) -> pd.DataFrame:
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return pd.DataFrame(rows)


def load_from_mongo() -> pd.DataFrame:
    client = MongoClient(MONGO_URL)
    col = client[MONGO_DB][MONGO_COLLECTION_IN]
    docs = list(col.find({}, {"_id": 0}))
    return pd.DataFrame(docs)


def export_to_mongo(df_out: pd.DataFrame):
    client = MongoClient(MONGO_URL)
    col = client[MONGO_DB][MONGO_COLLECTION_OUT]
    col.delete_many({})
    if len(df_out) > 0:
        col.insert_many(df_out.to_dict(orient="records"))
    print("MongoDB export ✅ collection:", MONGO_COLLECTION_OUT)


def export_to_mysql(df_out: pd.DataFrame):
    engine = create_engine(MYSQL_URL, pool_pre_ping=True)
    df_out.to_sql(MYSQL_TABLE_OUT, con=engine, if_exists="replace", index=False)
    print("MySQL export ✅ table:", MYSQL_TABLE_OUT)


def main():
    os.makedirs("../output", exist_ok=True)

    # Load input
    df = load_from_jsonl(IN_JSONL)
    # df = load_from_mongo()  # enable later

    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    df["ts"] = pd.to_datetime(df["ts"], errors="coerce")
    df = df.dropna(subset=["ts"]).sort_values(["sensor_id", "ts"]).reset_index(drop=True)

    for col in ["temp_c", "humidity", "vibration"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    window = 36  # 6 hours if 10-min data
    grp = df.groupby("sensor_id", group_keys=False)

    df["temp_mean"] = grp["temp_c"].apply(lambda s: s.rolling(window, min_periods=12).mean())
    df["temp_std"]  = grp["temp_c"].apply(lambda s: s.rolling(window, min_periods=12).std())
    df["temp_z"]    = (df["temp_c"] - df["temp_mean"]) / df["temp_std"]
    df["is_anomaly"] = df["temp_z"].abs() > 3

    anomalies = df[df["is_anomaly"]].copy()
    anomalies = anomalies[["ts", "sensor_id", "site", "temp_c", "temp_mean", "temp_std", "temp_z"]]

    anomalies.to_csv(OUT_CSV, index=False)
    anomalies.to_json(OUT_JSON, orient="records", indent=2)

    try:
        export_to_mongo(anomalies)
    except Exception as e:
        print("Mongo export skipped. Error:", e)

    try:
        export_to_mysql(anomalies)
    except Exception as e:
        print("MySQL export skipped (edit MYSQL_URL). Error:", e)

    sensor = df["sensor_id"].value_counts().index[0]
    one = df[df["sensor_id"] == sensor].set_index("ts").sort_index()
    daily = one["temp_c"].resample("D").mean()

    plt.figure()
    plt.plot(daily.index, daily.values, marker="o")
    plt.title(f"Daily Avg Temp Trend — {sensor}")
    plt.xlabel("Date")
    plt.ylabel("Temp (°C)")
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig(OUT_PNG, dpi=200)
    plt.show()

    print("Done ✅")
    print("Saved:", OUT_CSV, OUT_JSON, OUT_PNG)


if __name__ == "__main__":
    main()
