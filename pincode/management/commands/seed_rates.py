from django.core.management.base import BaseCommand
from rates.models import RateMatrix
from pincode.models import Charges


class Command(BaseCommand):

    help = "Seed RateMatrix and Charges data"

    def handle(self, *args, **kwargs):

        rates = [

            ("N1","N1",9),("N1","N2",10.5),("N1","N3",15.5),("N1","C1",12),("N1","W1",12),("N1","W2",13.5),
            ("N1","S1",17.5),("N1","S2",20),("N1","E1",15.5),("N1","NE1",22),("N1","NE2",27),

            ("N2","N1",10.5),("N2","N2",9),("N2","N3",12),("N2","C1",11),("N2","W1",12),("N2","W2",13.5),
            ("N2","S1",17.5),("N2","S2",20),("N2","E1",15.5),("N2","NE1",22),("N2","NE2",27),

            ("N3","N1",15.5),("N3","N2",12),("N3","N3",9),("N3","C1",11),("N3","W1",12),("N3","W2",13.5),
            ("N3","S1",17.5),("N3","S2",20),("N3","E1",15.5),("N3","NE1",22),("N3","NE2",27),

            ("C1","N1",12),("C1","N2",11),("C1","N3",11),("C1","C1",9),("C1","W1",12),("C1","W2",13.5),
            ("C1","S1",17.5),("C1","S2",20),("C1","E1",15.5),("C1","NE1",22),("C1","NE2",27),

            ("W1","N1",12),("W1","N2",12),("W1","N3",12),("W1","C1",12),("W1","W1",9),("W1","W2",13.5),
            ("W1","S1",17.5),("W1","S2",20),("W1","E1",15.5),("W1","NE1",22),("W1","NE2",27),

            ("W2","N1",13.5),("W2","N2",13.5),("W2","N3",13.5),("W2","C1",13.5),("W2","W1",13.5),("W2","W2",9),
            ("W2","S1",17.5),("W2","S2",20),("W2","E1",15.5),("W2","NE1",22),("W2","NE2",27),

            ("S1","N1",17.5),("S1","N2",17.5),("S1","N3",17.5),("S1","C1",17.5),("S1","W1",17.5),("S1","W2",17.5),
            ("S1","S1",9),("S1","S2",12),("S1","E1",15.5),("S1","NE1",22),("S1","NE2",27),

            ("S2","N1",20),("S2","N2",20),("S2","N3",20),("S2","C1",20),("S2","W1",20),("S2","W2",20),
            ("S2","S1",12),("S2","S2",9),("S2","E1",15.5),("S2","NE1",22),("S2","NE2",27),

            ("E1","N1",15.5),("E1","N2",15.5),("E1","N3",15.5),("E1","C1",15.5),("E1","W1",15.5),("E1","W2",15.5),
            ("E1","S1",15.5),("E1","S2",15.5),("E1","E1",9),("E1","NE1",22),("E1","NE2",27),

            ("NE1","N1",22),("NE1","N2",22),("NE1","N3",22),("NE1","C1",22),("NE1","W1",22),("NE1","W2",22),
            ("NE1","S1",22),("NE1","S2",22),("NE1","E1",22),("NE1","NE1",9),("NE1","NE2",27),

            ("NE2","N1",27),("NE2","N2",27),("NE2","N3",27),("NE2","C1",27),("NE2","W1",27),("NE2","W2",27),
            ("NE2","S1",27),("NE2","S2",27),("NE2","E1",27),("NE2","NE1",27),("NE2","NE2",9),
        ]


        created_count = 0
        updated_count = 0


        for fz, tz, rate in rates:

            obj, created = RateMatrix.objects.update_or_create(

                from_zone=fz,
                to_zone=tz,
                defaults={"rate": rate}

            )

            if created:
                created_count += 1
            else:
                updated_count += 1


        Charges.objects.update_or_create(

            id=1,

            defaults={

                "min_freight":600,
                "docket_charge":50,
                "fuel_percent":15,
                "fov_charge":75,
                "oda_per_kg":3,
                "oda_min":650,
                "cod_percent":0.25,
                "cod_min":150,
                "handling_100_400":2,
                "handling_above_400":4,
                "appointment_per_kg":4,
                "appointment_min":1250,
                "cft":4500

            }

        )


        self.stdout.write(self.style.SUCCESS(

            f"RateMatrix seeded: {RateMatrix.objects.count()} records"

        ))