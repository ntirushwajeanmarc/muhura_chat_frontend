import React from 'react';
import { Hash, Users, MessageCircle } from 'lucide-react';

export default function RoomTypeIcon({ room, size = 20, className = 'text-wa-muted' }) {
  const props = { size, strokeWidth: 1.75, className, 'aria-hidden': true };
  if (room?.type === 'public') return <Hash {...props} />;
  if (room?.type === 'group') return <Users {...props} />;
  return <MessageCircle {...props} />;
}
