"""Digipay UPG HTTP client. No DB mutation or browser-facing secrets.

Based on merchant UPG documentation supplied by the project owner.
Do not mark orders paid from callback alone. Verify server-side first.
"""
from __future__ import annotations

import base64
from dataclasses import dataclass
from decimal import Decimal
from urllib.parse import urlparse

import requests

BASES = {
    'staging': 'https://uat.mydigipay.info/digipay/api',
    'live': 'https://api.mydigipay.com/digipay/api',
}
PAYMENT_TYPES = {0, 5, 11, 13, 24}

class DigipayError(Exception):
    """Loggable category and HTTP code only; never include credentials or response payload."""
    def __init__(self, category: str, status_code: int | None = None):
        self.category = category
        self.status_code = status_code
        super().__init__(f'{category}: {status_code}' if status_code else category)

@dataclass(frozen=True)
class DigipayConfig:
    client_id: str
    client_secret: str
    username: str
    password: str
    environment: str = 'staging'
    timeout: int = 12

    @classmethod
    def from_django(cls):
        from django.conf import settings
        return cls(
            settings.DIGIPAY_CLIENT_ID,
            settings.DIGIPAY_CLIENT_SECRET,
            settings.DIGIPAY_USERNAME,
            settings.DIGIPAY_PASSWORD,
            getattr(settings, 'DIGIPAY_ENVIRONMENT', 'staging'),
        )

class DigipayUPG:
    def __init__(self, config: DigipayConfig, session: requests.Session | None = None):
        if config.environment not in BASES or not all((config.client_id, config.client_secret, config.username, config.password)):
            raise DigipayError('configuration')
        self.base = BASES[config.environment]
        self.config = config
        self.session = session or requests.Session()

    def _post(self, path: str, *, headers: dict, data=None, json=None):
        try:
            response = self.session.post(self.base + path, headers=headers, data=data, json=json, timeout=self.config.timeout, allow_redirects=False)
            if response.status_code != 200:
                raise DigipayError('http', response.status_code)
            result = response.json()
            if not isinstance(result, dict):
                raise DigipayError('invalid_response')
            return result
        except requests.RequestException:
            raise DigipayError('network') from None
        except ValueError:
            raise DigipayError('invalid_response') from None

    @staticmethod
    def _ensure_success(payload: dict):
        result = payload.get('result')
        if not isinstance(result, dict) or type(result.get('status')) is not int or result['status'] != 0:
            raise DigipayError('business_failure')

    def access_token(self) -> str:
        basic = base64.b64encode(f'{self.config.client_id}:{self.config.client_secret}'.encode()).decode('ascii')
        payload = self._post('/oauth/token', headers={'Authorization': f'Basic {basic}'}, data={
            'username': self.config.username,
            'password': self.config.password,
            'grant_type': 'password',
        })
        token = payload.get('access_token')
        if not isinstance(token, str) or not token:
            raise DigipayError('token_response')
        return token

    @staticmethod
    def _headers(token: str, ticket: bool = False):
        h = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json; charset=UTF-8'}
        if ticket:
            h.update({'Agent': 'WEB', 'Digipay-Version': '2022-02-02'})
        return h

    def create_ticket(self, *, phone: str, amount: int, provider_id: str, callback_url: str,
                      basket: dict | None = None, preferred_gateway: int | None = None) -> dict:
        if not isinstance(amount, int) or isinstance(amount, bool) or amount <= 0:
            raise DigipayError('invalid_amount')
        if not isinstance(provider_id, str) or not provider_id or not phone.startswith('09') or len(phone) != 11 or not phone.isascii() or not phone.isdigit():
            raise DigipayError('invalid_request')
        uri = urlparse(callback_url)
        if uri.scheme != 'https' or not uri.netloc or uri.username or uri.password or uri.fragment:
            raise DigipayError('invalid_callback_url')
        payload = {'cellNumber': phone, 'amount': amount, 'providerId': provider_id, 'callbackUrl': callback_url}
        if basket is not None:
            if not isinstance(basket, dict) or not basket.get('basketId') or not basket.get('items'):
                raise DigipayError('invalid_basket')
            payload['basketDetailsDto'] = basket
        if preferred_gateway is not None:
            if preferred_gateway not in (0, 2):
                raise DigipayError('invalid_preference')
            payload['additionalInfo'] = {'preferredGateway': preferred_gateway}
        result = self._post('/tickets/business?type=11', headers=self._headers(self.access_token(), True), json=payload)
        self._ensure_success(result)
        ticket, redirect = result.get('ticket'), result.get('redirectUrl')
        if not isinstance(ticket, str) or not ticket or not isinstance(redirect, str):
            raise DigipayError('invalid_response')
        parsed = urlparse(redirect)
        if parsed.scheme != 'https' or not parsed.hostname or not (parsed.hostname == 'mydigipay.com' or parsed.hostname.endswith('.mydigipay.com') or parsed.hostname == 'mydigipay.info' or parsed.hostname.endswith('.mydigipay.info')):
            raise DigipayError('unsafe_redirect')
        return {'ticket': ticket, 'redirectUrl': redirect}

    def verify(self, *, provider_id: str, tracking_code: str, payment_type: int, expected_amount: int) -> dict:
        if payment_type not in PAYMENT_TYPES or not provider_id or not tracking_code or expected_amount <= 0:
            raise DigipayError('invalid_request')
        result = self._post(f'/purchases/verify?type={payment_type}',
            headers=self._headers(self.access_token()),
            json={'providerId': provider_id, 'trackingCode': tracking_code})
        self._ensure_success(result)
        if (str(result.get('providerId')) != provider_id or str(result.get('trackingCode')) != tracking_code
                or str(result.get('amount')) != str(expected_amount)):
            raise DigipayError('mismatched_verification')
        return result

    def deliver(self, *, tracking_code: str, payment_type: int, invoice_number: str, delivery_epoch_ms: int, products: list[str]) -> dict:
        if payment_type not in (5, 13) or not tracking_code or not invoice_number or not products or not isinstance(delivery_epoch_ms, int):
            raise DigipayError('invalid_request')
        result = self._post(f'/purchases/deliver?type={payment_type}',
            headers=self._headers(self.access_token()),
            json={'trackingCode': tracking_code, 'invoiceNumber': invoice_number,
                  'deliveryDate': delivery_epoch_ms, 'products': products})
        self._ensure_success(result)
        return result