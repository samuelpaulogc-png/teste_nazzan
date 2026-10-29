/* Nazzan · hero que encolhe para o polígono + manifesto com fotos em órbita (protótipo 09)
   Arquivo à parte, como a hero.js. Funciona com o Lenis, que move a rolagem nativa.
   Reproduz em JS puro a classe da intro do Studio Foundry (studio-foundry.sujen.co), lida no bundle:
   SLOTS 7 · RADIUS_RATIO .68 · EXIT_RADIUS 3 · COPY_STEP_VH 2 · TURNS .12 · SPREAD_VH 1.2
   - e = telas rolando desde que o trilho encostou no topo (0 a 5)
   - cada foto: raio = .68 × min(largura, altura) × radiusScale; abre do centro com smoothstep
     em 1,2 tela; gira .12 volta por tela × speedScale; na última tela o raio vai a 3× (voa para fora)
   - frases: entram em c − .5 (yPercent 120 → 0, .45, stagger .08, power3.out) e saem em c + .4
     (yPercent → −120, .3, stagger .05, power2.in), com c = 1, 3
   - a imagem central (o slot 0, em WebGL no original) segue a órbita do slot 0, muda de forma
     e, na saída, volta ao meio e para ali; depois se abre na imagem ampla (largura toda, 2,15:1) */
