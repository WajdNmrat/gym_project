# gymapi/core/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Machine, Plan

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    trainer_username = serializers.ReadOnlyField(source='trainer.username')

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", "email",
            "role", "is_active", "trainer", "trainer_username", "password"
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        pwd = validated_data.pop("password", None)
        user = User(**validated_data)
        if pwd:
            user.set_password(pwd)
        else:
            user.set_unusable_password()
        user.save()
        return user


class MachineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Machine
        fields = "__all__"


class PlanSerializer(serializers.ModelSerializer):
    # اختيار المتدرّب محصور بالـ trainees
    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='trainee'),
        required=False
    )

    class Meta:
        model = Plan
        fields = "__all__"  # يتضمن days_of_week إذا كان معرف بالموديل

    # ---- Helpers ----
    def _normalize_days(self, arr):
        """
        يحوّل days_of_week إلى لائحة مرتّبة بدون تكرار من أرقام ضمن 0..6
        (0 = Sunday).
        """
        if arr is None:
            return []
        if not isinstance(arr, (list, tuple)):
            raise serializers.ValidationError({"days_of_week": "صيغة الأيام غير صحيحة."})

        cleaned = []
        for x in arr:
            try:
                ix = int(x)
            except (ValueError, TypeError):
                raise serializers.ValidationError({"days_of_week": "الأيام يجب أن تكون أرقام 0..6."})
            if ix < 0 or ix > 6:
                raise serializers.ValidationError({"days_of_week": "الأيام يجب أن تكون ضمن 0..6 (0=Sunday)."})
            cleaned.append(ix)

        return sorted(set(cleaned))

    # ---- Validation ----
    def validate(self, attrs):
        request = self.context.get("request")
        if request:
            acting_user = request.user
            selected_trainee = attrs.get("user") or getattr(self.instance, "user", None)
            role = getattr(acting_user, "role", None)

            # المتدرّب لا ينشئ لغيره
            if role == "trainee":
                if selected_trainee and selected_trainee.id != acting_user.id:
                    raise serializers.ValidationError("لا يمكنك إنشاء خطة لمستخدم آخر.")

            # المدرّب/الأدمن يجب تحديد متدرّب
            if role in ("trainer", "admin"):
                if not selected_trainee:
                    raise serializers.ValidationError("يجب اختيار متدرّب للخطة.")
                if role == "trainer":
                    if selected_trainee.trainer_id and selected_trainee.trainer_id != acting_user.id:
                        raise serializers.ValidationError("هذا المتدرّب تابع لمدرّب آخر.")

        # تنظيف days_of_week إن وُجدت
        if "days_of_week" in attrs:
            attrs["days_of_week"] = self._normalize_days(attrs.get("days_of_week"))

        return attrs

    # ---- Create/Update ----
    def create(self, validated_data):
        request = self.context.get("request")
        acting_user = request.user if request else None
        trainee = validated_data.get("user")

        # تأكيد التطبيع وقت الإنشاء (حتى لو ما مرّت على validate)
        validated_data["days_of_week"] = self._normalize_days(validated_data.get("days_of_week", []))

        # لو المدرّب أنشأ خطة لمتدرّب بلا مدرّب، أربط المتدرّب به تلقائياً
        if acting_user and getattr(acting_user, "role", None) == "trainer":
            if trainee and trainee.trainer_id is None:
                trainee.trainer_id = acting_user.id
                trainee.save(update_fields=["trainer"])

        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "days_of_week" in validated_data:
            validated_data["days_of_week"] = self._normalize_days(validated_data.get("days_of_week"))
        return super().update(instance, validated_data)
