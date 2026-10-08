from uuid import uuid4

from django.db import models, router, transaction


class AutoProductSkuMixin(models.Model):
    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        # محصولی که کد دارد، کدش حفظ می‌شود.
        if self.sku:
            return super().save(*args, **kwargs)

        database = (
            kwargs.get("using")
            or router.db_for_write(
                type(self),
                instance=self,
            )
        )

        kwargs["using"] = database

        with transaction.atomic(using=database):
            # کد موقت برای دریافت آیدی محصول.
            self.sku = f"tmp-{uuid4().hex}"

            super().save(*args, **kwargs)

            base_code = f"{self.pk:02d}"
            code = base_code
            suffix = 1

            products = (
                type(self).objects
                .using(database)
                .exclude(pk=self.pk)
            )

            # از تداخل با کدهای دستی قبلی جلوگیری می‌کند.
            while products.filter(sku=code).exists():
                code = f"{base_code}-{suffix}"
                suffix += 1

            type(self).objects.using(database).filter(
                pk=self.pk
            ).update(sku=code)

            self.sku = code