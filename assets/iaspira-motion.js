/* ============================================================
   IASPIRA motion layer (2026-07-07)
   motion.dev v11（CDN固定）による共通演出。全7ページで読み込む。
   - FVタイポグラフィ登場（1文字マスク・stagger）
   - inView 子要素stagger リビール
   - 実績カウントアップ / 磁気CTA / 発光カーソル / 進捗ライン
   - ナビ格納 / FAQ開閉 / 3D・フッター視差 / 画像ワイプ
   すべて try/catch で隔離し、失敗してもページを壊さない。
   prefers-reduced-motion では演出を全停止する。
   ============================================================ */
import { animate, scroll, inView, stagger } from "https://cdn.jsdelivr.net/npm/motion@11.13.5/+esm";

const html = document.documentElement;
html.classList.remove("mx-pre");

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduced) {
  html.classList.add("mx-r");
} else {
  html.classList.add("mx");
  const EASE = [0.22, 0.61, 0.21, 1];
  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];
  const safe = (fn) => {
    try { const r = fn(); if (r && typeof r.catch === "function") r.catch(() => {}); }
    catch (e) { /* 個別演出の失敗は握りつぶす */ }
  };
  /* イントロ（inlineスクリプトが生成）中はヒーロー演出を幕明けまで待たせる */
  const introDelay = q(".mx-intro") ? 1.25 : 0;

  /* ---- Lenis 慣性スクロール（fine pointerのみ・CDN失敗時はネイティブのまま） ---- */
  safe(async () => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const { default: Lenis } = await import("https://cdn.jsdelivr.net/npm/lenis@1.1.18/+esm");
    const lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 3) });
    html.classList.add("mx-lenis");
    const loop = (t) => { lenis.raf(t); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    /* ページ内アンカーはLenisの滑走に載せ替え */
    qa('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      const target = href.length > 1 && document.querySelector(href);
      if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -70 }); }
    }));
  });

  /* ---- ページ進捗ライン ---- */
  safe(() => {
    const bar = document.createElement("div");
    bar.className = "mx-progress";
    document.body.appendChild(bar);
    scroll(animate(bar, { scaleX: [0, 1] }, { easing: "linear" }));
  });

  /* ---- FV：1文字マスク登場 ----
     - 句読点は前の文字と同一ユニットに結合（禁則処理）
     - .accent 等の子要素は丸ごと1ユニット（ページ固有の
       グラデーション text-clip をそのまま生かすため分割しない） */
  const KINSOKU = "、。，．！？ー〜…‥・」』）｝〕】";
  const splitChars = (root) => {
    const out = [];
    const mask = (content) => {
      const w = document.createElement("span"); w.className = "mx-w";
      const i = document.createElement("span"); i.className = "mx-wi";
      if (typeof content === "string") i.textContent = content;
      else i.appendChild(content);
      w.appendChild(i); out.push(i); return w;
    };
    [...root.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const units = [];
        Array.from(n.textContent).forEach((ch) => {
          const last = units[units.length - 1];
          if (ch.trim() === "") units.push({ space: ch });
          else if (KINSOKU.includes(ch) && last && last.text) last.text += ch;
          else units.push({ text: ch });
        });
        const frag = document.createDocumentFragment();
        units.forEach((u) => frag.appendChild(u.space ? document.createTextNode(u.space) : mask(u.text)));
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== "BR") {
        const ph = document.createComment("");
        n.replaceWith(ph);
        ph.replaceWith(mask(n));
      }
    });
    return out;
  };

  safe(() => {
    const hero = q(".hero");
    if (!hero) return;
    hero.classList.add("mx-in");

    const h1 = q("h1", hero);
    if (h1) {
      const chars = splitChars(h1);
      if (chars.length) animate(chars, { y: ["112%", "0%"] },
        { duration: 0.9, delay: stagger(0.032, { startDelay: 0.25 + introDelay }), easing: EASE });
    }
    const rise = (els, startDelay, step = 0.12) => {
      els = els.filter(Boolean);
      if (els.length) animate(els, { opacity: [0, 1], y: [18, 0] },
        { duration: 0.8, delay: stagger(step, { startDelay: startDelay + introDelay }), easing: EASE });
    };
    rise([q(".hero-eyebrow", hero)], 0.1);
    rise([q(".hero-lead", hero)], 0.6);
    rise(qa(".hero-ctas .btn", hero), 0.75, 0.1);
    rise(qa(".hero-chips .chip", hero), 1.0, 0.07);
    rise([q(".hero-note", hero)], 1.1);
    qa(".tate, .scroll-cue", document).forEach((el) =>
      animate(el, { opacity: [0, 1] }, { duration: 1.2, delay: 1.3 + introDelay }));

    const mount = q('[id$="3d"]', hero);
    if (mount) {
      animate(mount, { opacity: [0, 1], scale: [1.05, 1] }, { duration: 1.8, delay: introDelay * 0.5, easing: "ease-out" });
      /* ヒーローが流れるときの軽い視差 */
      scroll(animate(mount, { y: [0, 110] }, { easing: "linear" }),
        { target: hero, offset: ["start start", "end start"] });
    }
  });

  /* ---- セクション見出し：eyebrow線ドロー＋段差リビール ---- */
  safe(() => {
    qa(".sec-head").forEach((head) => {
      const parts = [...head.children];
      parts.forEach((p) => (p.style.opacity = "0"));
      inView(head, () => {
        head.classList.add("mx-in");
        animate(parts, { opacity: [0, 1], y: [26, 0] },
          { duration: 0.8, delay: stagger(0.14), easing: EASE });
      }, { amount: 0.4 });
    });
  });

  /* ---- グリッド子要素の stagger リビール ---- */
  safe(() => {
    const GROUPS = [".svc-grid", ".why-grid", ".features-grid", ".price-grid", ".works-grid",
      ".voice-grid", ".case-grid", ".stats-in", ".faq-list", ".process-list", ".contact-in"];
    qa(GROUPS.join(",")).forEach((grid) => {
      const kids = [...grid.children];
      if (!kids.length) return;
      kids.forEach((k) => (k.style.opacity = "0"));
      inView(grid, () => {
        grid.classList.add("mx-in");
        animate(kids, { opacity: [0, 1], y: [30, 0] },
          { duration: 0.75, delay: stagger(0.09), easing: EASE });
      }, { amount: 0.15 });
    });
  });

  /* ---- 実績バンド：カウントアップ ---- */
  safe(() => {
    qa(".stat .num").forEach((num) => {
      const t = num.firstChild;
      if (!t || t.nodeType !== 3) return;
      const raw = t.textContent.trim();
      const val = parseFloat(raw);
      if (isNaN(val)) return;
      const dec = (raw.split(".")[1] || "").length;
      let done = false;
      inView(num, () => {
        if (done) return; done = true;
        animate(0, val, {
          duration: 1.8, easing: [0.16, 0.6, 0.2, 1],
          onUpdate: (v) => { t.textContent = v.toFixed(dec); },
        });
      }, { amount: 0.6 });
    });
  });

  /* ---- CTA：磁気ホバー ---- */
  safe(() => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    qa(".btn").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
        const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        animate(btn, { x: dx * 6, y: dy * 4 - 2 }, { duration: 0.3, easing: "ease-out" });
      });
      btn.addEventListener("pointerleave", () =>
        animate(btn, { x: 0, y: 0 }, { type: "spring", stiffness: 260, damping: 18 }));
    });
  });

  /* ---- 発光カーソル（dot＋遅行リング） ---- */
  safe(() => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const dot = document.createElement("div"); dot.className = "mx-dot";
    const ring = document.createElement("div"); ring.className = "mx-ring";
    document.body.append(dot, ring);
    let x = -100, y = -100, rx = -100, ry = -100, shown = false;
    addEventListener("pointermove", (e) => {
      x = e.clientX; y = e.clientY;
      if (!shown) { shown = true; dot.style.opacity = "1"; ring.style.opacity = "1"; }
      dot.style.transform = `translate(${x}px, ${y}px)`;
      const t = e.target instanceof Element && e.target.closest("a, button, summary, .btn");
      ring.classList.toggle("is-link", !!t);
    }, { passive: true });
    document.addEventListener("pointerleave", () => { dot.style.opacity = "0"; ring.style.opacity = "0"; shown = false; });
    (function loop() {
      rx += (x - rx) * 0.16; ry += (y - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(loop);
    })();
  });

  /* ---- ナビ：スクロール方向で格納/復帰 ---- */
  safe(() => {
    const nav = q(".nav");
    if (!nav) return;
    let last = scrollY;
    addEventListener("scroll", () => {
      const yv = scrollY;
      if (yv > 320 && yv > last + 4) nav.classList.add("mx-hide");
      else if (yv < last - 4 || yv <= 320) nav.classList.remove("mx-hide");
      last = yv;
    }, { passive: true });
  });

  /* ---- FAQ：開いたとき回答をふわっと ---- */
  safe(() => {
    qa(".faq-list details").forEach((d) => {
      d.addEventListener("toggle", () => {
        if (!d.open) return;
        const a = q(".a", d);
        if (a) animate(a, { opacity: [0, 1], y: [-8, 0] }, { duration: 0.45, easing: EASE });
      });
    });
  });

  /* ---- フッター巨大ワードマーク：スクロール連動で立ち上がる ---- */
  safe(() => {
    const foot = q(".foot-word");
    if (foot) scroll(animate(foot, { y: [70, 0], opacity: [0.15, 1] }, { easing: "linear" }),
      { target: foot, offset: ["start end", "end end"] });
  });

  /* ---- セクションレール（右端の現在地ナビ） ---- */
  safe(() => {
    const secs = qa("section[id]").filter((s) => s.querySelector(".sec-eyebrow"));
    if (secs.length < 3) return;
    const rail = document.createElement("nav");
    rail.className = "mx-rail";
    rail.setAttribute("aria-label", "セクションナビゲーション");
    secs.forEach((s) => {
      const a = document.createElement("a");
      a.href = "#" + s.id;
      const label = (s.querySelector(".sec-eyebrow").textContent || s.id)
        .replace(/^\s*\d+\s*/, "").trim();
      const i = document.createElement("i");
      const tip = document.createElement("span");
      tip.className = "tip"; tip.textContent = label;
      a.append(i, tip);
      rail.appendChild(a);
    });
    document.body.appendChild(rail);
    const links = qa("a", rail);
    const io = new IntersectionObserver((es) => es.forEach((en) => {
      if (en.isIntersecting) links.forEach((l) => {
        const on = l.getAttribute("href") === "#" + en.target.id;
        l.classList.toggle("on", on);
        if (on) l.setAttribute("aria-current", "true");
        else l.removeAttribute("aria-current");
      });
    }), { rootMargin: "-40% 0px -55% 0px" });
    secs.forEach((s) => io.observe(s));
    /* ヒーローを抜けたら現れる（縦書きの.tateと重ならないように） */
    const hero = q(".hero");
    if (hero) new IntersectionObserver((es) => es.forEach((en) =>
      rail.classList.toggle("show", !en.isIntersecting)), { threshold: 0.2 }).observe(hero);
    else rail.classList.add("show");
  });

  /* ---- モバイル固定CTAバー（ヒーロー通過後に出現） ---- */
  safe(() => {
    const hero = q(".hero");
    const mail = q('.hero-ctas .btn-fill');
    const line = q('.hero-ctas .btn-line');
    if (!hero || !mail) return;
    const bar = document.createElement("div");
    bar.className = "mx-cta-bar";
    const mk = (src, cls) => {
      const a = document.createElement("a");
      a.className = "btn " + cls;
      a.href = src.getAttribute("href");
      if (src.target) { a.target = src.target; a.rel = src.rel; }
      a.innerHTML = src.innerHTML;
      return a;
    };
    bar.appendChild(mk(mail, "btn-fill"));
    if (line) bar.appendChild(mk(line, "btn-line"));
    document.body.appendChild(bar);
    new IntersectionObserver((es) => es.forEach((en) =>
      bar.classList.toggle("show", !en.isIntersecting)), { threshold: 0.15 }).observe(hero);
  });

  /* ---- シグネチャーバンド：パララックス＋コピー登場 ---- */
  safe(() => {
    qa(".mx-band").forEach((band) => {
      const img = band.querySelector("img");
      if (img) {
        img.addEventListener("error", () => band.remove());
        scroll(animate(img, { y: ["-7%", "7%"] }, { easing: "linear" }),
          { target: band, offset: ["start end", "end start"] });
      }
      const texts = qa(".mx-band-en, .mx-band-jp", band);
      texts.forEach((t) => (t.style.opacity = "0"));
      inView(band, () => {
        animate(texts, { opacity: [0, 1], y: [22, 0] },
          { duration: 0.9, delay: stagger(0.16), easing: EASE });
      }, { amount: 0.35 });
    });
  });

  /* ---- カード3Dチルト（fine pointerのみ） ---- */
  safe(() => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    html.classList.add("mx-tilt");
    qa(".svc, .work, .feature, .plan, .why, .case").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          `perspective(900px) rotateX(${(-py * 3.5).toFixed(2)}deg) rotateY(${(px * 4.5).toFixed(2)}deg) translateY(-4px)`;
      });
      card.addEventListener("pointerleave", () => {
        card.style.transition = "transform .5s cubic-bezier(.2,.7,.2,1)";
        card.style.transform = "";
        setTimeout(() => { card.style.transition = ""; }, 520);
      });
    });
  });

  /* ---- Voice：星のスタッガーポップ ---- */
  safe(() => {
    qa(".v-stars").forEach((stars) => {
      const svgs = qa("svg", stars);
      if (!svgs.length) return;
      svgs.forEach((s) => (s.style.opacity = "0"));
      inView(stars, () => {
        animate(svgs, { opacity: [0, 1], scale: [0.4, 1] },
          { duration: 0.5, delay: stagger(0.09), easing: [0.34, 1.56, 0.64, 1] });
      }, { amount: 0.6 });
    });
  });

  /* ---- 画像スロット：クリップワイプ＋ズームアウト ----
     注意: クリップは img 側にかける。ラップごと clip すると
     IntersectionObserver が交差ゼロ扱いになり永久に発火しない。 */
  safe(() => {
    qa("img.mx-img").forEach((img) => {
      const wrap = img.closest(".has-img");
      if (!wrap) return;
      const fallback = () => {
        /* 画像が無ければ元のSVGプレースホルダーに戻す */
        wrap.classList.remove("has-img");
        img.remove();
      };
      if (img.complete && img.naturalWidth === 0) return fallback();
      img.addEventListener("error", fallback);
      img.style.clipPath = "inset(0 0 100% 0)";
      img.style.transform = "scale(1.14)";
      inView(wrap, () => {
        const anim = animate(img, { clipPath: ["inset(0 0 100% 0)", "inset(0 0 0% 0)"], scale: [1.14, 1] },
          { duration: 1.1, easing: EASE });
        /* 完了後はinline styleを消してCSSホバーズームに引き継ぐ
           （motion v11のcontrolsはthenable。.finishedは存在しない） */
        Promise.resolve(anim && anim.finished ? anim.finished : anim)
          .then(() => { img.style.transform = ""; img.style.clipPath = ""; })
          .catch(() => {});
      }, { amount: 0.25 });
    });
  });
}
