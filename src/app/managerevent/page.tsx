'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useHydrated } from '@/lib/use-hydrated';
import Logo from '@/components/ui/Logo';
import ParticleBackground from '@/components/ui/ParticleBackground';
import HeroSlider from '@/components/ui/HeroSlider';
import BottomNav from '@/components/ui/BottomNav';
import Link from 'next/link';

const content = {
  en: {
    hero: {
      title: 'The Photobooth Platform That Books Your Next Event',
      subtitlePre: "Run a stunning, fully-branded photo booth at every event — while the system quietly turns tonight's guests into tomorrow's ",
      subtitleHighlight: 'leads',
      subtitlePost: '.',
    },
    features: [
      { icon: '📸', title: 'Instant Capture', desc: 'Guests take their photo straight from their own phone camera — no app to download, no waiting in line. They just scan the event QR code and go.' },
      { icon: '🖼️', title: 'Custom Overlays', desc: 'Upload a branded frame for every event — logo, names, colors, even seasonal designs. Every print looks like it was made just for that party.' },
      { icon: '🖨️', title: 'Instant Print', desc: "The moment a photo is approved it's sent straight to your printer. Guests are holding a real, physical print within seconds." },
      { icon: '💬', title: 'WhatsApp Delivery', desc: "Every guest also gets their photo sent straight to WhatsApp — shared with friends and family before they've even left the booth." },
      { icon: '🛡️', title: 'AI Moderation', desc: "Every photo is automatically screened by Google's Vision AI before it's allowed to print — nothing inappropriate ever reaches the counter." },
      { icon: '💎', title: 'Automatic Lead Capture', desc: 'While guests wait for their photo, the system asks if they have an event of their own coming up — qualified leads land straight in your dashboard.' },
      { icon: '📊', title: 'Multi-Event Dashboard', desc: 'Run unlimited events from one account — create, edit, activate or archive each one, and see every photo, print and lead in a single place.' },
      { icon: '☁️', title: 'Cloud Backup', desc: 'Every photo from every event is backed up automatically, so nothing is ever lost — even if a phone breaks or a laptop is stolen.' },
    ],
    howItWorks: {
      title: 'From Sign-Up To Live Event',
      steps: [
        { num: '01', title: 'Create Your Account', desc: "Sign up and you're inside your own private dashboard in under a minute — every event, photo and lead you ever collect lives here." },
        { num: '02', title: 'Build Your Event', desc: 'Give it a name and a date, set a print limit if you want one, and optionally upload a custom frame with your branding or your client’s.' },
        { num: '03', title: 'Share One QR Code', desc: 'The system generates one link and QR code for that event. Print it, project it, or stick it on the booth — that’s the entire setup.' },
        { num: '04', title: 'Guests Take It From There', desc: 'Every guest scans, smiles, and gets an instant print plus a WhatsApp copy — while new photos and leads roll in live on your phone.' },
      ],
    },
    leadEngine: {
      title: 'Every Event Quietly Books You Another One',
      subtitle: "Right after taking their photo, every guest is asked three short questions — and if they're planning something too, their details land straight in your Leads tab.",
      steps: [
        { q: 'One moment before we start...', a: 'Are you celebrating an upcoming event?', emoji: '🎉' },
        { q: 'Interesting!', a: 'Would you like to receive a photobooth offer for your event?', emoji: '✨' },
        { q: "We'd love to get in touch", a: 'Just a name and an estimated date.', emoji: '📅' },
      ],
      result: "Their name, phone number and event date are saved instantly and tagged to the exact event they came from — so you know precisely which party brought you the lead, ready to follow up on WhatsApp.",
    },
    eventTypes: {
      title: 'Perfect For Every Event',
      items: ['Weddings', 'Bar/Bat Mitzvah', 'Birthday Parties', 'Corporate Events', 'Sweet 16', 'Baby Showers', 'Holidays', 'Graduations'],
    },
    gallery: {
      title: 'See The Real Prints',
      subtitle: 'Every photo below is an actual print produced by the system at a real event — not a mockup.',
    },
    testimonials: {
      title: 'What Our Clients Say',
      items: [
        { name: 'Sarah K.', event: 'Wedding', text: 'The photo booth was the highlight of our wedding! Guests loved the instant prints and WhatsApp sharing.' },
        { name: 'David M.', event: 'Bar Mitzvah', text: 'So easy to set up and manage. The kids had an amazing time with the custom frames. Highly recommend!' },
        { name: 'Rachel L.', event: 'Corporate Event', text: 'Professional, reliable, and beautiful results. Our branded frames looked incredible. Will definitely use again.' },
      ],
    },
    cta: {
      title: 'Ready To Put Your Photobooth To Work?',
      subtitle: 'Create your account and your first event will be live in minutes — no setup calls, no waiting.',
      button: 'Create My Account',
      bullets: ['No app for guests to download', 'Works at any venue, on any WiFi', 'You own every photo and every lead'],
    },
    contact: {
      title: 'Contact Us',
      subtitle: 'Have questions? We’re here to help',
      phone: '(310) 999-5929',
      email: 'beautifulphotobooth@gmail.com',
    },
  },
  he: {
    hero: {
      title: 'מערכת הפוטובוט\' שסוגרת לכם את האירוע הבא',
      subtitlePre: 'מפעילים עמדת פוטובוט\' מרשימה ומותאמת אישית בכל אירוע — והמערכת דואגת שהאורחים של הערב יהפכו ל',
      subtitleHighlight: 'לידים חדשים',
      subtitlePost: ' של מחר.',
    },
    features: [
      { icon: '📸', title: 'צילום מיידי', desc: 'האורחים מצלמים ישירות מהמצלמה של הטלפון שלהם — בלי להוריד אפליקציה ובלי לעמוד בתור. הם סורקים את קוד ה-QR של האירוע וזהו.' },
      { icon: '🖼️', title: 'מסגרות מותאמות', desc: 'מעלים מסגרת ממותגת לכל אירוע — לוגו, שמות, צבעים ואפילו עיצובים עונתיים. כל הדפסה נראית כאילו נוצרה בדיוק בשביל המסיבה הזו.' },
      { icon: '🖨️', title: 'הדפסה מיידית', desc: 'ברגע שתמונה מאושרת היא נשלחת ישר למדפסת. האורחים מחזיקים הדפסה פיזית אמיתית תוך שניות.' },
      { icon: '💬', title: 'שליחה בוואטסאפ', desc: 'כל אורח מקבל גם את התמונה שלו ישירות לוואטסאפ — משותפת עם חברים ומשפחה עוד לפני שעזבו את העמדה.' },
      { icon: '🛡️', title: 'מודרציה חכמה', desc: 'כל תמונה נבדקת אוטומטית על ידי בינה מלאכותית של Google (Vision AI) לפני שהיא מקבלת אישור להדפסה — אף תוכן לא הולם לא מגיע לדלפק.' },
      { icon: '💎', title: 'לכידת לידים אוטומטית', desc: 'בזמן שהאורחים מחכים לתמונה, המערכת שואלת בעדינות אם יש להם אירוע משלהם בקרוב — לידים רלוונטיים נופלים ישר לתוך לוח הבקרה שלכם.' },
      { icon: '📊', title: 'לוח בקרה למספר אירועים', desc: 'מנהלים אירועים ללא הגבלה מחשבון אחד — יוצרים, מעדכנים, מפעילים או מכבים כל אירוע, ורואים כל תמונה, הדפסה וליד במקום אחד.' },
      { icon: '☁️', title: 'גיבוי בענן', desc: 'כל תמונה מכל אירוע מגובה אוטומטית, כך שכלום לא הולך לאבוד — גם אם טלפון מתקלקל או מחשב נגנב.' },
    ],
    howItWorks: {
      title: 'מהרשמה לאירוע חי',
      steps: [
        { num: '01', title: 'פתחו חשבון', desc: 'נרשמים ואתם בתוך לוח הבקרה הפרטי שלכם בפחות מדקה — כל אירוע, תמונה וליד שתאספו אי פעם יחיו כאן.' },
        { num: '02', title: 'בנו את האירוע', desc: 'נותנים שם ותאריך, קובעים מגבלת הדפסות אם רוצים, ואפשר להעלות מסגרת מותאמת עם המיתוג שלכם או של הלקוח.' },
        { num: '03', title: 'שתפו קוד QR אחד', desc: 'המערכת מייצרת קישור וקוד QR אחד לאותו אירוע. מדפיסים אותו, מקרינים אותו או מדביקים אותו על העמדה — זו כל ההתקנה.' },
        { num: '04', title: 'והאורחים ממשיכים משם', desc: 'כל אורח סורק, מצלם ומקבל הדפסה מיידית + עותק בוואטסאפ — ואתם צופים בלידים ובתמונות חדשות זורמים בזמן אמת מהטלפון שלכם.' },
      ],
    },
    leadEngine: {
      title: 'כל אירוע סוגר לכם בעדינות את האירוע הבא',
      subtitle: 'ממש אחרי שהאורח מצלם, הוא מקבל שלוש שאלות קצרות — ואם הוא מתכנן משהו בעצמו, הפרטים שלו נופלים ישר לתוך לשונית הלידים שלכם.',
      steps: [
        { q: 'רגע לפני שמצלמים...', a: 'האם אתם חוגגים אירוע בקרוב?', emoji: '🎉' },
        { q: 'מעניין!', a: 'תרצו שנחזור אליכם עם הצעה לפוטובות\' לאירוע שלכם?', emoji: '✨' },
        { q: 'נשמח ליצור איתכם קשר', a: 'רק שם ותאריך משוער.', emoji: '📅' },
      ],
      result: 'השם, הטלפון ותאריך האירוע המשוער נשמרים באופן מיידי ומתויגים לאירוע המדויק שממנו הגיעו — כך שאתם יודעים בדיוק איזו מסיבה הביאה לכם את הליד, ומוכנים להמשיך בוואטסאפ.',
    },
    eventTypes: {
      title: 'מושלם לכל אירוע',
      items: ['חתונות', 'בר/בת מצווה', 'מסיבות יום הולדת', 'אירועי חברה', 'Sweet 16', 'בייבי שאוור', 'חגים', 'סיום לימודים'],
    },
    gallery: {
      title: 'ההדפסות האמיתיות',
      subtitle: 'כל תמונה למטה היא הדפסה אמיתית שהופקה על ידי המערכת באירוע אמיתי — לא הדמיה.',
    },
    testimonials: {
      title: 'מה הלקוחות אומרים',
      items: [
        { name: 'שרה כ.', event: 'חתונה', text: 'הפוטובוט\' היה ההיילייט של החתונה! האורחים אהבו את ההדפסות המיידיות והשיתוף בוואטסאפ.' },
        { name: 'דוד מ.', event: 'בר מצווה', text: 'כל כך קל להתקנה ולניהול. הילדים נהנו בטירוף מהמסגרות המותאמות. ממליץ בחום!' },
        { name: 'רחל ל.', event: 'אירוע חברה', text: 'מקצועי, אמין, ותוצאות יפות. המסגרות הממותגות נראו מדהים. בהחלט נשתמש שוב.' },
      ],
    },
    cta: {
      title: 'מוכנים להפעיל את הפוטובוט\' שלכם?',
      subtitle: 'פותחים חשבון והאירוע הראשון שלכם עולה לאוויר בתוך דקות — בלי שיחת הקמה, בלי לחכות.',
      button: 'פתיחת חשבון',
      bullets: ['בלי אפליקציה להורדה לאורחים', 'עובד בכל מקום, בכל רשת WiFi', 'כל תמונה וכל ליד — נשארים שלכם'],
    },
    contact: {
      title: 'צרו קשר',
      subtitle: 'יש שאלות? אנחנו כאן לעזור',
      phone: '(310) 999-5929',
      email: 'beautifulphotobooth@gmail.com',
    },
  },
};

