from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from products.models import Category, Product


class CartAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.category = Category.objects.create(
            name="کیف",
            slug="bags",
            is_active=True,
        )

        cls.product = Product.objects.create(
            category=cls.category,
            name="کیف چرمی",
            slug="leather-bag",
            sku="CART-TEST-001",
            price=3500000,
            stock=8,
            is_active=True,
        )

    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)

        response = self.client.get("/api/cart/")
        self.token = response.json()["csrf_token"]

        self.add_url = f"/api/cart/items/{self.product.pk}/"
        self.delete_url = f"/api/cart/items/{self.product.pk}/delete/"

    def add(self, quantity):
        return self.client.post(
            self.add_url,
            {"quantity": quantity},
            format="json",
            HTTP_X_CSRFTOKEN=self.token,
        )

    def test_empty_cart(self):
        data = self.client.get("/api/cart/").json()

        self.assertEqual(data["items"], [])
        self.assertFalse(data["can_checkout"])

    def test_add_and_total(self):
        self.assertEqual(self.add(2).status_code, 201)

        data = self.client.get("/api/cart/").json()

        self.assertEqual(data["total_quantity"], 2)
        self.assertEqual(
            Decimal(data["total_price"]),
            Decimal("7000000"),
        )

    def test_repeated_add_checks_combined_quantity(self):
        self.add(5)

        self.assertEqual(self.add(4).status_code, 400)
        self.assertEqual(
            self.client.get("/api/cart/").json()["total_quantity"],
            5,
        )

    def test_invalid_quantities(self):
        for quantity in (0, -1, "abc", 1.5, 10001):
            with self.subTest(quantity=quantity):
                self.assertEqual(
                    self.add(quantity).status_code,
                    400,
                )

    def test_soft_delete_and_restore(self):
        self.add(2)

        response = self.client.delete(
            self.delete_url,
            HTTP_X_CSRFTOKEN=self.token,
        )

        self.assertEqual(response.status_code, 204)

        item = self.client.session["cart"][str(self.product.pk)]

        self.assertTrue(item["is_deleted"])
        self.assertIsNotNone(item["deleted_at"])
        self.assertTrue(
            Product.objects.filter(pk=self.product.pk).exists()
        )

        self.assertEqual(
            self.client.get("/api/cart/").json()["items"],
            [],
        )

        self.assertEqual(self.add(1).status_code, 201)
        self.assertEqual(
            self.client.get("/api/cart/").json()["total_quantity"],
            1,
        )

    def test_delete_missing_item(self):
        response = self.client.delete(
            self.delete_url,
            HTTP_X_CSRFTOKEN=self.token,
        )

        self.assertEqual(response.status_code, 404)

    def test_guest_write_requires_csrf(self):
        response = self.client.post(
            self.add_url,
            {"quantity": 1},
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_carts_are_separate(self):
        self.add(2)

        other_client = APIClient(enforce_csrf_checks=True)

        self.assertEqual(
            other_client.get("/api/cart/").json()["items"],
            [],
        )

    def test_inactive_product_cannot_be_added(self):
        self.product.is_active = False
        self.product.save(update_fields=["is_active"])

        self.assertEqual(self.add(1).status_code, 404)

    def test_stock_reduction_is_reported(self):
        self.add(3)

        self.product.stock = 1
        self.product.save(update_fields=["stock"])

        data = self.client.get("/api/cart/").json()

        self.assertFalse(data["items"][0]["is_available"])
        self.assertFalse(data["can_checkout"])

    def test_legacy_cart(self):
        session = self.client.session
        session["cart"] = {str(self.product.pk): 2}
        session.save()

        self.assertEqual(
            self.client.get("/api/cart/").json()["total_quantity"],
            2,
        )

    def test_patch_not_supported(self):
        response = self.client.patch(
            self.add_url,
            {"quantity": 1},
            format="json",
            HTTP_X_CSRFTOKEN=self.token,
        )

        self.assertEqual(response.status_code, 405)