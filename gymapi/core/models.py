# gymapi/core/models.py
from django.db import models
from django.contrib.auth.models import AbstractUser

ROLE_CHOICES = (
    ('admin', 'Admin'),
    ('trainer', 'Trainer'),
    ('trainee', 'Trainee'),
)

class User(AbstractUser):
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    is_active = models.BooleanField(default=True)
    trainer = models.ForeignKey(
        'self',
        null=True, blank=True,
        limit_choices_to={'role': 'trainer'},
        on_delete=models.SET_NULL,
        related_name='trainees'
    )

    class Meta:
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.username} ({self.role})"


class Machine(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default='')

    def __str__(self):
        return self.name


class Plan(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='plans')
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True, default='')
    days_per_week = models.PositiveSmallIntegerField(default=3)
    sets = models.PositiveSmallIntegerField(default=3)
    reps = models.PositiveSmallIntegerField(default=10)
    duration_minutes = models.PositiveSmallIntegerField(default=45)
    machines = models.ManyToManyField(Machine, blank=True)
    is_active = models.BooleanField(default=True)

    # ✅ جديد: أيام الأسبوع كـ JSON (أرقام 0..6: 0=Mon, 6=Sun حسب الـ frontend)
    # يتطلب MySQL 5.7+ أو MariaDB 10.2.7+
    days_of_week = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"{self.title} -> {self.user.username}"
