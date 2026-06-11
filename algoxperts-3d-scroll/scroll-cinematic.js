/* scroll-cinematic engine
 * Canvas image-sequence scrub driven by Lenis smooth scroll.
 * Config lives in window.SCRUB_SECTIONS (set at the bottom of index.html):
 *   [{ section:"#hero", frameCount:179, bg:"#0a0a12",
 *      framePath:(i)=>`frames/spin/frame_${String(i+1).padStart(4,"0")}.jpg` }]
 * The engine skips any section whose element is missing.
 */
(() => {
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  // ---- Lenis smooth scroll (loaded via CDN in index.html) ----
  let lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Build a runtime stage per configured section.
  const stages = (window.SCRUB_SECTIONS || [])
    .map((cfg) => {
      const section = document.querySelector(cfg.section);
      if (!section) return null; // skip missing sections
      const canvas = section.querySelector("canvas");
      if (!canvas) return null;
      const ctx = canvas.getContext("2d", { alpha: false });
      const images = new Array(cfg.frameCount);
      let loaded = 0;
      let lastFrame = -1;

      // Preload every frame.
      for (let i = 0; i < cfg.frameCount; i++) {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          loaded++;
          if (i === 0) draw(0); // paint frame 0 as soon as it lands
        };
        img.src = cfg.framePath(i);
        images[i] = img;
      }

      function resize() {
        const w = canvas.clientWidth || section.clientWidth;
        const h = canvas.clientHeight || window.innerHeight;
        canvas.width = Math.round(w * DPR);
        canvas.height = Math.round(h * DPR);
        draw(lastFrame < 0 ? 0 : lastFrame, true);
      }

      function draw(frame, force) {
        frame = clamp(frame | 0, 0, cfg.frameCount - 1);
        if (frame === lastFrame && !force) return;
        const img = images[frame];
        if (!img || !img.complete || !img.naturalWidth) return;
        lastFrame = frame;
        const cw = canvas.width, ch = canvas.height;
        if (cfg.bg) { ctx.fillStyle = cfg.bg; ctx.fillRect(0, 0, cw, ch); }
        // cover-fit
        const ir = img.naturalWidth / img.naturalHeight;
        const cr = cw / ch;
        let dw, dh, dx, dy;
        if (ir > cr) { dh = ch; dw = ch * ir; dx = (cw - dw) / 2; dy = 0; }
        else { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
        ctx.drawImage(img, dx, dy, dw, dh);
      }

      // Per-line copy fade windows: data-in / data-out are 0..1 progress.
      const lines = Array.from(section.querySelectorAll("[data-in]"));
      function updateCopy(p) {
        for (const el of lines) {
          const inp = parseFloat(el.dataset.in || "0");
          const out = parseFloat(el.dataset.out || "1");
          const fade = 0.06;
          let o = 0;
          if (p >= inp && p <= out) {
            o = Math.min((p - inp) / fade, (out - p) / fade, 1);
          }
          o = clamp(o, 0, 1);
          el.style.opacity = o.toFixed(3);
          el.style.transform = `translateY(${(1 - o) * 24}px)`;
        }
      }

      window.addEventListener("resize", resize);
      resize();

      return {
        update() {
          const rect = section.getBoundingClientRect();
          const innerH = window.innerHeight;
          const p = clamp(-rect.top / (rect.height - innerH), 0, 1);
          draw(p * (cfg.frameCount - 1));
          updateCopy(p);
        },
      };
    })
    .filter(Boolean);

  // ---- Generic scroll reveals (non-scrub sections) ----
  const reveals = Array.from(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.18 }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  // ---- rAF loop drives both Lenis and the scrub stages ----
  function raf(time) {
    if (lenis) lenis.raf(time);
    for (const s of stages) s.update();
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
})();
