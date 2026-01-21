# gymapi/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from core.views import UsersViewSet, MachinesViewSet, PlansViewSet

# 🔸 الراوتر لتجميع الـ ViewSets
router = DefaultRouter()
router.register(r'users',    UsersViewSet,    basename='users')
router.register(r'machines', MachinesViewSet, basename='machines')
router.register(r'plans',    PlansViewSet,    basename='plans')

urlpatterns = [
    # 🔹 لوحة تحكم Django
    path('admin/', admin.site.urls),

    # 🔹 API الرئيسي
    path('api/', include(router.urls)),

    # 🔹 مسارات تسجيل الدخول والـ JWT (login / refresh)
    path('api/auth/', include('core.auth_urls')),  # يحتوي /auth/login و /auth/refresh

    # 🔹 لتجريب الـ API عبر واجهة browsable
    path('api-auth/', include('rest_framework.urls')),
]
