from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import Category, Product, ProductVariant, ProductReview

class ProductFeaturesTests(TestCase):
    def setUp(self):
        self.root = Category.objects.create(name='زنانه', slug='women')
        self.category = Category.objects.create(name='کیف', slug='bags', parent=self.root)
        self.product = Product.objects.create(category=self.category, name='کیف چرم', slug='bag', sku='B1', price=100, stock=7)
        self.red = ProductVariant.objects.create(product=self.product, sku='R1', color='قرمز', size='کوچک', price=100, stock=5, is_default=True)
        self.blue = ProductVariant.objects.create(product=self.product, sku='BL1', color='آبی', size='بزرگ', price=200, stock=2)
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(username='private-uuid')

    def results(self, params):
        response = self.client.get('/api/products/', params)
        self.assertEqual(response.status_code, 200)
        return response.data['results']

    def test_options_belong_to_same_variant(self):
        self.assertEqual(self.results({'color':'قرمز', 'size':'بزرگ'}), [])
        self.assertEqual(len(self.results({'color':'آبی', 'size':'بزرگ', 'min_price':150})), 1)
        self.assertEqual(self.results({'color':'قرمز', 'min_price':150}), [])

    def test_invalid_price_is_400(self):
        for params in ({'min_price':'abc'}, {'min_price':201,'max_price':100}, {'min_price':'NaN'}, {'min_price':'Infinity'}):
            with self.subTest(params=params): self.assertEqual(self.client.get('/api/products/',params).status_code,400)

    def test_inactive_ancestor_hides_every_endpoint(self):
        self.root.is_active=False; self.root.save()
        self.assertEqual(self.results({}), [])
        self.assertEqual(self.client.get(f'/api/products/id/{self.product.id}/').status_code,404)
        self.assertEqual(self.client.post(f'/api/cart/variants/{self.red.id}/', {'quantity':1}, format='json').status_code,404)

    def test_category_filter_includes_descendants(self):
        data=self.results({'category':'women'})
        self.assertEqual(data[0]['id'], self.product.id)
        self.assertEqual(len(data[0]['variants']),2)
        self.assertEqual(data[0]['stock'],7)

    def test_review_moderation_validation_and_privacy(self):
        url=f'/api/products/id/{self.product.id}/review/'
        self.assertEqual(self.client.post(url, {'rating':5,'comment':'عالی'},format='json').status_code,403)
        self.client.force_authenticate(self.user)
        for rating in (0,6): self.assertEqual(self.client.post(url,{'rating':rating,'comment':'نظر'},format='json').status_code,400)
        self.assertEqual(self.client.post(url,{'rating':4,'comment':'کیف خوب'},format='json').status_code,201)
        detail=f'/api/products/id/{self.product.id}/'
        self.assertEqual(self.client.get(detail).data['review_count'],0)
        ProductReview.objects.update(is_approved=True)
        data=self.client.get(detail).data
        self.assertEqual(data['review_count'],1)
        self.assertEqual(data['average_rating'],4.0)
        self.assertEqual(data['reviews'][0]['author_name'],'کاربر فروشگاه')
        self.assertEqual(self.client.post(url,{'rating':5,'comment':'ویرایش'},format='json').status_code,200)
        self.assertEqual(self.client.get(detail).data['review_count'],0)
        self.assertEqual(ProductReview.objects.count(),1)

    def test_search_finds_added_variant_color(self):
        self.assertEqual(len(self.results({'search':'آبی'})),1)

    def test_review_statistics_cover_more_than_display_limit(self):
        users=get_user_model()
        for n in range(55):
            user=users.objects.create_user(username=f'reviewer{n}')
            ProductReview.objects.create(product=self.product,user=user,rating=5 if n < 50 else 1,comment='نظر',is_approved=True)
        data=self.client.get(f'/api/products/id/{self.product.id}/').data
        self.assertEqual(data['review_count'],55)
        self.assertEqual(len(data['reviews']),50)
        self.assertEqual(data['average_rating'],4.6)

