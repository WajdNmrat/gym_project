# gymapi/core/migrations/0004_machine_code_is_active.py
from django.db import migrations, models

def fill_machine_codes(apps, schema_editor):
    Machine = apps.get_model('core', 'Machine')
    # نولّد كود فريد لكل سطر موجود مسبقاً حسب الـID
    for m in Machine.objects.all().order_by('id'):
        if not getattr(m, 'code', None):
            m.code = f"M{m.id:04d}"   # مثال: M0001, M0002, ...
            m.save(update_fields=['code'])

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_alter_user_options_plan_description_and_more'),
    ]

    operations = [
        # 1) نضيف الأعمدة الجديدة (code يسمح مؤقتاً بـ null لنتفادى الأسئلة/التعارض)
        migrations.AddField(
            model_name='machine',
            name='code',
            field=models.CharField(max_length=10, unique=True, null=True),
        ),
        migrations.AddField(
            model_name='machine',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        # 2) نشيل unique عن name (صار code هو الفريد)
        migrations.AlterField(
            model_name='machine',
            name='name',
            field=models.CharField(max_length=100),
        ),
        # 3) نملأ code تلقائياً للسجلات القديمة
        migrations.RunPython(fill_machine_codes, migrations.RunPython.noop),
        # 4) نمنع null عن code بعد ما تعبّيناه
        migrations.AlterField(
            model_name='machine',
            name='code',
            field=models.CharField(max_length=10, unique=True, null=False),
        ),
        # (اختياري) ترتيب افتراضي
        # migrations.AlterModelOptions(
        #     name='machine',
        #     options={'ordering': ['code', 'name']},
        # ),
    ]
