'use client';

import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useHydrated } from '@/lib/use-hydrated';
import Logo from '@/components/ui/Logo';
import LanguageToggle from '@/components/ui/LanguageToggle';
import ParticleBackground from '@/components/ui/ParticleBackground';
import HeroSlider from '@/components/ui/HeroSlider';
import BottomNav from '@/components/ui/BottomNav';
import Link from 'next/link';

const content = {
  en: {
    hero: {
      title: 'The Ultimate Photobooth Experience',
      subtitle: 'Transform every event into unforgettable memories with our smart photo booth system',
    },
    features: [
      { icon: '📸', title: 'Instant Capture', desc: 'Guests take photos directly from their phone — no app needed, just scan the QR code' },
      { icon: '🖼️', title: 'Custom Frames', desc: 'Upload beautiful overlay frames for each event — branded, themed, or seasonal designs' },
      { icon: '🖨️', title: 'Instant Print', desc: 'Photos are sent to the printer instantly — guests pick up their prints at the booth' },
      { icon: '💬', title: 'WhatsApp Share', desc: 'Guests receive their photos via WhatsApp — share with friends and family immediately' },
      { icon: '🛡️', title: 'AI Moderation', desc: 'Google Vision AI automatically screens every photo — no inappropriate content reaches print' },
      { icon: '📊', title: 'Full Dashboard', desc: 'Manage events, photos, and prints from a powerful admin panel — everything in one place' },
    ],
    howItWorks: {
      title: 'How It Works',
      steps: [
        { num: '01', title: 'Create an Event', desc: 'Set up your event with custom frames and print limits' },
        { num: '02', title: 'Share the QR Code', desc: 'Place the QR code at your venue — guests scan to start' },
        { num: '03', title: 'Guests Take Photos', desc: 'Choose square or TikTok format, add fun frames' },
        { num: '04', title: 'Print & Share', desc: 'Photos print instantly and get shared via WhatsApp' },
      ],
    },
    testimonials: {
      title: 'What Our Clients Say',
      items: [
        { name: 'Sarah K.', event: 'Wedding', text: 'The photo booth was the highlight of our wedding! Guests loved the instant prints and WhatsApp sharing.' },
        { name: 'David M.', event: 'Bar Mitzvah', text: 'So easy to set up and manage. The kids had an amazing time with the custom frames. Highly recommend!' },
        { name: 'Rachel L.', event: 'Corporate Event', text: 'Professional, reliable, and beautiful results. Our branded frames looked incredible. Will definitely use again.' },
      ],
    },
    eventTypes: {
      title: 'Perfect For Every Event',
      items: ['Weddings', 'Bar/Bat Mitzvah', 'Birthday Parties', 'Corporate Events', 'Sweet 16', 'Baby Showers', 'Holidays', 'Graduations'],
    },
    cta: {
      title: 'Ready to Get Started?',
      subtitle: 'Create your account and set up your first event in minutes',
      button: 'Start Now',
    },
    contact: {
      title: 'Contact Us',
      subtitle: 'Have questions? We\'re here to help',
      phone: '(310) 999-5929',
      email: 'beautifulphotobooth@gmail.com',
    },
  },
  he: {
    hero: {
      title: 'חוויית הפוטובוט\' המושלמת',
      subtitle: 'הפכו כל אירוע לזיכרונות בלתי נשכחים עם מערכת הפוטובוט\' החכמה שלנו',
    },
    features: [
      { icon: '📸', title: 'צילום מיידי', desc: 'האורחים מצלמים ישירות מהטלפון — ללא אפליקציה, רק סריקת קוד QR' },
      { icon: '🖼️', title: 'מסגרות מותאמות', desc: 'העלו מסגרות מעוצבות לכל אירוע — ברנדינג, ערכות נושא, ועיצובים עונתיים' },
      { icon: '🖨️', title: 'הדפסה מיידית', desc: 'התמונות נשלחות למדפסת באופן מיידי — האורחים אוספים את ההדפסות בעמדה' },
      { icon: '💬', title: 'שיתוף בוואטסאפ', desc: 'האורחים מקבלים את התמונות בוואטסאפ — שיתוף מיידי עם חברים ומשפחה' },
      { icon: '🛡️', title: 'מודרציה חכמה', desc: 'בינה מלאכותית של Google סורקת כל תמונה — אין תוכן לא הולם שמגיע להדפסה' },
      { icon: '📊', title: 'לוח בקרה מלא', desc: 'נהלו אירועים, תמונות והדפסות מפאנל ניהול חזק — הכל במקום אחד' },
    ],
    howItWorks: {
      title: 'איך זה עובד',
      steps: [
        { num: '01', title: 'צרו אירוע', desc: 'הגדירו אירוע עם מסגרות מותאמות ומגבלות הדפסה' },
        { num: '02', title: 'שתפו את ה-QR', desc: 'הציבו את קוד ה-QR במקום האירוע — האורחים סורקים' },
        { num: '03', title: 'האורחים מצלמים', desc: 'בחרו פורמט מרובע או טיקטוק, הוסיפו מסגרות כיפיות' },
        { num: '04', title: 'הדפיסו ושתפו', desc: 'התמונות מודפסות מיד ונשלחות בוואטסאפ' },
      ],
    },
    testimonials: {
      title: 'מה הלקוחות אומרים',
      items: [
        { name: 'שרה כ.', event: 'חתונה', text: 'הפוטובוט\' היה ההיילייט של החתונה! האורחים אהבו את ההדפסות המיידיות והשיתוף בוואטסאפ.' },
        { name: 'דוד מ.', event: 'בר מצווה', text: 'כל כך קל להתקנה ולניהול. הילדים נהנו בטירוף מהמסגרות המותאמות. ממליץ בחום!' },
        { name: 'רחל ל.', event: 'אירוע חברה', text: 'מקצועי, אמין, ותוצאות יפות. המסגרות הממותגות נראו מדהים. בהחלט נשתמש שוב.' },
      ],
    },
    eventTypes: {
      title: 'מושלם לכל אירוע',
      items: ['חתונות', 'בר/בת מצווה', 'מסיבות יום הולדת', 'אירועי חברה', 'Sweet 16', 'בייבי שאוור', 'חגים', 'סיום לימודים'],
    },
    cta: {
      title: 'מוכנים להתחיל?',
      subtitle: 'צרו חשבון והקימו את האירוע הראשון בדקות',
      button: 'התחילו עכשיו',
    },
    contact: {
      title: 'צרו קשר',
      subtitle: 'יש שאלות? אנחנו כאן לעזור',
      phone: '(310) 999-5929',
      email: 'beautifulphotobooth@gmail.com',
    },
  },
};

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.6 },
};

