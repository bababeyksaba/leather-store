from django.db import models

class StoreSettings(models.Model):
    name = models.CharField(max_length=100, default="فروشگاه چرم", verbose_name="نام فروشگاه")
    phone = models.CharField(max_length=30, blank=True, verbose_name="تلفن")
    email = models.EmailField(blank=True)
    whatsapp = models.CharField(max_length=20, blank=True, verbose_name="شماره واتساپ")
    instagram = models.CharField(max_length=100, blank=True, verbose_name="آیدی اینستاگرام")
    address = models.TextField(blank=True, verbose_name="آدرس فروشگاه")
    hours = models.CharField(max_length=200, blank=True, verbose_name="ساعات پاسخ‌گویی")
    price_unit = models.CharField(max_length=30, default="واحد قیمت فروشگاه", verbose_name="واحد مبالغ")

    def save(self, *args, **kwargs):
        self.pk = 1
        return super().save(*args, **kwargs)

    class Meta:
        verbose_name = "تنظیمات فروشگاه"
        verbose_name_plural = "تنظیمات فروشگاه"
    def __str__(self): return self.name

class ContentPage(models.Model):
    slug = models.SlugField(unique=True, verbose_name="آدرس صفحه")
    title = models.CharField(max_length=150, verbose_name="عنوان")
    body = models.TextField(verbose_name="متن")
    is_published = models.BooleanField(default=True, verbose_name="منتشرشده")
    class Meta:
        verbose_name = "صفحه اطلاعات"
        verbose_name_plural = "صفحات اطلاعات"
    def __str__(self): return self.title

