# gymapi/core/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Machine, Plan


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('id', 'username', 'email', 'role', 'is_active', 'is_staff')
    list_filter  = ('role', 'is_active', 'is_staff')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('id',)


@admin.register(Machine)
class MachineAdmin(admin.ModelAdmin):
    # ✅ الحقول الموجودة فعليًا في الموديل
    list_display  = ('id', 'name', 'description')
    search_fields = ('name', 'description')
    ordering      = ('id',)   # أو ('name',) إذا بتحب
    # ما في list_filter لأنو ما في is_active بالموديل


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display  = ('id', 'title', 'user', 'days_per_week', 'sets', 'reps', 'duration_minutes', 'is_active', 'show_days')
    list_filter   = ('is_active', 'days_per_week')
    search_fields = ('title', 'description', 'user__username')
    ordering      = ('id',)

    def show_days(self, obj):
        try:
            return ",".join(str(d) for d in (obj.days_of_week or []))
        except Exception:
            return "-"
    show_days.short_description = "days_of_week"