(() => {
  "use strict";
  const raiz = document.querySelector("[data-m9]");
  if (!raiz) return;
  const secao = raiz.closest(".m9");
  const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduz) { secao.classList.add("m9--estatico"); return; }

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const suave = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;
  const PI2 = Math.PI * 2;

  /* ---------- Configuração (valores do Studio Foundry) ---------- */
  const SLOTS = [
    { angle: .35, radiusScale: .9, speedScale: .92, sizeVh: 28 },
    { angle: 1.25, radiusScale: 1.1, speedScale: 1.1, sizeVh: 15 },
    { angle: 2.1, radiusScale: .92, speedScale: .9, sizeVh: 18 },
    { angle: 3.05, radiusScale: 1.12, speedScale: 1.15, sizeVh: 14 },
    { angle: 3.95, radiusScale: .88, speedScale: .95, sizeVh: 20 },
    { angle: 4.75, radiusScale: 1.05, speedScale: 1.08, sizeVh: 16 },
    { angle: 5.65, radiusScale: 1.15, speedScale: .85, sizeVh: 17 },
  ];
  const RAIO = .68, SAIDA_RAIO = 3, GIRO = .12, ABRE = 1.2;

  /* ---------- Formas: polígonos dos SVGs do site (shape-01 a 07), em px do viewBox ---------- */
  const FORMAS = {
    "01": [692, 572, [[278.85, 0], [0, 0], [0, 81.99], [188.28, 572], [536.25, 572], [691.17, 257.4], [677.34, 172.08]]],
    "02": [506, 400, [[0, 228.26], [388.4, 400], [506, 350.67], [506, 226.24], [432.63, 193.8], [432.63, 145.4], [350.65, 109.15], [344.01, 111.93], [344.01, 42.66], [247.53, 0], [0, 103.83]]],
    "03": [494, 400, [[420.4, 316.41], [494, 281.01], [494, 133.58], [73.04, 0], [0, 35.13], [0, 182.56], [246.39, 399.82], [316.23, 366.51], [297.62, 334.28], [358.04, 305.23]]],
    "04": [483, 400, [[194.87, 0], [0, 0], [0, 57.29], [131.58, 399.72], [374.74, 399.72], [483, 179.88], [473.34, 120.25]]],
    "05": [475, 400, [[38.92, 58.88], [0, 148.69], [336.29, 399.67], [475, 58.88], [336.29, 0]]],
    "06": [488, 400, [[0, 175.38], [8.94, 284.25], [366.74, 400], [488, 135.93], [488, 44.33], [315.49, 0], [92.93, 0]]],
  };
  FORMAS["07"] = FORMAS["04"];
  // Encaixa a forma num quadrado (como mask "center / contain") e devolve pontos em %
  const emPorcento = ([w, h, pts]) => { const S = Math.max(w, h); return pts.map(([x, y]) => [((x + (S - w) / 2) / S) * 100, ((y + (S - h) / 2) / S) * 100]); };
  const css = (pts) => `polygon(${pts.map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(", ")})`;

  // Para a forma central mudar de uma para outra, todas viram 24 pontos no mesmo sentido e com o mesmo início
  const N = 24;
  function reamostra(pts) {
    let p = pts.slice();
    const area = p.reduce((s, [x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; return s + x * y2 - x2 * y; }, 0);
    if (area < 0) p.reverse();
    let k = 0;
    p.forEach(([x, y], i) => { if (x + y < p[k][0] + p[k][1]) k = i; });
    p = p.slice(k).concat(p.slice(0, k));
    const seg = p.map((a, i) => { const b = p[(i + 1) % p.length]; return Math.hypot(b[0] - a[0], b[1] - a[1]); });
    const total = seg.reduce((s, v) => s + v, 0);
    const out = [];
    for (let j = 0; j < N; j++) {
      let d = (j / N) * total, i = 0;
      while (d > seg[i]) { d -= seg[i]; i++; }
      const a = p[i], b = p[(i + 1) % p.length], t = seg[i] ? d / seg[i] : 0;
      out.push([mix(a[0], b[0], t), mix(a[1], b[1], t)]);
    }
    return out;
  }
  const SEQUENCIA = ["01", "04", "06", "01"].map((f) => reamostra(emPorcento(FORMAS[f])));
  const mistura = (a, b, t) => a.map(([x, y], i) => [mix(x, b[i][0], t), mix(y, b[i][1], t)]);
  const RETANGULO = reamostra([[0, 0], [100, 0], [100, 100], [0, 100]]);
  // Linha do tempo em telas, contadas depois da hero (o trilho tem 7,7 telas):
  // a hero encolhe nas primeiras .7 tela · frases em 1 e 3 · saída das fotos de 3,8 a 4,7 ·
  // pausa no meio · abertura de 5 a 5,8 · na landing (trilho de 10 telas), o vídeo da montagem
  // vai do vazio ao pronto de 5,2 a 7,9, e a imagem aberta fica parada até 8,3
  const HERO = .7, SAIDA = [3.8, 4.7], ABERTURA = [5, 5.8], MONTAGEM = [5.2, 7.9];

  /* ---------- Elementos ---------- */
  const itens = [...raiz.querySelectorAll(".m9__item")].map((el) => {
    const slot = Number(el.dataset.slot);
    el.querySelector("img").style.setProperty("--forma", css(emPorcento(FORMAS[el.dataset.forma])));
    return { el, slot, cfg: SLOTS[slot] };
  });
  const centro = raiz.querySelector("[data-centro]");
  const palco = raiz.querySelector(".m9__palco");
  const camadaHero = raiz.querySelector("[data-m9-hero]");
  const topo = document.querySelector("[data-topo]");
  let midiaCentro = centro.querySelector("img, video");

  /* Montagem: a rolagem escolhe o quadro (alvo, de 0 a 1).
     Desktop: o vídeo (um quadro-chave a cada 6, para a busca responder também ao voltar); só pede um
     quadro novo quando o anterior terminou de carregar.
     Celular (até 720px): uma sequência de imagens num canvas, como a Apple faz. O vídeo controlado por
     script não aparecia no celular (o Safari do iPhone barra o play no modo de economia, não busca
     sem Range e falha com vídeo em blob), e as imagens funcionam em qualquer navegador. */
  const video = raiz.querySelector("[data-m9-video]");
  let alvo = 0, quadros = null, pincel = null, desenhado = -1;
  function buscaQuadro() {
    if (!video || video.readyState < 1 || video.seeking) return;
    const t = alvo * Math.max(0, (video.duration || 0) - .05);
    if (Math.abs(video.currentTime - t) > 1 / 48) video.currentTime = t;
  }
  function desenhaQuadro() {
    // Usa o quadro do alvo ou, se ele ainda não chegou, o carregado mais próximo antes dele
    let i = Math.round(alvo * (quadros.length - 1));
    while (i > 0 && !quadros[i].ok) i--;
    if (!quadros[i].ok || i === desenhado) return;
    desenhado = i;
    pincel.drawImage(quadros[i].img, 0, 0, pincel.canvas.width, pincel.canvas.height);
  }
  const montagem = () => (quadros ? desenhaQuadro() : buscaQuadro());

  let midiaIniciada = false;
  function preparaMidia() {
    if (midiaIniciada || !video) return;
    midiaIniciada = true;
    raiz.querySelectorAll("[data-orbita-src]").forEach((img) => {
      img.srcset = img.dataset.orbitaSrcset;
      img.src = img.dataset.orbitaSrc;
      img.loading = "eager";
      img.decode?.().catch(() => {});
    });
  if (video && video.dataset.quadros && matchMedia("(max-width: 720px)").matches) {
    const n = Number(video.dataset.quadrosN), pasta = video.dataset.quadros;
    const tela = document.createElement("canvas");
    tela.width = 960; tela.height = 540;
    tela.className = video.className;
    tela.setAttribute("role", "img");
    tela.setAttribute("aria-label", video.getAttribute("aria-label"));
    video.replaceWith(tela);
    midiaCentro = tela;
    pincel = tela.getContext("2d");
    quadros = Array.from({ length: n }, (_, k) => ({ img: new Image(), ok: false, src: `${pasta}${String(k + 1).padStart(3, "0")}.webp` }));
    // Ordem de carga: o primeiro e o último, depois de 8 em 8, de 4 em 4, de 2 em 2 e o resto,
    // para a rolagem rápida sempre achar um quadro perto. Seis por vez.
    const ordem = [], visto = new Set();
    [n - 1, 8, 4, 2, 1].forEach((passo) => { for (let k = 0; k < n; k += passo) if (!visto.has(k)) { visto.add(k); ordem.push(k); } });
    let pos = 0;
    const proximo = () => {
      if (pos >= ordem.length) return;
      const q = quadros[ordem[pos++]];
      q.img.onload = () => { q.ok = true; desenhado = -1; desenhaQuadro(); proximo(); };
      q.img.onerror = proximo;
      q.img.src = q.src;
    };
    for (let k = 0; k < 6; k++) proximo();
  } else if (video) {
    video.poster = video.dataset.poster;
    video.preload = "auto";
    video.addEventListener("loadedmetadata", buscaQuadro);
    video.addEventListener("seeked", buscaQuadro);
    // O arquivo vem inteiro e vira um blob: assim a busca funciona mesmo num servidor sem Range
    // (como o http.server do Python, em que o vídeo só fica "buscável" no tempo 0)
    const arquivo = video.dataset.src;
    fetch(arquivo).then((r) => (r.ok ? r.blob() : Promise.reject())).then((b) => {
      video.src = URL.createObjectURL(b);
      video.play().then(() => { video.pause(); buscaQuadro(); }).catch(() => {});
    }).catch(() => { video.src = arquivo; });
  }
  }
  /* Linhas como no SplitText (type: "lines", mask: "lines"): as palavras correm na largura do
     parágrafo e o JS agrupa as que caem na mesma linha, cada grupo numa máscara.
     A cor de cada trecho (span de origem) passa para as palavras; o &nbsp; mantém palavras juntas.
     Refaz ao mudar a largura. */
  const paragrafos = [...raiz.querySelectorAll("[data-linhas]")].map((el) => {
    const palavras = [];
    el.childNodes.forEach((no) => {
      const cor = no.nodeType === 1 ? no.className : "";
      no.textContent.split(/[ \t\n\r]+/).filter(Boolean).forEach((t) => palavras.push({ t, cor }));
    });
    return { el, palavras };
  });
  const span = ({ t, cor }) => `<span${cor ? ` class="${cor}"` : ""}>${t}</span>`;
  function divideLinhas() {
    paragrafos.forEach(({ el, palavras }) => {
      el.innerHTML = palavras.map((p, i) => `<span class="m9__pal" data-i="${i}">${span(p)}</span>`).join(" ");
      const grupos = [];
      let topo = null;
      el.querySelectorAll(".m9__pal").forEach((s) => {
        const y = Math.round(s.offsetTop);
        if (y !== topo) { grupos.push([]); topo = y; }
        grupos[grupos.length - 1].push(palavras[Number(s.dataset.i)]);
      });
      el.innerHTML = grupos.map((g) => `<span class="m9__mascara"><span class="m9__linha">${g.map(span).join(" ")}</span></span>`).join("");
    });
    copias.forEach((cp) => (cp.linhas = [...cp.el.querySelectorAll(".m9__linha")]));
  }

  const copias = [...raiz.querySelectorAll("[data-copia]")].map((el) => ({ el, c: Number(el.dataset.copia), linhas: [] }));
  divideLinhas();
  document.fonts?.ready.then(() => { divideLinhas(); pede(); });
  let larguraAntes = innerWidth;

  function tamanhos() {
    itens.forEach((it) => { it.el.style.width = it.el.style.height = `${it.cfg.sizeVh}vh`; });
  }
  tamanhos();

  /* ---------- Quadro a quadro ---------- */
  function quadro() {
    agendado = false;
    const vw = innerWidth, vh = innerHeight;
    // A linha do tempo conta em alturas do palco (100svh), a mesma unidade do trilho. No iPhone o
    // innerHeight cresce quando a barra do Safari some, e a conta acabava antes da abertura da imagem.
    const u = palco.offsetHeight || vh;
    const s = Math.max(0, raiz.offsetHeight / u - 1);
    const bruto = clamp((scrollY - (raiz.getBoundingClientRect().top + scrollY)) / u, 0, s);
    const e = Math.max(0, bruto - (camadaHero ? HERO : 0));
    // A montagem comeca varias telas depois: antecipar so quando houver rolagem.
    if (bruto > .15) preparaMidia();
    const saida = suave(e, SAIDA[0], SAIDA[1]);
    const abre = suave(e, ABERTURA[0], ABERTURA[1]);
    const raioBase = RAIO * Math.min(vw, vh);

    // Fotos em órbita
    itens.forEach(({ el, slot, cfg }) => {
      const n = suave(e, slot * .025, slot * .025 + ABRE);
      const a = cfg.angle + e * GIRO * cfg.speedScale * PI2;
      const l = raioBase * cfg.radiusScale * n * mix(1, SAIDA_RAIO, saida);
      el.style.transform = `translate(-50%, -50%) translate(${(Math.cos(a) * l).toFixed(1)}px, ${(Math.sin(a) * l).toFixed(1)}px) scale(${n.toFixed(4)})`;
      el.style.opacity = n.toFixed(3);
    });

    // Imagem central: órbita do slot 0, que volta ao meio na saída, para ali e se abre na imagem ampla
    const c0 = SLOTS[0];
    const n0 = suave(e, 0, ABRE);
    const a0 = c0.angle + e * GIRO * c0.speedScale * PI2;
    const l0 = raioBase * c0.radiusScale * n0 * mix(1, 0, saida);
    const lado = (c0.sizeVh / 100) * vh;
    centro.style.width = `${mix(lado, vw, abre).toFixed(1)}px`;
    // Em tela deitada, a imagem ampla abre em 2,15:1; em pé (celular), mais alta, para não sobrar vão embaixo
    const alturaAberta = vw < u ? Math.min(vw * 1.1, u * .66) : Math.min(vw / 2.15, u * .88);
    centro.style.height = `${mix(lado, alturaAberta, abre).toFixed(1)}px`;
    centro.style.transform = `translate(-50%, -50%) translate(${(Math.cos(a0) * l0).toFixed(1)}px, ${(Math.sin(a0) * l0).toFixed(1)}px)`;
    const fase = clamp(e / SAIDA[1], 0, 1) * (SEQUENCIA.length - 1);
    const k = Math.min(SEQUENCIA.length - 2, Math.floor(fase));
    const forma = mistura(SEQUENCIA[k], SEQUENCIA[k + 1], suave(fase - k, 0, 1));
    midiaCentro.style.setProperty("--forma", css(mistura(forma, RETANGULO, abre)));
    // Montagem em ritmo constante, do vazio ao pronto
    if (video) { alvo = clamp((e - MONTAGEM[0]) / (MONTAGEM[1] - MONTAGEM[0]), 0, 1); montagem(); }

    // Hero da landing: da tela cheia para o polígono no centro (ref.: Studio Foundry).
    // O recorte é feito na camada inteira; a forma 01 fica num quadrado do tamanho da altura,
    // que a escala leva ao lado da imagem central. No fim, a hero dá lugar à imagem central.
    if (camadaHero) {
      const h = suave(bruto, 0, HERO);
      const quadrado = SEQUENCIA[0].map(([x, y]) => [50 + (x - 50) * (u / vw), y]);
      camadaHero.style.clipPath = css(mistura(RETANGULO, quadrado, h));
      camadaHero.style.transform = `scale(${mix(1, lado / u, h).toFixed(4)})`;
      const some = suave(h, .82, 1);
      camadaHero.style.opacity = (1 - some).toFixed(3);
      camadaHero.style.visibility = some >= 1 ? "hidden" : "visible";
      if (topo) {
        // Some enquanto a hero encolhe e volta depois (o main.js cuida de esconder ao descer e mostrar ao subir)
        const t0 = bruto >= HERO ? 1 : 1 - suave(bruto, 0, HERO * .45);
        topo.style.opacity = t0.toFixed(3);
        topo.style.pointerEvents = t0 < .5 ? "none" : "";
      }
    }

    // Frases: entram linha a linha e saem para cima
    copias.forEach(({ c, linhas }) => {
      linhas.forEach((ln, j) => {
        const entra = 1 - Math.pow(1 - clamp((e - (c - .5 + j * .08)) / .45, 0, 1), 3);
        const sai = Math.pow(clamp((e - (c + .4 + j * .05)) / .3, 0, 1), 2);
        ln.style.setProperty("--ly", `${(120 * (1 - entra) - 120 * sai).toFixed(2)}%`);
        ln.style.setProperty("--la", (entra * (1 - sai)).toFixed(3));
      });
    });
  }

  let agendado = false;
  const pede = () => { if (!agendado) { agendado = true; requestAnimationFrame(quadro); } };
  addEventListener("scroll", pede, { passive: true });
  addEventListener("resize", () => {
    tamanhos();
    if (innerWidth !== larguraAntes) { larguraAntes = innerWidth; divideLinhas(); }
    pede();
  });
  quadro();

  // Pré-carrega as fotos
  // Fotos abaixo da primeira tela seguem loading="lazy"; a hero ja esta no HTML.
})();
