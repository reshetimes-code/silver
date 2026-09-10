export const metadata = {
  title: "Privacy Policy | PHOTOBOOTH",
  description: "Privacy policy for the Photobooth QR service.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-dvh bg-black text-white px-5 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black mb-2">מדיניות פרטיות</h1>
        <p className="text-white/40 text-sm mb-10">עודכן לאחרונה: ספטמבר 2026</p>

        <div className="space-y-8 text-white/70 leading-relaxed text-sm sm:text-base" dir="rtl">
          <section>
            <h2 className="text-white font-bold text-lg mb-2">1. כללי</h2>
            <p>
              מסמך זה מתאר כיצד Photobooth QR (&quot;השירות&quot;, &quot;אנחנו&quot;) אוסף, משתמש
              ושומר מידע על משתמשי המערכת — הן מפעילי אירועים ומנהלי חשבונות, והן אורחים המשתתפים
              באירועים ומצלמים תמונות דרך עמדת הפוטובות&apos; הדיגיטלית.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-2">2. איזה מידע אנחנו אוספים</h2>
            <ul className="list-disc pr-5 space-y-1.5">
              <li><b className="text-white/90">אורחי אירוע:</b> מספר טלפון (לצורך שליחת התמונה בוואטסאפ), והתמונות שצולמו בעמדה.</li>
              <li><b className="text-white/90">מנהלי חשבון / מפעילי אירועים:</b> שם, כתובת אימייל, מספר טלפון, וסיסמה מוצפנת (או פרטי התחברות Google).</li>
              <li><b className="text-white/90">חיבור Dropbox (אופציונלי):</b> אם מנהל חשבון בוחר לחבר את חשבון ה-Dropbox האישי/עסקי שלו, אנו שומרים אסימון גישה (access token) מוצפן כדי להעלות את תמונות האירועים שלו ישירות לתיקייה שבחר. איננו שומרים את הסיסמה של חשבון ה-Dropbox עצמו.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-2">3. כיצד אנחנו משתמשים במידע</h2>
            <ul className="list-disc pr-5 space-y-1.5">
              <li>שליחת התמונות שצולמו לאורח דרך וואטסאפ, לפי מספר הטלפון שסיפק.</li>
              <li>גיבוי וארגון תמונות האירוע בתיקיית Dropbox של מנהל האירוע (המשותפת או האישית, לפי בחירתו).</li>
              <li>סינון תוכן אוטומטי (Content Moderation) לתמונות שהועלו, באמצעות שירות בינה מלאכותית של Google, כדי לזהות תוכן לא הולם לפני הדפסה/שיתוף.</li>
              <li>ניהול חשבונות משתמשים, אירועים ולידים במערכת עבור מנהלי חשבונות.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-2">4. שיתוף מידע עם צדדים שלישיים</h2>
            <p>
              איננו מוכרים מידע אישי לצדדים שלישיים. מידע מסוים מועבר לספקי שירות הנדרשים להפעלת
              המערכת בלבד: Dropbox (אחסון תמונות, לפי בחירת מנהל האירוע), Google (סינון תוכן
              אוטומטי, התחברות עם חשבון Google), ו-WhatsApp (שליחת תמונות לאורחים).
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-2">5. שמירת מידע</h2>
            <p>
              מידע נשמר במערכת כל עוד החשבון/האירוע פעילים, או עד לבקשת מחיקה. ניתן לבקש מחיקת
              מידע אישי בכל עת בפנייה לכתובת שבתחתית עמוד זה.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-2">6. אבטחת מידע</h2>
            <p>
              אנו נוקטים באמצעי אבטחה סבירים — לרבות הצפנת סיסמאות, חיבור מוצפן (HTTPS) בין
              הדפדפן לשרת, והגבלת גישה למידע לפי הרשאות תפקיד — כדי להגן על המידע שנאסף.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-2">7. יצירת קשר</h2>
            <p>
              לשאלות, בקשות עיון או מחיקת מידע, ניתן ליצור קשר בכתובת:{" "}
              <a href="mailto:beautifulphotobooth@gmail.com" className="text-[#D4AF37] underline">
                beautifulphotobooth@gmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
