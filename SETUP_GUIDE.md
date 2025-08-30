# AI Email Automation - Setup Guide

## 🎯 **System Overview**

Your AI-powered email automation system is now set up with:

### **User Account Structure:**
- **Company Admin**: Creates company, manages employees, sends invitations
- **Employee**: Connects email accounts, configures AI settings

### **Invitation Flow:**
1. Admin creates company account
2. Admin sends email invitations to employees 
3. Employees receive invitation email with unique token
4. Employees click link to signup and join company
5. Employees connect their email accounts for automation

## 🔧 **What's Been Configured**

### **Backend (Django)**
✅ **Models Created:**
- `Company` - Company information and HubSpot integration
- `User` - Extended user model with roles
- `Invitation` - Token-based invitation system with email delivery
- `EmailAccount` - Connected email accounts for users

✅ **API Endpoints:**
- `/api/auth/company-signup/` - Company admin registration
- `/api/auth/employee-signup/` - Employee registration via invitation
- `/api/auth/login/` - Email/password login
- `/api/auth/verify-invitation/` - Verify invitation tokens
- `/api/admin/send-invitation/` - Send employee invitations
- `/api/admin/employees/` - Get company employees
- `/api/admin/invitations/` - Get pending invitations

✅ **Email Integration:**
- SMTP configured with your Gmail credentials
- Invitation emails sent automatically
- Email: ahmadiqbalhsp@gmail.com

### **Frontend (React)**
✅ **Pages Created:**
- Login page with email/password authentication
- Company signup form
- Employee invitation signup
- Admin dashboard for employee management
- Employee dashboard for email connection

✅ **Authentication:**
- Token-based authentication
- Role-based routing
- Protected routes for admin/employee areas

## 🚀 **How to Start the System**

### **1. Start Backend Server**
```bash
cd "D:\AI powered Email Automation\backend\email_automation_backend"
python manage.py runserver 8000
```

### **2. Start Frontend Server**
```bash
cd "D:\AI powered Email Automation\frontend"
npm run dev
```

### **3. Access the Application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/

## 📧 **Testing the Complete Flow**

### **Step 1: Create Company Account**
1. Go to: http://localhost:5173/signup/company
2. Fill in company details:
   - Company Name: "Your Company"
   - Company Domain: "yourcompany.com"  
   - Admin details (name, email, password)
   - Optional: HubSpot API key

### **Step 2: Send Employee Invitation**
1. After company creation, you'll be in Admin Dashboard
2. Click "Invite Employee" button
3. Enter employee email address
4. System will send invitation email to that address

### **Step 3: Employee Accepts Invitation** 
1. Employee receives email with invitation link
2. Employee clicks link: http://localhost:5173/signup/employee?token=abc123
3. Employee fills signup form (name, username, password)
4. Employee account created and linked to company

### **Step 4: Employee Connects Email Account**
1. Employee logs in and goes to dashboard
2. Clicks "Connect Email Account"  
3. Authenticates with email provider OAuth
4. Email account connected for AI automation

## 🔐 **Credentials Configuration**

Your credentials are already configured in the .env files:

### **Backend Environment Variables:**
- Django Secret Key: ✅ Set
- Gmail SMTP: ✅ ahmadiqbalhsp@gmail.com
- Email sending: ✅ Ready

### **Frontend Environment Variables:**
- API URL: ✅ http://localhost:8000

## 🧪 **Test Data Created**

I've created test data for you to verify the system:

- **Test Company**: Test Company Inc (testcompany.com)
- **Test Admin**: admin@testcompany.com / password: admin123
- **Test Invitation Token**: Available in test script output

## 🐛 **Troubleshooting**

### **If Django server won't start:**
```bash
python manage.py check
python manage.py migrate
```

### **If frontend won't start:**
```bash
npm install
npm run dev
```

### **If email sending fails:**
- Check Gmail credentials in backend/.env
- Ensure Gmail "App Password" is used (not regular password)
- Verify SMTP settings



## 🎯 **Next Development Steps**

1. **Email Processing**: Integrate with email APIs to read incoming emails
2. **AI Integration**: Add OpenAI API for email content analysis
3. **HubSpot Integration**: Sync contacts and interactions
4. **Email Templates**: Create AI response templates
5. **Real-time Notifications**: WebSocket for live updates

## 📁 **Project Structure**

```
D:\AI powered Email Automation\
├── backend/
│   └── email_automation_backend/
│       ├── .env                    # Your credentials
│       ├── manage.py
│       ├── requirements.txt        # Python dependencies  
│       ├── User/                   # User management app
│       │   ├── models.py           # User, Company, Invitation models
│       │   ├── views.py            # API endpoints
│       │   ├── serializers.py      # DRF serializers
│       │   └── urls.py             # URL routing
│       └── email_automation_backend/
│           └── settings.py         # Django configuration
└── frontend/
    ├── .env                        # Frontend config
    ├── package.json               # Node dependencies
    ├── src/
    │   ├── App.jsx                # Main app with routing
    │   ├── components/
    │   │   ├── auth/              # Login/signup pages
    │   │   ├── admin/             # Admin dashboard
    │   │   ├── employee/          # Employee dashboard
    │   │   └── common/            # Shared components
    │   └── hooks/                 # Custom hooks
    └── index.html                 # Main HTML file
```

Your system is ready for testing! 🎉
