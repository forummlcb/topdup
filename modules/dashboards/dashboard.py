import sys
from datetime import datetime
from urllib.parse import urlparse

import altair as alt
import datapane as dp
import pandas as pd
from sqlalchemy import create_engine


class Engine:
    def __init__(self, url: str):
        self.engine = create_engine(url)

    def query(self, sql_str: str) -> pd.DataFrame:
        """Executes a sql script."""
        return pd.read_sql(con=self.engine, sql=sql_str)


def process_posts_per_domain(engine):
    sql = """SELECT url from post_dataset"""
    df = engine.query(sql)
    # get domain from url https://stackoverflow.com/a/56476496/11871829
    df["domain"] = df["url"].apply(lambda x: urlparse(x).netloc)
    return df["domain"].value_counts().rename_axis("domain").reset_index(name="count")


def process_posts_per_day(engine):
    sql = """
        select
        DATE(updated) as date,
        count(*) as count
        from "document" d
        group by date
        order by date
    """
    df_date = engine.query(sql)
    df_date["date"] = pd.to_datetime(df_date["date"])
    # fill the gap by 0
    r = pd.date_range(start=df_date["date"].min(), end=pd.Timestamp.today())
    df_date = (
        df_date.set_index("date").reindex(r).fillna(0).rename_axis("date").reset_index()
    )
    base = alt.Chart(df_date).encode(x="date").mark_area().interactive().properties()
    graph = base.encode(y="count")
    graph.properties(width=500)
    return graph


def process_sim_score_table(engine):
    sql = """
        select
        "domain_A",
        "domain_B",
        "title_A" ,
        "title_B",
        cast(sim_score as float) as sim_score
        from similar_docs
        order by sim_score desc
    """
    df_sim = engine.query(sql)
    graph = (
        alt.Chart(df_sim)
        .mark_bar()
        .encode(alt.X("sim_score:Q", bin=alt.Bin(maxbins=100)), y="count()")
        .properties(width=1000, height=400)
    )
    return (df_sim, graph)


def run(db_url):
    engine = Engine(db_url)
    graph_posts_per_day = process_posts_per_day(engine)
    post_per_day_caption = (
        "Number of posts updated per day" f"(updated {str(datetime.now())})"
    )
    df_posts_per_domain = process_posts_per_domain(engine)
    df_domain_sim, graph_domain_sim_score = process_sim_score_table(engine)
    report = dp.Report(
        dp.Plot(graph_posts_per_day, caption=post_per_day_caption),
        dp.DataTable(df_posts_per_domain, caption="Number of posts per domain"),
        dp.DataTable(df_domain_sim, caption="Simplified similar_docs table"),
        dp.Plot(graph_domain_sim_score, caption="Similarity score histogram (>= 0.5)"),
    )
    report.publish(name="TopDup monitoring table", open=True)


if __name__ == "__main__":
    db_url = sys.argv[1]
    run(sys.argv[1])
