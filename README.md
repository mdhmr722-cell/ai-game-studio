# AI GAME STUDIO

**منصة متكاملة لصناعة الألعاب والتطبيقات بالذكاء الاصطناعي**
Developed by **OMAR NAJMI** — Powered by **OMAR AI**

---

## العربية

### ما هي المنصة؟

AI GAME STUDIO منصة ويب مجانية بالكامل، تكتب فيها فكرة اللعبة أو التطبيق فقط،
ثم يتولّى **OMAR AI** تحويلها إلى مشروع قابل للتعديل والتشغيل والتصدير والنشر:
تصميم التجربة، توليد الأكواد والواجهات، بناء العالم، ضبط الجودة، ثم الاختبار.

### المجانية الكاملة

- لا اشتراكات شهرية أو سنوية.
- لا رسوم لفتح أدوات صناعة الألعاب أو إنشاء التطبيقات.
- لا باقات مدفوعة مخفية.
- لا قيود مدفوعة على أدوات التصميم أو التحرير.
- لا رسوم على تصدير ملفات المشاريع.
- أدوات الذكاء الاصطناعي تعمل داخل المنصة مجاناً.
- أي تكلفة خارجية اختيارية (متاجر التطبيقات، الاستضافة المدفوعة) مُوضّحة قبل الاستخدام.

### الأقسام

- **الرئيسية**: نظرة عامة، بدء سريع بفكرة، ضمان المجانية.
- **OMAR AI**: محادثة تحوّل الفكرة إلى مشروع كامل، وأوامر تعديل نصية.
- **Game Studio**: ألعاب 2D و3D — مغامرات، سباقات، حروب، عالم مفتوح، محاكاة، رعب، متعددة اللاعبين.
- **App Studio**: تطبيقات — متاجر، تعليم، تواصل، ذكاء اصطناعي، ترفيه، أدوات.
- **World Builder**: مدن، شوارع، مبانٍ، منازل، سيارات، طبيعة، جبال، بحار — مشهد ثلاثي الأبعاد حقيقي.
- **مكتبتي**: كل مشاريعك — فتح، تشغيل، نسخ، تصدير، مشاركة، حذف.
- **مجتمع الألعاب**: تجربة مشاريع المستخدمين، تقييم بالنجوم، تعليقات، مشاركة.
- **مركز النشر**: تشغيل، حفظ، تصدير، نشر، ومتطلبات المتاجر الخارجية.
- **إعدادات الحساب**: الملف الشخصي، اللغة، الجودة، معلومات الجهاز، النسخ الاحتياطي.

### كيف يعمل تقنياً؟

- **بدون بناء أو تثبيت**: موقع ثابت (`index.html` + وحدات ES) يفتح مباشرة.
- **OMAR AI** يعمل محلياً داخل المتصفح: تحليل وصف المستخدم (عربي/إنجليزي)،
  استخراج النوع والأبعاد والعناصر والألوان، ثم توليد مواصفات المشروع والواجهات.
  لا يحتاج مفتاح API ولا خدمة مدفوعة.
- **محرك 2D** (`js/engine2d.js`): حلقة رسم على Canvas، شخصية، أعداء، عوائق،
  جمع نقاط، مستويات، إطلاق نار في ألعاب الحرب، دعم لوحة المفاتيح واللمس.
  المحرك مكتوب بلا استيرادات، لذلك يُدمج داخل ملف اللعبة المُصدَّر ليعمل مستقلاً.
- **محرك 3D** (`js/world3d.js` + `vendor/three.module.js`): مشهد three.js مولَّد
  من مواصفات المشروع، بإضاءة وظلال، ودوران وتكبير باللمس.
- **الجودة**: Full HD (1920×1080) أو 4K Ultra HD (3840×2160) مع اختيار تلقائي
  حسب كثافة البكسل وأنوية المعالج وذاكرة الجهاز.
- **البيانات على الجهاز**: المشاريع والتقييمات والتعليقات في `localStorage`،
  مع تصدير واستعادة نسخة احتياطية JSON.
