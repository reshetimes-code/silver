export interface OverlayTemplate {
  id: string;
  name: string;
  nameHe: string;
  description: string;
  // CSS-based overlay - no image files needed
  style: 'elegant-gold' | 'neon-party' | 'floral-garden' | 'glitter-glam' | 'classic-frame';
  previewColor: string;
}

export const overlayTemplates: OverlayTemplate[] = [
  {
    id: 'elegant-gold',
    name: 'Elegant Gold',
    nameHe: 'זהב אלגנטי',
    description: 'Luxurious gold border with ornamental corners',
    style: 'elegant-gold',
    previewColor: '#D4AF37',
  },
  {
    id: 'neon-party',
    name: 'Neon Party',
    nameHe: 'ניאון מסיבה',
    description: 'Vibrant neon glow border with party vibes',
    style: 'neon-party',
    previewColor: '#FF00FF',
  },
  {
    id: 'floral-garden',
    name: 'Floral Garden',
    nameHe: 'גן פרחים',
    description: 'Beautiful floral decorations around the frame',
    style: 'floral-garden',
    previewColor: '#FF69B4',
  },
  {
    id: 'glitter-glam',
    name: 'Glitter Glam',
    nameHe: 'גליטר גלאם',
    description: 'Sparkly glitter effect with glamorous style',
    style: 'glitter-glam',
    previewColor: '#C0C0C0',
  },
  {
    id: 'classic-frame',
    name: 'Classic Frame',
    nameHe: 'מסגרת קלאסית',
    description: 'Clean classic photo frame with elegant typography',
    style: 'classic-frame',
    previewColor: '#1a1a2e',
  },
];

export function getTemplate(id: string): OverlayTemplate | undefined {
  return overlayTemplates.find((t) => t.id === id);
}
