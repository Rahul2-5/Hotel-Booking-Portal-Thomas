export function scrollToSection(element) {
  if (!element) return;
  // Move keyboard focus along with the viewport without triggering a second scroll.
  element.focus({ preventScroll: true });
  element.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    block: 'start',
  });
}
