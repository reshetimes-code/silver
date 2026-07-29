'use client';

import { useStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { motion } from 'framer-motion';

export default function LanguageToggle() {
  const { locale, toggleLocale, showLanguageToggle } = useStore();

  if (!showLanguageToggle) return null;

  return (
    <motion.button
      onClick={toggleLocale}
      className="fixed bottom-20 left-3 z-40 px-2.5 py-1 rounded-full text-[10px] font-bold
        bg-white/10 backdrop-blur-md border border-white/20 text-white active:scale-95 transition-transform"
      whileTap={{ scale: 0.9 }}
    >
      {t(locale, 'switchLang')}
    </motion.button>
  );
}
