/**
 * Utility for forcing instant, unambiguous scroll resets across all browsers,
 * screen sizes, iFrames, and nested overflow-y containers.
 */

export function scrollToTopInstant(
  target?: HTMLElement | React.RefObject<HTMLElement | null> | null
): void {
  const doReset = () => {
    try {
      // 1. Reset standard window and document root scrolling
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollLeft = 0;
      }
      
      if (document.body) {
        document.body.scrollTop = 0;
        document.body.scrollLeft = 0;
      }

      // 2. Reset specific target ref or element if provided
      if (target) {
        const el = 'current' in target ? target.current : target;
        if (el) {
          el.scrollTop = 0;
          el.scrollLeft = 0;
        }
      }

      // 3. Reset all scrollable elements in the DOM (modals, panels, sidebars, internal tabs)
      const scrollables = document.querySelectorAll('*');
      scrollables.forEach((el) => {
        if (el.scrollTop > 0) {
          el.scrollTop = 0;
        }
      });
    } catch {
      // Fallback silent catch
    }
  };

  // Phase 1: Immediate synchronous reset
  doReset();

  // Phase 2: Next Animation Frames (post React DOM commit)
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      doReset();
      // Double RAF for heavy asynchronous components (D3 charts, tables, images)
      requestAnimationFrame(doReset);
    });
  }

  // Phase 3: Short timeouts to catch deferred layout reflows
  setTimeout(doReset, 0);
  setTimeout(doReset, 20);
  setTimeout(doReset, 60);
  setTimeout(doReset, 150);
}
