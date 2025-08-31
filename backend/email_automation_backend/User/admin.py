from django.contrib import admin
from .models import EmailAccount, EmailMessage, EmailFetchLog

# Register your models here.
admin.site.register(EmailAccount)
admin.site.register(EmailMessage)
admin.site.register(EmailFetchLog)
