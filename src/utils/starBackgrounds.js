/** WhatsApp-style text star backgrounds (id must match backend starBackgrounds.js). */
export const STAR_BACKGROUNDS = [
  { id: 'slate', background: 'linear-gradient(145deg, #3b4a54 0%, #2a3942 100%)', color: '#ffffff' },
  { id: 'forest', background: 'linear-gradient(145deg, #1b4332 0%, #2d6a4f 100%)', color: '#ffffff' },
  { id: 'teal', background: 'linear-gradient(145deg, #075e54 0%, #128c7e 100%)', color: '#ffffff' },
  { id: 'ocean', background: 'linear-gradient(145deg, #0c4a6e 0%, #0369a1 100%)', color: '#ffffff' },
  { id: 'indigo', background: 'linear-gradient(145deg, #312e81 0%, #4f46e5 100%)', color: '#ffffff' },
  { id: 'grape', background: 'linear-gradient(145deg, #581c87 0%, #7e22ce 100%)', color: '#ffffff' },
  { id: 'berry', background: 'linear-gradient(145deg, #831843 0%, #be185d 100%)', color: '#ffffff' },
  { id: 'sunset', background: 'linear-gradient(145deg, #9a3412 0%, #ea580c 100%)', color: '#ffffff' },
  { id: 'amber', background: 'linear-gradient(145deg, #92400e 0%, #d97706 100%)', color: '#ffffff' },
  { id: 'rose', background: 'linear-gradient(145deg, #9f1239 0%, #e11d48 100%)', color: '#ffffff' },
  { id: 'midnight', background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff' },
  { id: 'charcoal', background: 'linear-gradient(145deg, #171717 0%, #404040 100%)', color: '#ffffff' },
];

export const DEFAULT_STAR_BACKGROUND = 'teal';

export function getStarBackground(id) {
  return STAR_BACKGROUNDS.find((b) => b.id === id) || STAR_BACKGROUNDS.find((b) => b.id === DEFAULT_STAR_BACKGROUND);
}
