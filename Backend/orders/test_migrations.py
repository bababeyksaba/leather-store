from datetime import timedelta
import uuid
from django.test import TransactionTestCase
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.utils import timezone

class HistoricalVariantMigrationTests(TransactionTestCase):
    def test_existing_product_and_pending_order_are_preserved(self):
        executor=MigrationExecutor(connection)
        old_targets=[('products','0006_alter_category_parent'),('orders','0002_order_fulfillment')]
        executor.migrate(old_targets)
        old_apps=executor.loader.project_state(old_targets).apps
        Category=old_apps.get_model('products','Category')
        Product=old_apps.get_model('products','Product')
        User=old_apps.get_model('auth','User')
        Order=old_apps.get_model('orders','Order')
        Item=old_apps.get_model('orders','OrderItem')
        category=Category.objects.create(name='قدیمی',slug='old')
        product=Product.objects.create(category=category,name='کیف قبلی',slug='old-bag',sku='OLD',color='مشکی',size='کوچک',price=100,stock=5)
        user=User.objects.create(username='historical')
        order=Order.objects.create(user=user,idempotency_key=uuid.uuid4(),subtotal=200,shipping_fee=0,total=200,expires_at=timezone.now()+timedelta(minutes=15))
        item=Item.objects.create(order=order,product=product,name=product.name,sku='OLD',quantity=2,unit_price=100,item_total=200)
        executor=MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
        from products.models import ProductVariant
        from orders.models import OrderItem
        from orders.services import finish_order
        variant=ProductVariant.objects.get(product_id=product.id,is_default=True)
        self.assertEqual((variant.stock,variant.color,variant.size),(5,'مشکی','کوچک'))
        self.assertEqual(OrderItem.objects.get(pk=item.pk).variant_id,variant.id)
        # Original stock already excludes reservations; migration must not reserve twice.
        from django.contrib.auth import get_user_model
        finish_order(get_user_model().objects.get(pk=user.pk),order.number,'cancel')
        variant.refresh_from_db();self.assertEqual(variant.stock,7)
