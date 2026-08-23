import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const TOOLTIP_WIDTH = 176; // px, matches w-44 below
const TOOLTIP_MARGIN = 8; // px, min gap kept from the viewport edge

// Click-to-reveal, click-outside/Escape-to-dismiss tooltip - originally
// built for CategoryChip's trait/region icons, now shared with anything
// that needs the same interaction (e.g. UniquenessScore's UNIQ button).
// Also carries a plain native `title` (the heading alone, not the full
// description) on the trigger button, so a quick mouse hover still gets a
// simple preview without a click - every consumer gets this for free
// rather than needing to add its own title attribute back.
// UnlimitedSettingsPanel's own InfoTooltip stays separate: it always
// centers under a fixed spot next to a toggle, whereas this one can be
// triggered from anywhere on screen, including right up against a viewport
// edge, so a plain centered CSS anchor isn't enough. This measures the
// trigger's actual position on open, clamps the popup horizontally to stay
// on-screen, flips above the trigger if there's no room below, and renders
// through a portal so it's never constrained by an ancestor's layout/overflow.
export default function ClickTooltip({
  heading,
  description,
  children,
}: {
  heading: string;
  description: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  // Whether the popup is currently flipped above the trigger instead of
  // below - reset on every reposition() so a scroll/resize re-checks from
  // scratch rather than staying stuck flipped once there's room again.
  const flippedRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    function reposition() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const left = Math.min(
        Math.max(TOOLTIP_MARGIN, rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2),
        window.innerWidth - TOOLTIP_WIDTH - TOOLTIP_MARGIN
      );
      flippedRef.current = false;
      setCoords({ top: rect.bottom + 8, left });
    }
    reposition();

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || popupRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  // Runs after the popup actually renders below the trigger (its real
  // height wasn't known until now) - if that placement runs off the bottom
  // of the viewport, flip it to sit above the trigger instead. Guarded by
  // flippedRef so this settles in one pass instead of re-triggering itself
  // via the coords it just set.
  useLayoutEffect(() => {
    if (!open || !coords || flippedRef.current) return;
    const popupRect = popupRef.current?.getBoundingClientRect();
    const buttonRect = buttonRef.current?.getBoundingClientRect();
    if (!popupRect || !buttonRect) return;
    if (popupRect.bottom > window.innerHeight - TOOLTIP_MARGIN) {
      flippedRef.current = true;
      setCoords({
        left: coords.left,
        top: Math.max(TOOLTIP_MARGIN, buttonRect.top - popupRect.height - 8),
      });
    }
  }, [open, coords]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={heading}
        aria-label={`${heading} info`}
        className="block bg-transparent border-0 p-0 m-0 cursor-pointer"
      >
        {children}
      </button>
      {open && coords &&
        createPortal(
          <div
            ref={popupRef}
            style={{ top: coords.top, left: coords.left, width: TOOLTIP_WIDTH }}
            className="fixed z-50 bg-white dark:bg-gray-800 text-black dark:text-gray-100 text-xs rounded-lg shadow-lg px-3 py-2 text-center normal-case"
          >
            <p className="font-bold mb-1">{heading}</p>
            <p>{description}</p>
          </div>,
          document.body
        )}
    </>
  );
}
