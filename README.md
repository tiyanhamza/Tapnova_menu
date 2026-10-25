# TapNova Menu — خطوات النشر (من التيليفون)

مشروع مستقل عن موقع TapNova Admin القديم. ما كيلمس والو فيه.

## 1) GitHub
- دير ريبو جديد: `tapnova-menu`.
- ارفع **كل** الملفات والمجلدات (`netlify`, `public`, `netlify.toml`, `package.json`, `supabase.sql`) بـ **Add file → Upload files**.

## 2) Supabase (مشروع جديد مجاني)
- New project.
- SQL Editor → New query → انسخ محتوى `supabase.sql` → **Run**. (كيصاوب الجدول `menus` والبوكيط `menu-images` للصور).
- Project Settings → API: نسخ **Project URL** و **service_role key** (سرية، ما تعطيها لحد).

## 3) Netlify
- Add new site → Import from GitHub → اختار `tapnova-menu` → Deploy.
- Site configuration → Environment variables، زيد 3 متغيرات (انظر `.env.example`):
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
  - `ADMIN_KEY` (كود سري طويل، هذا هو الكود ديال الدخول)
- Deploys → **Trigger deploy → Deploy site** (باش تتفعل المتغيرات).

## 4) التجربة
1. افتح `https://موقعك.netlify.app/admin/` ودخل بـ ADMIN_KEY. (كود غالط = رفض).
2. Créer un nouveau menu ← اسم + لوغو + صورة + منتج بصورة من التيليفون + ثمن ← Enregistrer.
3. تأكد بلي ظهر الرابط `/menu/اسم-الكليان`، وجرب Copier / Voir le menu / Partager.
4. نزّل QR (PNG و SVG) وسكانيه بتيليفون آخر: خاصو يفتح نفس المنيو.
5. بدل ثمن أو صورة وعاود Enregistrer: الـ QR والرابط كيبقاو هوما هوما.
6. Refresh للصفحة: المعطيات باقين.
7. Désactiver المنيو: الرابط العمومي كيعطي "غير متوفر".

## التحديث
بدل الملف فـ GitHub (Edit) وNetlify كيعاود النشر بوحدو. الرابط ديال كل كليان ما كيتبدلش حتى لو بدلتي الاسم.
