"""
Django settings for logistics_system project.
"""

from pathlib import Path
import os
import dj_database_url
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "django-insecure-change-this-key")
DEBUG = False

ALLOWED_HOSTS = ['*']

# CUSTOM USER MODEL
AUTH_USER_MODEL = 'accounts.CustomUser'

# DJANGO REST FRAMEWORK
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': None,
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
}

# INSTALLED APPS
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # third party
    'rest_framework',
    'corsheaders',  # ✅ CORS app
    'rest_framework.authtoken',
    'import_export',

    # custom apps
    'accounts',
    'vendors',
    'rates',
    'pickup',
    'pincode',
    'user_management',
    'signup',
    'shipments'
]

# ============================================
# ✅ MIDDLEWARE - FIXED (CORS must be FIRST)
# ============================================

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # ✅ MUST be VERY FIRST
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# ============================================
# ✅ CORS SETTINGS - COMPLETE
# ============================================

# Allow all origins (for testing - change in production)
CORS_ALLOW_ALL_ORIGINS = True

# Also specify specific origins
CORS_ALLOWED_ORIGINS = [
    "https://faith-cargo.vercel.app",
    "https://faith-cargo.vercel.app",  # both with and without trailing slash
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# ✅ CSRF Settings - Vercel URL added
CSRF_TRUSTED_ORIGINS = [
    "https://faith-cargo.vercel.app",
    "https://faithcargo.onrender.com",
    "http://localhost:3000",
]

# URL CONFIG
ROOT_URLCONF = 'logistics_system.urls'

# TEMPLATES
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# WSGI
WSGI_APPLICATION = 'logistics_system.wsgi.application'

# ============================================
# ✅ DATABASE (POSTGRESQL - RENDER)
# ============================================

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

# Fallback URL if environment variable not set
if not DATABASE_URL:
    DATABASE_URL = "postgresql://faithcargo_db_user:BBpJl41XxxrQ43mnodSSeQfiJrxuDzbi@dpg-d6voftfkijhs73cvfrfg-a.oregon-postgres.render.com/faithcargo_db"

DATABASES = {
    'default': dj_database_url.config(
        default=DATABASE_URL,
        conn_max_age=600,
        ssl_require=True
    )
}

# ============================================
# 📱 NOTIFICATION API KEYS (Free)
# ============================================

# Meta WhatsApp Cloud API (Free - 1000 conversations/month)
META_WHATSAPP_TOKEN = os.environ.get('META_WHATSAPP_TOKEN', '')
META_PHONE_NUMBER_ID = os.environ.get('META_PHONE_NUMBER_ID', '')
META_BUSINESS_ACCOUNT_ID = os.environ.get('META_BUSINESS_ACCOUNT_ID', '')

# Fast2SMS API (Free credits available)
FAST2SMS_API_KEY = os.environ.get('FAST2SMS_API_KEY', '')
FAST2SMS_SENDER_ID = os.environ.get('FAST2SMS_SENDER_ID', 'FTHCRG')

# Twilio API (Alternative)
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER', '')
TWILIO_WHATSAPP_NUMBER = os.environ.get('TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886')

# ============================================
# PASSWORD VALIDATION
# ============================================
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# LANGUAGE / TIME
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# STATIC FILES
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# DEFAULT PRIMARY KEY
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ============================================
# LOGGING CONFIGURATION
# ============================================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG',  # Changed to DEBUG for troubleshooting
    },
    'loggers': {
        'utils.notifications': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
        'corsheaders': {  # Added CORS logging
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}