- **المشاركة**: رابط يحمل المشروع نفسه (Base64 في العنوان) ويعمل على أي جهاز.
- **التصدير**: لعبة مستقلة بصفحة HTML واحدة، تطبيق كصفحة HTML مستقلة، ومواصفات JSON.

### هيكل الملفات

```
index.html             واجهة الصفحة الواحدة
styles/app.css         تصميم المنصة (RTL/LTR — سطح المكتب والهاتف)
js/app.js              الهيكل، التوجيه، الرئيسية، المكتبة، المجتمع، النشر، الحساب
js/ai.js               OMAR AI: توليد المشاريع + أوامر التعديل + المحادثة
js/studios.js          Game Studio / App Studio / World Builder / التشغيل / التصدير
js/engine2d.js         محرك تشغيل الألعاب على Canvas
js/engine3d.js         محرك اللعب ثلاثي الأبعاد (three.js) بجودة HD/4K
js/world3d.js          توليد العالم ثلاثي الأبعاد بـ three.js
js/store.js            الحفظ المحلي للمشاريع والتقييمات والتعليقات
js/i18n.js             العربية والإنجليزية واتجاه الصفحة
js/ui.js               تنبيهات، تنزيل ملفات، مشاركة، أدوات صغيرة
vendor/three.module.js محرك three.js مضمَّن داخل المشروع (بدون CDN)
```

### ملاحظات صريحة

- اللعب في الألعاب ثلاثي الأبعاد حقيقي بمحرك three.js: شخصية تمشي في عالم مُولَّد
  (شوارع ومبانٍ وأشجار)، كاميرا تتبع وتدور بالسحب، قفز وإطلاق نار، وجمع نقاط وأعداء،
  بجودة **Full HD** أو **4K Ultra HD** مع ضبط تلقائي حسب الجهاز. والألعاب 2D تعمل
  بمحرك Canvas سريع، وWorld Builder يبني ويعرض العالم ثلاثي الأبعاد الكامل.
- App Studio يولّد واجهات وشاشات تفاعلية ويصدّرها كموقع مستقل؛ ولا ينتج ملف
  `.ipa` أو `.apk` جاهزاً للمتجر، فالنشر في المتاجر يحتاج أدوات وحساب مطوّر خارجي.
- النشر داخل المنصة والمشاركة مجانيان ولا يحتاجان خادماً؛ والمتاجر الخارجية قد تفرض
  رسوم حساب مطوّر خاصة بها (Apple وGoogle Play وSteam مثلاً).

### التشغيل

افتح المنصة بزر **Run** في تطبيق FreeMilk، أو قدّم الملفات بأي خادم ثابت
(`python -m http.server` مثلاً) وافتح `index.html`.

---

## English

AI GAME STUDIO is a completely free web platform: describe a game or app idea,
and **OMAR AI** turns it into a project you can edit, run, export and publish.

- **Free forever** — no subscriptions, no paid tiers, no fees on design tools,
  editing or exporting project files. Optional third-party costs (app stores,
  paid hosting) are stated before use.
- **OMAR AI** runs locally in the browser: it reads the idea (Arabic or English),
  picks the genre, dimensions, elements and palette, then generates the project
  spec, code and interfaces. No API key, no paid service.
- **Game Studio** generates playable games — real 3D gameplay with three.js
  (character, follow camera, jumping, shooting, collectibles, enemies) at Full HD
  or 4K quality, plus fast 2D canvas games — with keyboard and touch controls.
- **App Studio** generates interactive app screens (store, education, social, AI,
  entertainment, utility) with phone/tablet/desktop preview and HTML export.
- **World Builder** generates a real three.js scene — cities, streets, buildings,
  houses, cars, trees, mountains, sea and beach — with orbit/zoom and day/night.
- **Quality** — Full HD or 4K Ultra HD, chosen automatically from the device.
- **Export and share** — standalone playable HTML, standalone app HTML, project JSON,
  and share links that carry the project itself.
- **Publish Center** — run, save, export, publish, plus the external store checklist.

Everything is stored on the device (localStorage) with JSON backup and restore.

### Running

Open the platform with **Run** in the FreeMilk app, or serve the files as static
files (`python -m http.server`) and open `index.html`.
