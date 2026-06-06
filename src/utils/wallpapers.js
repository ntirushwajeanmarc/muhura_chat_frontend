export const WALLPAPERS = [
  { id: 'default', label: 'Classic', className: 'chat-wallpaper' },
  { id: 'dark', label: 'Dark', className: 'chat-wallpaper-dark' },
  { id: 'teal', label: 'Teal', className: 'chat-wallpaper-teal' },
  { id: 'midnight', label: 'Midnight', className: 'chat-wallpaper-midnight' },
  { id: 'warm', label: 'Warm', className: 'chat-wallpaper-warm' },
];

export function wallpaperClass(id) {
  return WALLPAPERS.find((w) => w.id === id)?.className || 'chat-wallpaper';
}
