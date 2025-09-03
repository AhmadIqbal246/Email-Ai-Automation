# HubSpot Integration Constants
# All status constants and choices for HubSpot integration

# HubSpotAccount connection status constants
class ConnectionStatus:
    CONNECTED = 'connected'
    DISCONNECTED = 'disconnected'
    ERROR = 'error'
    EXPIRED = 'expired'
    
    CHOICES = [
        (CONNECTED, 'Connected'),
        (DISCONNECTED, 'Disconnected'),
        (ERROR, 'Error'),
        (EXPIRED, 'Token Expired'),
    ]


# HubSpotContact sync status constants
class SyncStatus:
    PENDING = 'pending'
    SYNCED = 'synced'
    FAILED = 'failed'
    UPDATED = 'updated'
    
    CHOICES = [
        (PENDING, 'Pending'),
        (SYNCED, 'Synced'),
        (FAILED, 'Failed'),
        (UPDATED, 'Updated'),
    ]


# HubSpotSyncLog operation type constants
class OperationType:
    CREATE_CONTACT = 'create_contact'
    UPDATE_CONTACT = 'update_contact'
    CREATE_COMPANY = 'create_company'
    TOKEN_REFRESH = 'token_refresh'
    
    CHOICES = [
        (CREATE_CONTACT, 'Create Contact'),
        (UPDATE_CONTACT, 'Update Contact'),
        (CREATE_COMPANY, 'Create Company'),
        (TOKEN_REFRESH, 'Token Refresh'),
    ]


# HubSpotSyncLog status constants
class LogStatus:
    SUCCESS = 'success'
    FAILED = 'failed'
    RETRY = 'retry'
    
    CHOICES = [
        (SUCCESS, 'Success'),
        (FAILED, 'Failed'),
        (RETRY, 'Retry'),
    ]


# For backward compatibility - provide nested class access pattern
class HubSpotAccountCompat:
    class ConnectionStatus(ConnectionStatus):
        pass


class HubSpotContactCompat:
    class SyncStatus(SyncStatus):
        pass


class HubSpotSyncLogCompat:
    class OperationType(OperationType):
        pass
    
    class Status(LogStatus):
        pass
