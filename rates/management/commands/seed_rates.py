from django.core.management.base import BaseCommand
from rates.models import RateMatrix

zones = ["N1","N2","N3","C1","W1","W2","S1","S2","E1","NE1","NE2"]

default_rates = [
[9,10.5,15.5,12,12,13.5,17.5,20,15.5,22,27],
[10,12.5,17.5,14,14,14,18,22,16.5,24.5,29.5],
[15,17.5,22.5,19,19,19,23,27,21.5,29.5,34.5],
[12.5,13.5,18.5,10.5,10.5,11.5,11.5,15,14.5,17,22],
[12.5,14,19,12.5,9.5,9.5,16.5,19.5,23,26,28],
[13.5,14.5,19.5,12,9.5,9,12.5,16.5,19.5,26.5,31.5],
[14,17.5,22.5,12,14,11.5,10,12,21.5,21,26],
[16.5,16.5,21.5,12,14,15.5,11,11.5,16.5,21,26],
[14,15.5,20.5,15.5,14.5,14,16.5,16,11,13.5,18.5],
[16,18,23,16,17,17,17,20,14,14,19],
[23,25,30,23,24,24,24,27,21,21,26]
]

class Command(BaseCommand):

    def handle(self, *args, **kwargs):

        for i, from_zone in enumerate(zones):

            for j, to_zone in enumerate(zones):

                RateMatrix.objects.update_or_create(
                    from_zone=from_zone,
                    to_zone=to_zone,
                    defaults={
                        "rate": default_rates[i][j]
                    }
                )

        print("Default Rate Matrix Loaded")