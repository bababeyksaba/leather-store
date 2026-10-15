import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")


SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "local-development-only-change-before-deployment",
)

DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() == "true"

if not DEBUG and not os.getenv("DJANGO_SECRET_KEY"):
    raise RuntimeError("DJANGO_SECRET_KEY must be set")


ALLOWED_HOSTS = os.getenv(
    "DJANGO_ALLOWED_HOSTS",
    "localhost,127.0.0.1",
).split(",")


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",

    "carts.apps.CartsConfig",
    "products.apps.ProductsConfig",
    "users.apps.UsersConfig",
    "orders.apps.OrdersConfig",
]


REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": (
        "rest_framework.pagination.PageNumberPagination"
    ),
    "PAGE_SIZE": 12,
}


MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "config.urls"


TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


WSGI_APPLICATION = "config.wsgi.application"


DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "leather_store"),
        "USER": os.getenv("POSTGRES_USER", "postgres"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", ""),
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
    }
}


AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        )
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "MinimumLengthValidator"
        )
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "CommonPasswordValidator"
        )
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "NumericPasswordValidator"
        )
    },
]


LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"

USE_I18N = True
USE_TZ = True


STATIC_URL = "static/"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"


DEFAULT_AUTO_FIELD = "django.db.models.AutoField"


CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


# SMS / OTP provider. Keep the access hash out of source control.
OTP_BACKEND = os.getenv("OTP_BACKEND", "trez").strip().lower()

TREZ_ACCESS_HASH = os.getenv("TREZ_ACCESS_HASH", "").strip()

TREZ_PHONE_NUMBER = os.getenv(
    "TREZ_PHONE_NUMBER",
    "5000222222100",
).strip()

TREZ_PATTERN_ID = os.getenv(
    "TREZ_PATTERN_ID",
    "d37bbc13-085b-4170-bd53-9af9c5c29351",
).strip()

TREZ_TIMEOUT_SECONDS = 10


SUPPORT_WHATSAPP = os.getenv("SUPPORT_WHATSAPP", "")
SUPPORT_INSTAGRAM = os.getenv("SUPPORT_INSTAGRAM", "")


SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = not DEBUG

CSRF_COOKIE_SECURE = not DEBUG


PAYMENT_BACKEND = os.getenv("PAYMENT_BACKEND", "test").strip().lower()
ORDER_RESERVATION_MINUTES = 15

if "store.apps.StoreConfig" not in INSTALLED_APPS:
    INSTALLED_APPS.append("store.apps.StoreConfig")


LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "otp_console": {
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout",
            "level": "WARNING",
        },
    },
    "loggers": {
        "users": {
            "handlers": ["otp_console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}
# DigiPay UPG — staged integration (off until explicitly enabled).
DIGIPAY_ENABLED = os.getenv("DIGIPAY_ENABLED", "false").lower() == "true"
DIGIPAY_CLIENT_ID = os.getenv("DIGIPAY_CLIENT_ID", "").strip()
DIGIPAY_CLIENT_SECRET = os.getenv("DIGIPAY_CLIENT_SECRET", "").strip()
DIGIPAY_USERNAME = os.getenv("DIGIPAY_USERNAME", "").strip()
DIGIPAY_PASSWORD = os.getenv("DIGIPAY_PASSWORD", "").strip()
DIGIPAY_ENVIRONMENT = os.getenv("DIGIPAY_ENVIRONMENT", "staging").strip().lower()
DIGIPAY_AMOUNT_UNIT = os.getenv("DIGIPAY_AMOUNT_UNIT", "").strip().lower()
DIGIPAY_CALLBACK_URL = os.getenv("DIGIPAY_CALLBACK_URL", "").strip()
DIGIPAY_RETURN_URL = os.getenv("DIGIPAY_RETURN_URL", "").strip()
# Single-vendor merchant-defined IDs: generate once and keep stable across orders.
# Acceptance of merchant IDs and category taxonomy must be tested with DigiPay.
DIGIPAY_SELLER_ID = os.getenv("DIGIPAY_SELLER_ID", "").strip()
DIGIPAY_SUPPLIER_ID = os.getenv("DIGIPAY_SUPPLIER_ID", "").strip()
DIGIPAY_CATEGORY_ID = os.getenv("DIGIPAY_CATEGORY_ID", "").strip()
DIGIPAY_PRODUCT_TYPE = os.getenv("DIGIPAY_PRODUCT_TYPE", "").strip()
DIGIPAY_BRAND = os.getenv("DIGIPAY_BRAND", "").strip()
DIGIPAY_STORE_AMOUNT_UNIT = os.getenv("DIGIPAY_STORE_AMOUNT_UNIT", "").strip().lower()