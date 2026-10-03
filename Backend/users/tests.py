from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import CustomerProfile, Address, Province, City

class AddressFeaturesTests(TestCase):
    def setUp(self):
        self.user=get_user_model().objects.create_user(username='owner')
        self.profile=CustomerProfile.objects.create(user=self.user,phone='09123456789')
        self.client=APIClient();self.client.force_authenticate(self.user)
        self.data={'title':'خانه','province':'تهران','city':'تهران','address_line':'خیابان یک پلاک ۱','postal_code':'1234567890'}

    def test_first_default_and_change_and_delete(self):
        first=self.client.post('/api/account/addresses/',self.data,format='json')
        self.assertEqual(first.status_code,201);self.assertTrue(first.data['is_default'])
        second=self.client.post('/api/account/addresses/',{**self.data,'title':'کار','is_default':True},format='json')
        self.assertEqual(second.status_code,201)
        self.assertEqual(Address.objects.filter(profile=self.profile,is_default=True).count(),1)
        self.assertEqual(self.client.delete(f"/api/account/addresses/{second.data['id']}/").status_code,204)
        self.assertTrue(Address.objects.get(pk=first.data['id']).is_default)

    def test_city_must_belong_to_province(self):
        response=self.client.post('/api/account/addresses/',{**self.data,'city':'شیراز'},format='json')
        self.assertEqual(response.status_code,400)

    def test_other_customer_cannot_edit_or_delete(self):
        user=get_user_model().objects.create_user(username='other')
        profile=CustomerProfile.objects.create(user=user,phone='09120000000')
        address=Address.objects.create(profile=profile,**self.data)
        url=f'/api/account/addresses/{address.id}/'
        self.assertEqual(self.client.patch(url,{'is_default':True},format='json').status_code,404)
        self.assertEqual(self.client.delete(url).status_code,404)

    def test_locations_and_public_store(self):
        self.assertGreaterEqual(len(self.client.get('/api/locations/').data),31)
        self.assertTrue(self.client.get('/api/store/').data['pages'])
        self.assertEqual(self.client.get('/api/store/pages/contact/').status_code,200)

