'use client';

import { useStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { motion } from 'framer-motion';

export default function LanguageToggle() {
  const { locale, toggleLocale } = useStore();

  return (
    <motion.button
      onClick={toggleLocale}
      className="fixed top-3 right-3 z-50 px-3 py-1.5 rounded-full text-xs font-bold
        bg-white/10 backdrop-blur-md border border-white/20 text-white active:scale-95 transition-transform"
      style={{ paddingTop: 'calc(6px + var(--safe-top, 0px))' }}
      whileTap={{ scale: 0.9 }}
    >
      {t(locale, 'switchLang')}
    </motion.button>
  );
}
