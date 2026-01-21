# core/auth_urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .jwt_views import MyTokenObtainPairView
from .auth_views import me, AdminRegisterView

urlpatterns = [
    path('login/',   MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(),       name='token_refresh'),
    path('me/',      me,                               name='me'),
    path('register/', AdminRegisterView.as_view(),     name='admin_register'),
]
