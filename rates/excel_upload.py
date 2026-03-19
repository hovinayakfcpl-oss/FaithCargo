import pandas as pd
from .models import RateMatrix


def upload_rate_excel(file):

    df = pd.read_excel(file)

    for _,row in df.iterrows():

        RateMatrix.objects.update_or_create(

        from_zone=row["from_zone"],
        to_zone=row["to_zone"],

        defaults={
        "rate":row["rate"]
        }

        )