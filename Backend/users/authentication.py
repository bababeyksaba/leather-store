from rest_framework.authentication import SessionAuthentication


class CSRFSessionAuthentication(SessionAuthentication):
    def authenticate(self, request):
        # درخواست ورود مهمان هم باید CSRF معتبر داشته باشد.
        self.enforce_csrf(request)

        return super().authenticate(request)