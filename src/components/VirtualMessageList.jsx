import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

const VirtualMessageList = forwardRef(function VirtualMessageList(
  {
    scrollRef,
    items,
    renderItem,
    header,
    footer,
    onNearTop,
    nearTopThreshold = 120,
  },
  ref
) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 88,
    overscan: 10,
    getItemKey: (index) => items[index]?.id ?? index,
  });

  useImperativeHandle(ref, () => ({
    scrollToIndex: (index, opts) => virtualizer.scrollToIndex(index, opts),
    scrollToBottom: (behavior = 'smooth') => {
      if (items.length === 0) return;
      virtualizer.scrollToIndex(items.length - 1, { align: 'end', behavior });
    },
    getIndexForMessageId: (messageId) => items.findIndex((m) => m.id === messageId),
  }), [virtualizer, items]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !onNearTop) return undefined;
    const onScroll = () => {
      if (el.scrollTop <= nearTopThreshold) onNearTop();
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollRef, onNearTop, nearTopThreshold]);

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <>
      {header}
      <div
        className="relative w-full"
        style={{ height: items.length > 0 ? virtualizer.getTotalSize() : 0 }}
      >
        {virtualItems.map((vItem) => {
          const msg = items[vItem.index];
          if (!msg) return null;
          return (
            <div
              key={vItem.key}
              data-index={vItem.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${vItem.start}px)` }}
            >
              {renderItem(msg, vItem.index)}
            </div>
          );
        })}
      </div>
      {footer}
    </>
  );
});

export default VirtualMessageList;
