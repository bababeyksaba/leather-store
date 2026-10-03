from django.db import migrations

# Starter list: all provinces with their capitals. Further cities are managed in admin.
CAPITALS = [
("آذربایجان شرقی", "تبریز"), ("آذربایجان غربی", "ارومیه"), ("اردبیل", "اردبیل"),
("اصفهان", "اصفهان"), ("البرز", "کرج"), ("ایلام", "ایلام"), ("بوشهر", "بوشهر"),
("تهران", "تهران"), ("چهارمحال و بختیاری", "شهرکرد"), ("خراسان جنوبی", "بیرجند"),
("خراسان رضوی", "مشهد"), ("خراسان شمالی", "بجنورد"), ("خوزستان", "اهواز"),
("زنجان", "زنجان"), ("سمنان", "سمنان"), ("سیستان و بلوچستان", "زاهدان"),
("فارس", "شیراز"), ("قزوین", "قزوین"), ("قم", "قم"), ("کردستان", "سنندج"),
("کرمان", "کرمان"), ("کرمانشاه", "کرمانشاه"), ("کهگیلویه و بویراحمد", "یاسوج"),
("گلستان", "گرگان"), ("گیلان", "رشت"), ("لرستان", "خرم‌آباد"), ("مازندران", "ساری"),
("مرکزی", "اراک"), ("هرمزگان", "بندرعباس"), ("همدان", "همدان"), ("یزد", "یزد")]

def seed(apps, schema_editor):
    Province = apps.get_model("users", "Province")
    City = apps.get_model("users", "City")
    Address = apps.get_model("users", "Address")
    db = schema_editor.connection.alias
    pairs = CAPITALS + list(Address.objects.using(db).values_list("province", "city"))
    for province_name, city_name in pairs:
        if province_name and city_name:
            province, _ = Province.objects.using(db).get_or_create(name=province_name)
            City.objects.using(db).get_or_create(province=province, name=city_name)
    for profile_id in Address.objects.using(db).values_list("profile_id", flat=True).distinct():
        first = Address.objects.using(db).filter(profile_id=profile_id).order_by("id").first()
        if first: Address.objects.using(db).filter(pk=first.pk).update(is_default=True)

class Migration(migrations.Migration):
    dependencies = [("users", "0002_city_province_alter_address_options_and_more")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]

