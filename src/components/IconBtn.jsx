import React, { forwardRef } from 'react';

const composerBtn =
  'touch-target w-9 h-9 rounded-lg inline-flex items-center justify-center text-wa-muted hover:text-slate-200 hover:bg-wa-panel disabled:opacity-40 shrink-0 transition-colors';

const IconBtn = forwardRef(function IconBtn(
  {
    icon: Icon,
    className = composerBtn,
    size = 20,
    strokeWidth = 1.75,
    children,
    ...props
  },
  ref
) {
  return (
    <button type="button" ref={ref} className={className} {...props}>
      {Icon ? <Icon size={size} strokeWidth={strokeWidth} aria-hidden /> : children}
    </button>
  );
});

export default IconBtn;
export { composerBtn };
