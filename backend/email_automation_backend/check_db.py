import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'email_automation_backend.settings')
django.setup()

from django.db import connection

cursor = connection.cursor()
cursor.execute("PRAGMA table_info('hubspot_integration_hubspotaccount')")
print('HubSpotAccount table schema:')
for row in cursor.fetchall():
    print(f'{row[1]}: {row[2]} (null_allowed={row[3] == 0})')
