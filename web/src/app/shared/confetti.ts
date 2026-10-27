const COLORS = ['#ff7a45', '#f0437a', '#a855f7', '#14b8a6', '#f59e0b', '#ffffff'];

/** Bağımlılıksız mini konfeti patlaması. */
export function burstConfetti(count = 70) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:200;overflow:hidden';
  document.body.appendChild(host);

  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    const size = 6 + Math.random() * 8;
    const x = (Math.random() - 0.5) * window.innerWidth * 0.9;
    const y = -(window.innerHeight * (0.35 + Math.random() * 0.4));
    p.style.cssText = `position:absolute;left:50%;top:55%;width:${size}px;height:${size * 0.45}px;` +
      `background:${COLORS[i % COLORS.length]};border-radius:2px;opacity:1`;
    host.appendChild(p);
    p.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${x}px, ${y}px) rotate(${Math.random() * 720}deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${x * 1.15}px, ${window.innerHeight * 0.6}px) rotate(${Math.random() * 1080}deg)`, opacity: 0 },
      ],
      { duration: 1800 + Math.random() * 900, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' },
    );
  }
  setTimeout(() => host.remove(), 3000);
}
