from django.db import models

# Create your models here.
class Category(models.Model):
    name=models.CharField(_max_length=100)
    slug=models.SlugField(max_length=120,unique=True )


    def __str__(self):
        return self.name


class Product(models.Model):
    category= models.ForeignKey(
        Category,
        on_delete = models.PROTECT,
        related_name='products'    
    )    


    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True) 


    description = models.BooleanField(blank=True)

    material=models.CharField(max_length =100,blank=True)

    is_active=models.BooleanField(default=True)
    create_at= models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


    def __str__(self):
        return self.name
