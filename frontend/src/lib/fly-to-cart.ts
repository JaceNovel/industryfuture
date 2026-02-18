export function flyToCart(fromEl: HTMLElement) {
  if (typeof window === "undefined") return;

  const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-cart-target]"));
  const targetEl = targets.find((el) => el.offsetParent !== null) ?? targets[0];
  if (!targetEl) return;

  const from = fromEl.getBoundingClientRect();
  const to = targetEl.getBoundingClientRect();

  const fromX = from.left + from.width / 2;
  const fromY = from.top + from.height / 2;
  const toX = to.left + to.width / 2;
  const toY = to.top + to.height / 2;

  const dot = document.createElement("div");
  dot.setAttribute("aria-hidden", "true");
  dot.className =
    "pointer-events-none fixed left-0 top-0 z-50 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-2 opacity-90 transition-[transform,opacity] duration-500 ease-in-out";

  dot.style.transform = `translate(${fromX}px, ${fromY}px) scale(1)`;
  document.body.appendChild(dot);

  // Trigger transition
  requestAnimationFrame(() => {
    dot.style.opacity = "0.2";
    dot.style.transform = `translate(${toX}px, ${toY}px) scale(0.2)`;
  });

  window.setTimeout(() => {
    dot.remove();
  }, 520);
}
