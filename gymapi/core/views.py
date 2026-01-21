# core/views.py
from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated, IsAdminUser

from .serializers import UserSerializer, MachineSerializer, PlanSerializer
from .models import Machine, Plan

User = get_user_model()


class IsAdminOrReadOwn(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        # أدمن/ستاف: وصول كامل
        if getattr(request.user, "role", None) == "admin" or request.user.is_staff:
            return True

        # صلاحيات على كائنات المستخدمين
        if isinstance(obj, User):
            # المدرّب: يشوف نفسه ومتدرّبيه
            if getattr(request.user, "role", None) == "trainer":
                return (obj == request.user) or (obj.trainer_id == request.user.id)
            # المتدرّب: نفسه فقط
            if getattr(request.user, "role", None) == "trainee":
                return obj == request.user

        # السماح الافتراضي لباقي الكائنات (مثلاً للّستات العامّة بعد فلترة get_queryset)
        return True


# ====== مساعد داخلي: إعادة احتساب حالة المتدرّب بعد أي تغيير على الخطط ======
def _recompute_trainee_status(user_id: int):
    """
    - إن لم يعد لدى المتدرّب أي خطة فعّالة → نفك ارتباط المدرّب.
    - (اختياري) إن أردت تخزين has_active_plan كحقل في User يمكنك تعديله هنا أيضاً.
    """
    if not user_id:
        return
    has_active = Plan.objects.filter(user_id=user_id, is_active=True).exists()
    # نفك ارتباط المدرّب إذا لم تعد هناك خطة فعّالة
    if not has_active:
        User.objects.filter(id=user_id).update(trainer=None)
    # لو عندك حقل User.has_active_plan وبدك تحدثه، أضفه هنا:
    # User.objects.filter(id=user_id).update(has_active_plan=has_active)


class UsersViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAdminOrReadOwn]
    # مهم: حتى لا تُفسَّر "me" كأنها pk
    lookup_value_regex = r"\d+"

    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = {"is_active": ["exact"], "role": ["exact"], "trainer": ["exact"]}
    ordering_fields = ["first_name", "last_name", "username", "id"]
    search_fields = ["first_name", "last_name", "username", "email"]

    def get_queryset(self):
        qs = User.objects.all().order_by("id")
        u = self.request.user
        if getattr(u, "role", None) == "admin" or u.is_staff:
            return qs
        if getattr(u, "role", None) == "trainer":
            return qs.filter(Q(id=u.id) | Q(trainer_id=u.id))
        # trainee: نفسه فقط
        return qs.filter(id=u.id)

    @action(detail=False, methods=["get"], url_path="me", permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """GET /api/users/me/"""
        return Response(UserSerializer(request.user).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=["is_active"])
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=["is_active"])
        return Response(UserSerializer(user).data)

    # ============ لائحة الاختيار للمدرّب (معدّلة: تعتمد "لا يملك خطة فعّالة") ============
    @action(detail=False, methods=["get"], url_path="trainee-choices",
            permission_classes=[permissions.IsAuthenticated])
    def trainee_choices(self, request):
        """
        للمدرّب:
          - متدرّبيه (role='trainee', trainer=request.user.id)
          - + متدرّبين بدون مدرّب وبدون أي خطة فعّالة
        للأدمن: يرجّع كل المتدرّبين.
        """
        u = request.user
        # أدمن: كل المتدرّبين
        if getattr(u, "role", None) == "admin" or u.is_staff:
            trainees = User.objects.filter(role="trainee").order_by("username")
            return Response(UserSerializer(trainees, many=True).data)

        # لازم يكون مدرّب
        if getattr(u, "role", None) != "trainer":
            return Response([], status=200)

        my_trainees = User.objects.filter(role="trainee", trainer_id=u.id)

        # بدون مدرّب
        unassigned = User.objects.filter(role="trainee", trainer__isnull=True)

        # IDs عندهم "خطط فعّالة"
        user_ids_with_active_plans = (
            Plan.objects.filter(is_active=True).values_list("user_id", flat=True).distinct()
        )
        # بدنا اللي ما عندهم "خطط فعّالة"
        unassigned_no_active_plans = unassigned.exclude(id__in=user_ids_with_active_plans)

        # اتحاد المجموعتين
        result_qs = (my_trainees | unassigned_no_active_plans).distinct().order_by("username")
        return Response(UserSerializer(result_qs, many=True).data)


class MachinesViewSet(viewsets.ModelViewSet):
    queryset = Machine.objects.all().order_by("id")  # ✅ لا يوجد حقل code في الموديل
    serializer_class = MachineSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    # ✅ بحث وترتيب منطقيين حسب الحقول الموجودة فعليًا
    search_fields = ["name", "description"]
    ordering_fields = ["id", "name"]

    # ✅ فلترة بالـ id إذا بدك تستخدمها من الواجهة
    filterset_fields = {"id": ["exact"]}


class PlansViewSet(viewsets.ModelViewSet):
    serializer_class = PlanSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = {"user": ["exact"], "is_active": ["exact"]}
    search_fields = ["title"]
    ordering_fields = ["id", "title", "days_per_week"]

    def get_queryset(self):
        qs = (
            Plan.objects.select_related("user")
            .prefetch_related("machines")
            .order_by("id")
        )
        u = self.request.user
        if getattr(u, "role", None) == "admin" or u.is_staff:
            return qs
        if getattr(u, "role", None) == "trainer":
            # كل خطط متدرّبيه فقط
            return qs.filter(user__trainer_id=u.id)
        # trainee: خططه فقط
        return qs.filter(user_id=u.id)

    # ========= سلوك الحفظ حسب الدور + تحديث حالة المتدرّب =========
    def perform_create(self, serializer):
        acting = self.request.user
        if getattr(acting, "role", None) == "trainee":
            plan = serializer.save(user=acting)
        else:
            plan = serializer.save()

        # لو المُنشئ مدرّب والخطة فعّالة → اربط المتدرّب بالمدرّب
        if getattr(acting, "role", None) == "trainer" and plan.is_active:
            if plan.user_id and plan.user.trainer_id != acting.id:
                User.objects.filter(id=plan.user_id).update(trainer=acting)

        # حدّث حالة المتدرّب
        _recompute_trainee_status(plan.user_id)

    def perform_update(self, serializer):
        plan = serializer.save()
        # في حال تغيّرت is_active لازم نعيد حساب حالة المتدرّب
        acting = self.request.user
        # خيار إضافي: لو صارت الخطة فعّالة الآن وكان المنشئ مدرّب، اربط المتدرّب
        if getattr(acting, "role", None) == "trainer" and plan.is_active:
            if plan.user_id and plan.user.trainer_id != acting.id:
                User.objects.filter(id=plan.user_id).update(trainer=acting)

        _recompute_trainee_status(plan.user_id)

    # حذف الخطة → أعد حساب حالة المتدرّب
    def perform_destroy(self, instance):
        user_id = instance.user_id
        super().perform_destroy(instance)
        _recompute_trainee_status(user_id)