export default function LandingPage() {
  const hydrated = useHydrated();
  const { locale } = useStore();

  if (!hydrated) return null;

  const isRtl = locale === 'he';
  const c = content[locale];

  return (
    <div className="min-h-dvh relative bg-black pb-24" dir={isRtl ? 'rtl' : 'ltr'}>
      <ParticleBackground />
      <LanguageToggle />

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
      <section className="relative z-10 pt-6 pb-6 px-5 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="text-2xl sm:text-3xl font-black text-white mb-3 max-w-lg mx-auto leading-tight"
        >
          {c.hero.title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          className="text-sm text-white/40 max-w-md mx-auto leading-relaxed"
        >
          {c.hero.subtitle}
        </motion.p>

        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.9, duration: 0.6 }}
          className="w-32 h-[1px] mx-auto mt-5"
          style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }}
        />
      </section>

      {/* ===== FEATURES ===== */}
      <section className="relative z-10 px-5 py-8 max-w-lg mx-auto">
        <div className="grid grid-cols-2 gap-3">
          {c.features.map((f, i) => (
            <motion.div
              key={i} {...fadeUp} transition={{ delay: 0.1 * i, duration: 0.5 }}
              className="glass-card p-4 text-center"
            >
              <span className="text-2xl block mb-2">{f.icon}</span>
              <h3 className="text-xs font-bold text-white mb-1">{f.title}</h3>
              <p className="text-[10px] text-white/35 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="relative z-10 px-5 py-8 max-w-lg mx-auto">
        <motion.h2 {...fadeUp} className="text-xl font-bold text-white text-center mb-6">{c.howItWorks.title}</motion.h2>
        <div className="space-y-4">
          {c.howItWorks.steps.map((step, i) => (
            <motion.div key={i} {...fadeUp} transition={{ delay: 0.15 * i }}
              className="flex items-start gap-4"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-black"
                style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
                {step.num}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{step.title}</h3>
                <p className="text-xs text-white/35 mt-0.5">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== EVENT TYPES ===== */}
      <section className="relative z-10 px-5 py-8 max-w-lg mx-auto text-center">
        <motion.h2 {...fadeUp} className="text-xl font-bold text-white mb-5">{c.eventTypes.title}</motion.h2>
        <motion.div {...fadeUp} className="flex flex-wrap justify-center gap-2">
          {c.eventTypes.items.map((item, i) => (
            <span key={i} className="px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(212,175,55,0.08)', color: 'rgba(212,175,55,0.6)', border: '1px solid rgba(212,175,55,0.1)' }}>
              {item}
            </span>
          ))}
        </motion.div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="relative z-10 px-5 py-8 max-w-lg mx-auto">
        <motion.h2 {...fadeUp} className="text-xl font-bold text-white text-center mb-6">{c.testimonials.title}</motion.h2>
        <div className="space-y-3">
          {c.testimonials.items.map((t, i) => (
            <motion.div key={i} {...fadeUp} transition={{ delay: 0.15 * i }}
              className="glass-card p-5"
            >
              <div className="flex items-center gap-1 mb-2">
                {[...Array(5)].map((_, j) => (
                  <svg key={j} width="12" height="12" viewBox="0 0 24 24" fill="#D4AF37"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                ))}
              </div>
              <p className="text-xs text-white/60 leading-relaxed mb-3">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))', color: '#D4AF37' }}>
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{t.name}</p>
                  <p className="text-[10px] text-white/30">{t.event}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="relative z-10 px-5 py-10 text-center">
        <motion.div {...fadeUp} className="glass-card p-8 max-w-sm mx-auto">
          <h2 className="text-xl font-bold text-white mb-2">{c.cta.title}</h2>
          <p className="text-xs text-white/40 mb-5">{c.cta.subtitle}</p>
          <Link href="/admin">
            <button className="btn-glow w-full">{c.cta.button}</button>
          </Link>
        </motion.div>
      </section>

      {/* ===== CONTACT ===== */}
      <section id="contact" className="relative z-10 px-5 py-8 text-center max-w-sm mx-auto">
        <motion.div {...fadeUp}>
          <h2 className="text-lg font-bold text-white mb-1">{c.contact.title}</h2>
          <p className="text-xs text-white/40 mb-4">{c.contact.subtitle}</p>
          <div className="flex flex-col gap-2">
            <a href="tel:3109995929"
              className="glass-card p-3 flex items-center justify-center gap-2 text-sm text-white/60 active:scale-95 transition-transform">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
              {c.contact.phone}
            </a>
            <a href="mailto:beautifulphotobooth@gmail.com"
              className="glass-card p-3 flex items-center justify-center gap-2 text-sm text-white/60 active:scale-95 transition-transform">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5">
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
