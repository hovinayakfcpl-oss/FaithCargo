from django.db import models

class CustomUser(models.Model):
    id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=50, unique=True)
    password = models.CharField(max_length=255)
    contact = models.CharField(max_length=15)

    class Meta:
        db_table = "users"   # ✅ existing MySQL table

    def __str__(self):
        return self.username
