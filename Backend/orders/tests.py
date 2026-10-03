import uuid
from datetime import date,timedelta
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from django.contrib.sessions.backends.db import SessionStore
from rest_framework.exceptions import ValidationError
from products.models import Category,Product,ProductVariant
from users.models import CustomerProfile,Address
from .models import Order,OrderItem,ShippingMethod
from .services import create_order,finish_order,expire_orders,clear_purchased_cart

class OrderVariantTests(TestCase):
    def setUp(self):
        self.user=get_user_model().objects.create_user(username='customer')
        profile=CustomerProfile.objects.create(user=self.user,phone='09123456789',first_name='سارا',last_name='احمدی',gender='female',birth_date=date(2000,1,1))
        self.address=Address.objects.create(profile=profile,title='خانه',province='تهران',city='تهران',address_line='نشانی',postal_code='1234567890')
        self.shipping=ShippingMethod.objects.create(name='آزمایشی',fee=20)
        category=Category.objects.create(name='کیف',slug='bags')
        self.product=Product.objects.create(category=category,name='کیف',slug='bag',sku='P',price=100,stock=7)
        self.red=ProductVariant.objects.create(product=self.product,sku='red',color='قرمز',size='کوچک',price=100,stock=5,is_default=True)
        self.blue=ProductVariant.objects.create(product=self.product,sku='blue',color='آبی',size='بزرگ',price=200,stock=2)
        self.session=SessionStore();self.session['cart']={f'v:{self.red.id}':{'quantity':2},f'v:{self.blue.id}':{'quantity':1}}
        self.data={'address_id':self.address.id,'shipping_method_id':self.shipping.id,'idempotency_key':uuid.uuid4()}

    def create(self): return create_order(self.user,self.session,self.data)[0]
    def test_reserve_independent_stock_and_snapshots_and_replay(self):
        order=self.create();self.assertEqual(order.total,420)
        self.red.refresh_from_db();self.blue.refresh_from_db();self.assertEqual((self.red.stock,self.blue.stock),(3,1))
        same,created=create_order(self.user,self.session,self.data);self.assertEqual(same.id,order.id);self.assertFalse(created)
        self.assertEqual(order.items.get(variant=self.blue).size,'بزرگ')
        self.blue.price=300;self.blue.save();self.assertEqual(order.items.get(variant=self.blue).unit_price,200)

    def test_cancel_releases_once(self):
        order=self.create()
        finish_order(self.user,order.number,'cancel');finish_order(self.user,order.number,'cancel')
        self.red.refresh_from_db();self.blue.refresh_from_db();self.assertEqual((self.red.stock,self.blue.stock),(5,2))
        self.product.refresh_from_db();self.assertEqual(self.product.stock,7)

    def test_expiry_releases_without_visitors(self):
        order=self.create();Order.objects.filter(pk=order.pk).update(expires_at=timezone.now()-timedelta(seconds=1))
        self.assertEqual(expire_orders(),1);self.assertEqual(expire_orders(),0)
        self.red.refresh_from_db();self.assertEqual(self.red.stock,5)

    def test_oversell_rolls_back_all_items(self):
        self.session['cart'][f'v:{self.blue.id}']['quantity']=3
        with self.assertRaises(ValidationError): self.create()
        self.assertEqual(Order.objects.count(),0);self.red.refresh_from_db();self.assertEqual(self.red.stock,5)

    def test_legacy_cart_maps_to_original_variant(self):
        self.session['cart']={str(self.product.id):2}
        order=self.create();self.assertEqual(order.items.get().variant_id,self.red.id)

    def test_pay_clears_only_purchased_quantities_once(self):
        order=self.create();self.session['checkout_order']=str(order.number)
        self.session['cart'][f'v:{self.red.id}']['quantity']=3
        paid,success=finish_order(self.user,order.number,'pay');self.assertTrue(success)
        clear_purchased_cart(self.session,paid)
        self.assertEqual(self.session['cart'][f'v:{self.red.id}']['quantity'],1)
        clear_purchased_cart(self.session,paid)
        self.assertEqual(self.session['cart'][f'v:{self.red.id}']['quantity'],1)

    def test_fulfillment_remains_sequential(self):
        from django.db import transaction
        from django.core.exceptions import ValidationError as ModelValidationError
        from .fulfillment import apply_fulfillment
        order=self.create()
        with transaction.atomic():
            with self.assertRaises(ModelValidationError): apply_fulfillment(order,'processing','','')
        order,_=finish_order(self.user,order.number,'pay')
        with transaction.atomic():
            apply_fulfillment(order,'processing','','')
            with self.assertRaises(ModelValidationError): apply_fulfillment(order,'shipped','','')
            apply_fulfillment(order,'shipped','پست','123456')
            apply_fulfillment(order,'delivered','پست','123456')
        self.assertIsNotNone(order.delivered_at)

