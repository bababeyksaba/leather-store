راه‌اندازی فرانت فروشگاه چرم

پوشه frontend را کنار backend بگذارید. این بسته به API واقعی پروژه شما وصل می‌شود و داده ساختگی ندارد.

۱) Node.js نسخه ۲۰.۹ یا جدیدتر نصب باشد.
۲) در Django، config/settings.py، مقادیر زیر را با تنظیمات موجود ادغام کنید:
ALLOWED_HOSTS = ["127.0.0.1", "localhost"]
CSRF_TRUSTED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
در توسعه محلی HTTP، SESSION_COOKIE_SECURE و CSRF_COOKIE_SECURE باید False باشند و Domain کوکی‌ها مشخص نشده باشد.
SessionMiddleware و CsrfViewMiddleware باید فعال باشند. فایل‌های carts بسته قبلی باید نصب شده باشند.
در پروژه واقعی دارای دامنه، تنظیمات امن فعلی را حذف نکنید؛ دامنه فرانت را اضافه کنید.

۳) ترمینال اول در backend:
.\.venv314\Scripts\python.exe manage.py runserver

۴) ترمینال دوم در frontend:
Copy-Item .env.example .env.local
npm install
npm run dev

۵) آدرس http://localhost:3000 را باز کنید. محصول فعال با دسته فعال و موجودی کافی در پنل Django داشته باشید.
در کارت محصول تعداد را انتخاب کنید و افزودن به سبد را بزنید، سپس سبد خرید را باز کنید.

مسیرهای مورد انتظار Django:
GET /api/products/ (آرایه یا خروجی صفحه‌بندی استاندارد DRF)
GET /api/cart/ (دارای csrf_token)
POST /api/cart/items/<id>/ با quantity
DELETE /api/cart/items/<id>/delete/

تمام درخواست‌ها به مسیر واسط /api در Next.js می‌روند؛ کوکی‌ها و CSRF منتقل می‌شوند و نیازی به CORS برای این معماری نیست.
فرانت قیمت‌ها را تغییر واحد نمی‌دهد. اگر دیتابیس تومان است، متن «واحد قیمت فروشگاه» را به «تومان» تغییر دهید.
این نسخه صفحه محصولات، جستجو، صفحه‌بندی استاندارد، انتخاب تعداد، افزودن و حذف نرم دارد؛ ویرایش تعداد، پرداخت و ثبت سفارش ندارد.
سبد PowerShell و مرورگر جداست. افزودن موجودی را رزرو نمی‌کند.
تصاویر با مسیر /media/ از واسط دریافت می‌شوند. Django باید در محیط توسعه MEDIA_URL و MEDIA_ROOT را سرو کند.
اگر فیلد image در API وجود ندارد، جای تصویر نمایش داده می‌شود.
اگر پورت فرانت عوض شد، CSRF_TRUSTED_ORIGINS را متناسب با آن تغییر دهید.

بررسی ساخت:
npm run build
