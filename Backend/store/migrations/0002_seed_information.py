from django.db import migrations

def seed(apps, schema_editor):
    Page = apps.get_model("store", "ContentPage")
    Settings = apps.get_model("store", "StoreSettings")
    db = schema_editor.connection.alias
    Settings.objects.using(db).get_or_create(pk=1)
    pages = [
        ("about", "دربارهٔ ما", "در فروشگاه چرم می‌توانید محصولات را با رنگ و اندازهٔ دلخواه انتخاب کنید. مشخصات، تصاویر و راهنمای نگهداری هر محصول در صفحهٔ آن قرار دارد."),
        ("contact", "تماس با ما", "برای پرسش دربارهٔ محصولات یا پیگیری سفارش، از راه‌های ارتباطی فروشگاه استفاده کنید."),
        ("shipping", "ارسال سفارش", "روش ارسال و هزینهٔ آن پیش از ثبت سفارش نمایش داده می‌شود. وضعیت آماده‌سازی و کد رهگیری را در بخش سفارش‌های حساب کاربری مشاهده کنید."),
        ("returns", "پیگیری و مرجوعی", "برای بررسی مشکل محصول یا درخواست مرجوعی، شمارهٔ سفارش و توضیح درخواست خود را برای پشتیبانی ارسال کنید. شرایط و هماهنگی ارسال مجدد از طریق پشتیبانی اعلام می‌شود."),
        ("care", "راهنمای نگهداری", "راهنمای مخصوص محصول را در صفحهٔ همان محصول بخوانید. برای انتخاب روش تمیز کردن یا محصول مراقبتی مناسب، جنس چرم و دستور سازنده را در نظر بگیرید."),
    ]
    for slug, title, body in pages:
        Page.objects.using(db).get_or_create(slug=slug, defaults={"title": title, "body": body})

class Migration(migrations.Migration):
    dependencies = [("store", "0001_initial")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