const GALLERY_IMAGES = [
  '/samples/sample-1.jpg', '/samples/sample-2.jpg', '/samples/sample-3.jpg',
  '/samples/sample-4.jpg', '/samples/sample-5.jpg', '/samples/sample-6.jpg',
  '/samples/sample-7.jpg', '/samples/sample-8.jpg', '/samples/sample-9.jpg',
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.6 },
};

export default function LandingPage() {
  const hydrated = useHydrated();
  const { locale, toggleLocale } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  // Check if already logged in
  useState(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth-token');
      if (token) setLoggedIn(true);
    }
  });

  if (!hydrated) return null;

  const isRtl = locale === 'he';
  const he = locale === 'he';
  const c = content[locale];

  return (
    <div className="min-h-dvh relative bg-black pb-24" dir={isRtl ? 'rtl' : 'ltr'}>
      <ParticleBackground />

      {/* Hamburger button — top right.
          Offset by the safe-area insets, otherwise on phones with a notch /
          Dynamic Island / camera cutout the button sits under it and can't be tapped. */}
      <button
        onClick={() => setMenuOpen(true)}
        className="fixed z-50 w-11 h-11 rounded-xl bg-black/50 backdrop-blur-md border border-white/15 flex flex-col items-center justify-center gap-1.5 active:scale-90 transition-transform"
        style={{
          top: 'calc(1rem + var(--safe-top, 0px))',
          right: 'calc(1rem + var(--safe-right, 0px))',
        }}
        aria-label="Menu"
      >
        <span className="w-5 h-[2px] block" style={{ background: '#D4AF37' }} />
        <span className="w-4 h-[2px] block" style={{ background: '#D4AF37' }} />
        <span className="w-5 h-[2px] block" style={{ background: '#D4AF37' }} />
      </button>

      {/* Sidebar Menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: isRtl ? -300 : 300 }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? -300 : 300 }}
              transition={{ type: 'spring', damping: 25 }}
              className={`fixed top-0 ${isRtl ? 'left-0' : 'right-0'} w-72 h-full z-50 overflow-y-auto`}
              style={{
                background: 'rgba(10,10,10,0.97)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderLeft: isRtl ? 'none' : '1px solid rgba(212,175,55,0.1)',
                borderRight: isRtl ? '1px solid rgba(212,175,55,0.1)' : 'none',
              }}
            >
              <div className="p-6">
                {/* Close */}
                <button onClick={() => setMenuOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 mb-6">
                  ✕
                </button>

                {/* Logo */}
                <div className="mb-6">
                  <Logo size="md" animate={false} />
                </div>

                <nav className="space-y-1">
                  {!loggedIn ? (
                    <Link href="/login" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-white/70 hover:bg-white/5 active:bg-white/10 transition-colors">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5">
                        <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" /><polyline points="10 17 15 12 10 7" />
                        <line x1="15" y1="12" x2="3" y2="12" />
                      </svg>
                      {he ? 'התחברות / הרשמה' : 'Login / Register'}
                    </Link>
                  ) : (
                    <>
                      <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-white/70 hover:bg-white/5 active:bg-white/10 transition-colors">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5">
                          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        {he ? 'האירועים שלי' : 'My Events'}
                      </Link>

                      <button onClick={() => {
                        localStorage.removeItem('auth-token');
                        localStorage.removeItem('auth-user');
                        setLoggedIn(false);
                        setMenuOpen(false);
                      }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-red-400/70 hover:bg-red-500/5 active:bg-red-500/10 transition-colors">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        {he ? 'התנתק' : 'Logout'}
                      </button>
                    </>
                  )}

                  {/* Admin — always visible */}
                  <Link href="/admin" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-white/70 hover:bg-white/5 active:bg-white/10 transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5">
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                    </svg>
                    {he ? 'לוח בקרה (מנהל)' : 'Admin Panel'}
                  </Link>

                  <button onClick={() => { toggleLocale(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-white/70 hover:bg-white/5 active:bg-white/10 transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                    </svg>
                    {he ? 'English' : 'עברית'}
                  </button>

                  <Link href="/#contact" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-white/70 hover:bg-white/5 active:bg-white/10 transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                    </svg>
                    {he ? 'צרו קשר' : 'Contact Us'}
                  </Link>
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== HERO: Slider with Logo overlay ===== */}
      <div className="relative">
        <HeroSlider />
        {/* Logo centered on top of slider */}
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' as const, damping: 12 }}
          >
            <Logo size="xl" />
          </motion.div>
        </div>
      </div>

      {/* ===== Title section ===== */}
      <section className="relative z-10 pt-8 pb-8 px-5 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="text-4xl sm:text-5xl font-black text-white mb-4 max-w-2xl mx-auto leading-[1.1]"
        >
          {c.hero.title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          className="text-lg sm:text-xl font-medium text-white/80 max-w-xl mx-auto leading-relaxed"
        >
          {c.hero.subtitlePre}
          <span className="font-black" style={{ color: '#D4AF37' }}>{c.hero.subtitleHighlight}</span>
          {c.hero.subtitlePost}
        </motion.p>

        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.9, duration: 0.6 }}
          className="w-32 h-[1px] mx-auto mt-6"
          style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }}
        />
      </section>

      {/* ===== FEATURES ===== */}
      <section className="relative z-10 px-5 py-10 max-w-3xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {c.features.map((f, i) => (
            <motion.div
              key={i} {...fadeUp} transition={{ delay: 0.08 * i, duration: 0.5 }}
              className="glass-card p-5 text-center"
            >
              <span className="text-4xl block mb-3">{f.icon}</span>
              <h3 className="text-base font-bold text-white mb-1.5">{f.title}</h3>
              <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="relative z-10 px-5 py-10 max-w-2xl mx-auto">
        <motion.h2 {...fadeUp} className="text-3xl font-bold text-white text-center mb-8">{c.howItWorks.title}</motion.h2>
        <div className="space-y-6">
          {c.howItWorks.steps.map((step, i) => (
            <motion.div key={i} {...fadeUp} transition={{ delay: 0.15 * i }}
              className="flex items-start gap-5"
            >
              <div className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-lg font-black"
                style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
                {step.num}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{step.title}</h3>
                <p className="text-sm sm:text-base text-white/45 mt-1 leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== LEAD ENGINE SPOTLIGHT ===== */}
      <section className="relative z-10 px-5 py-10 max-w-2xl mx-auto">
        <motion.div {...fadeUp} className="glass-card p-6 sm:p-8" style={{ borderColor: 'rgba(212,175,55,0.3)' }}>
          <div className="text-center mb-8">
            <span className="text-4xl block mb-3">💎</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-tight">{c.leadEngine.title}</h2>
            <p className="text-sm sm:text-base text-white/50 max-w-lg mx-auto leading-relaxed">{c.leadEngine.subtitle}</p>
          </div>

          <div className="space-y-3 max-w-md mx-auto">
            {c.leadEngine.steps.map((s, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: 0.15 * i }}
                className="rounded-2xl p-4 flex items-start gap-3"
                style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span className="text-2xl flex-shrink-0">{s.emoji}</span>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <p className="text-sm font-bold text-white">{s.q}</p>
                  <p className="text-sm text-white/50 mt-0.5">{s.a}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="text-sm sm:text-base text-white/60 leading-relaxed text-center mt-8 max-w-lg mx-auto">
            {c.leadEngine.result}
          </p>
        </motion.div>
      </section>

      {/* ===== EVENT TYPES ===== */}
      <section className="relative z-10 px-5 py-10 max-w-2xl mx-auto text-center">
        <motion.h2 {...fadeUp} className="text-3xl font-bold text-white mb-6">{c.eventTypes.title}</motion.h2>
        <motion.div {...fadeUp} className="flex flex-wrap justify-center gap-2.5">
          {c.eventTypes.items.map((item, i) => (
            <span key={i} className="px-5 py-2.5 rounded-full text-sm sm:text-base font-bold"
              style={{ background: 'rgba(212,175,55,0.08)', color: 'rgba(212,175,55,0.75)', border: '1px solid rgba(212,175,55,0.15)' }}>
              {item}
            </span>
          ))}
        </motion.div>
      </section>

      {/* ===== REAL RESULTS GALLERY ===== */}
      <section className="relative z-10 px-5 py-10 max-w-3xl mx-auto">
        <motion.div {...fadeUp} className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-3">{c.gallery.title}</h2>
          <p className="text-sm sm:text-base text-white/45 max-w-lg mx-auto leading-relaxed">{c.gallery.subtitle}</p>
        </motion.div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {GALLERY_IMAGES.map((src, i) => (
            <motion.div key={src} {...fadeUp} transition={{ delay: 0.05 * i, duration: 0.5 }}
              className="rounded-2xl overflow-hidden aspect-[3/4]"
              style={{ border: '1px solid rgba(212,175,55,0.15)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="relative z-10 px-5 py-10 max-w-2xl mx-auto">
        <motion.h2 {...fadeUp} className="text-3xl font-bold text-white text-center mb-8">{c.testimonials.title}</motion.h2>
        <div className="space-y-4">
          {c.testimonials.items.map((t, i) => (
            <motion.div key={i} {...fadeUp} transition={{ delay: 0.15 * i }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, j) => (
                  <svg key={j} width="16" height="16" viewBox="0 0 24 24" fill="#D4AF37"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                ))}
              </div>
              <p className="text-base text-white/70 leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))', color: '#D4AF37' }}>
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{t.name}</p>
                  <p className="text-xs text-white/35">{t.event}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="relative z-10 px-5 py-12 text-center">
        <motion.div {...fadeUp} className="glass-card p-8 sm:p-10 max-w-lg mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-tight">{c.cta.title}</h2>
          <p className="text-sm sm:text-base text-white/50 mb-6">{c.cta.subtitle}</p>
          <Link href="/login">
            <button className="btn-glow w-full text-lg">{c.cta.button}</button>
          </Link>
          <div className="flex flex-col gap-2 mt-6 items-center">
            {c.cta.bullets.map((b, i) => (
              <p key={i} className="text-sm text-white/45 flex items-center gap-2">
                <span style={{ color: '#D4AF37' }}>✓</span> {b}
              </p>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ===== CONTACT ===== */}
      <section id="contact" className="relative z-10 px-5 py-10 text-center max-w-lg mx-auto">
        <motion.div {...fadeUp}>
          <h2 className="text-2xl font-bold text-white mb-2">{c.contact.title}</h2>
          <p className="text-sm sm:text-base text-white/45 mb-5">{c.contact.subtitle}</p>
          <div className="flex flex-col gap-3">
            <a href="tel:3109995929"
              className="glass-card p-4 flex items-center justify-center gap-3 text-lg text-white/70 active:scale-95 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
              {c.contact.phone}
            </a>
            <a href="mailto:beautifulphotobooth@gmail.com"
              className="glass-card p-4 flex items-center justify-center gap-3 text-base text-white/70 active:scale-95 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              {c.contact.email}
            </a>
          </div>
        </motion.div>
      </section>

      <BottomNav />
    </div>
  );
}
