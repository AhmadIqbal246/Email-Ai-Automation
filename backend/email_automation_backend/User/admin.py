from django.contrib import admin
from .models import User, Company, Invitation, EmailAccount

# Register your models here.
admin.site.register(User)
admin.site.register(Company)
admin.site.register(Invitation)
admin.site.register(EmailAccount)
