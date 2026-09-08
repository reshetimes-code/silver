'use client';

import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useHydrated } from '@/lib/use-hydrated';
import Logo from '@/components/ui/Logo';
import SpinningGlobe from '@/components/ui/SpinningGlobe';
import ParticleBackground from '@/components/ui/ParticleBackground';
import LanguageToggle from '@/components/ui/LanguageToggle';
import Link from 'next/link';

const content = {
  en: {
    title: 'Welcome To The World Of Photobooth',
    subtitle: 'Tell us which describes you best, and we’ll take you to the right place.',
    options: [
      {
        icon: '🎉',
        title: "I'm Planning My Own Event",
        desc: 'A wedding, bar/bat mitzvah, birthday or party — rent a photobooth for your one-time celebration.',
        button: "I'm Having A Private Event",
        href: '/landpage',
      },
      {
        icon: '💼',
        title: 'I Run Events Professionally',
        desc: 'Photobooth operators & event businesses — manage unlimited events, leads and photos with a full subscription.',
        button: 'I Own A Business In This Field',
        href: '/managerevent',
      },
    ],
  },
  he: {
    title: 'ברוכים הבאים לעולם הפוטובוט\'',
    subtitle: 'ספרו לנו מי אתם, ואנחנו נעביר אתכם למקום הנכון.',
    options: [
      {
        icon: '🎉',
        title: 'אני מתכנן/ת אירוע אישי',
        desc: 'חתונה, בר/בת מצווה, יום הולדת או מסיבה — השכירו פוטובוט\' לאירוע החד-פעמי שלכם.',
        button: 'אני עושה אירוע פרטי',
        href: '/landpage',
      },
      {
        icon: '💼',
        title: 'אני מנהל/ת אירועים במקצוע',
        desc: 'מפעילי פוטובוט\' ועסקי אירועים — נהלו אירועים, לידים ותמונות ללא הגבלה במסגרת מנוי מלא.',
        button: 'אני בעל עסק בתחום',
        href: '/managerevent',
      },
    ],
  },
};

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

export default function GatewayPage() {
  const hydrated = useHydrated();
  const { locale } = useStore();

  if (!hydrated) return null;

  const isRtl = locale === 'he';
  const c = content[locale];

  return (
    <div className="min-h-dvh relative bg-black flex flex-col items-center justify-center px-5 py-16" dir={isRtl ? 'rtl' : 'ltr'}>
      <ParticleBackground />
      <LanguageToggle />

      <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="relative z-10 mb-8 flex items-center justify-center">
        {/* logo_transperent.png isn't centered on its own camera-lens circle (extra
            space below for the "BOOTH" wordmark), so nudge the globe up/left to
            align its ring with the lens instead of the image's raw canvas center. */}
        <div className="absolute inset-0 flex items-center justify-center -translate-x-[3px] -translate-y-[19px] sm:-translate-y-[23px]">
          <SpinningGlobe size={230} />
        </div>
        <div className="relative">
          <Logo size="lg" />
        </div>
      </motion.div>

      <motion.div className="relative z-10 text-center max-w-xl mx-auto mb-10"
        {...fadeUp} transition={{ delay: 0.15, duration: 0.6 }}
      >
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">{c.title}</h1>
        <p className="text-base sm:text-lg text-white/50 leading-relaxed">{c.subtitle}</p>
        <div
          className="w-32 h-[1px] mx-auto mt-6"
          style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }}
        />
      </motion.div>

      <div className="relative z-10 grid sm:grid-cols-2 gap-5 max-w-3xl w-full">
        {c.options.map((opt, i) => (
          <motion.div
            key={opt.href}
            {...fadeUp}
            transition={{ delay: 0.3 + i * 0.15, duration: 0.6 }}
          >
            <Link href={opt.href} className="block h-full">
              <div className="glass-card p-7 sm:p-8 h-full flex flex-col text-center items-center hover:bg-white/[0.04] active:scale-[0.98] transition-all cursor-pointer">
                <span className="text-5xl mb-4">{opt.icon}</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 leading-snug">{opt.title}</h2>
                <p className="text-sm sm:text-base text-white/50 leading-relaxed mb-6 flex-1">{opt.desc}</p>
                <span className="btn-glow w-full text-base">{opt.button}</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
