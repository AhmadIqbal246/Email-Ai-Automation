# HubSpot Integration - Simplified Architecture

## Overview

The HubSpot integration has been refactored to use a **clean, simple architecture** where:

1. **Models contain only fields** (no nested classes or methods)
2. **Constants are centralized** in a dedicated file
3. **Utility functions are separated** into their own module
4. **Backward compatibility is maintained** through dynamic patching

## File Structure

```
hubspot_integration/
├── models.py          # Simple models with just fields
├── constants.py       # All status constants and choices
├── utils.py           # Helper functions and model patching
├── services.py        # Business logic and API interactions
├── views.py           # API endpoints
├── tasks.py           # Celery background tasks
├── serializers.py     # DRF serializers
└── apps.py            # App configuration with model patching
```

## Architecture Details

### 1. Simple Models (`models.py`)

The models now contain **only field definitions**:

```python
class HubSpotAccount(models.Model):
    """HubSpot account connection for users"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='hubspot_account')
    # ... other fields only
```

**Benefits:**
- ✅ Clean and readable
- ✅ Easy to understand
- ✅ No complex nested structures
- ✅ Pure data models

### 2. Centralized Constants (`constants.py`)

All status constants are now centralized:

```python
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
```

### 3. Utility Functions (`utils.py`)

All helper functions are centralized:

```python
def is_token_expired(hubspot_account):
    """Check if HubSpot account token is expired"""
    if not hubspot_account.token_expires_at:
        return True
    return timezone.now() >= hubspot_account.token_expires_at

def log_success(hubspot_account, operation_type, contact_email='', ...):
    """Log a successful HubSpot operation"""
    # Implementation here
```

### 4. Dynamic Model Patching (`apps.py`)

The app automatically patches methods onto models for **backward compatibility**:

```python
class HubspotIntegrationConfig(AppConfig):
    def ready(self):
        from .utils import patch_model_methods
        patch_model_methods()
```

All operations now use simple string constants and direct function calls:

```python
# Simple, direct approach
hubspot_account.status = 'connected'
is_connected(hubspot_account)
log_success(hubspot_account, 'create_contact', ...)
```

## Usage Examples

### Using String Constants Directly

```python
# Set status using simple strings
account.status = 'connected'
contact.sync_status = 'pending'
```

### Using Utility Functions

```python
from hubspot_integration.utils import is_connected, log_success

# Check connection
if is_connected(hubspot_account):
    print("Account is connected!")

# Log operations
log_success(hubspot_account, 'create_contact', email='test@example.com')
```

### Simple Direct Usage

All code now uses direct function calls and string constants:

```python
# Simple, direct approach
from hubspot_integration.utils import is_connected, log_success

if is_connected(hubspot_account):
    contact.sync_status = 'pending'
    
log_success(
    hubspot_account,
    'create_contact',
    contact_email=email
)
```

## Migration Guide

**Updated approach:** All code now uses simple string constants and direct function calls instead of nested classes and model methods.

## Benefits of New Architecture

### ✅ **Simplified Models**
- Models are clean with just field definitions
- No complex nested structures
- Easy to read and understand

### ✅ **Better Organization**
- Constants centralized in one place
- Utility functions separated from models
- Clear separation of concerns

### ✅ **Maintainability** 
- Changes to constants/utilities don't affect models
- Easy to locate and modify specific functionality
- Consistent patterns across the codebase

### ✅ **Simplified API**
- Direct string constants instead of nested classes
- Simple function calls instead of model methods
- Cleaner, more readable code

### ✅ **Testing**
- Individual components can be tested in isolation
- Constants and utilities are easily testable
- Model patching is verified automatically

## Testing

Run the test script to verify everything works:

```bash
python backend/test_hubspot_setup.py
```

This verifies:
- ✅ String constants work correctly
- ✅ Utility functions are available
- ✅ Models contain only field definitions
- ✅ Services use direct function calls

## Key Files Updated

1. **`models.py`** - Simplified to just fields
2. **`constants.py`** - New file with all constants
3. **`utils.py`** - New file with utility functions and patching
4. **`apps.py`** - Updated to patch model methods on app ready
5. **`services.py`** - Updated imports to use new constants
6. **`tasks.py`** - Updated imports to use new constants

The architecture now follows the **Single Responsibility Principle** while maintaining full backward compatibility!
