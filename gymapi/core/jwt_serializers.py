# core/jwt_serializers.py
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # معلومات إضافية (اختياري)
        token['role'] = getattr(user, 'role', None)
        token['username'] = user.username
        token['email'] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # نحافظ على نفس المفاتيح اللي الأنجولار متوقعها
        data['access'] = str(self.get_token(self.user).access_token)
        data['refresh'] = str(self.get_token(self.user))
        # خيار: رجّع دور/آي دي بسرعة مع الرد
        data['role'] = getattr(self.user, 'role', None)
        data['user_id'] = self.user.id
        return data
