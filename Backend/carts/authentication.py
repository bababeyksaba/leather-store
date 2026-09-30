from rest_framework.authentication import SessionAuthentication


class CartSessionAuthentication(SessionAuthentication):
    """Require CSRF for session writes, including anonymous guest carts."""

    def authenticate(self, request):
        result = super().authenticate(request)

        if result is None:
            self.enforce_csrf(request)

        return result