/* Acabamentos · landing (a partir do prototypes/acabamentos-03): a linha do tempo da seção ".trigger-img-switch" da Isra, em JS puro.
   Na Isra (GSAP, scrub .6, pin por 9 telas), em unidades da linha do tempo:
     0      frase 1 sobe letra a letra (yPercent 105 → 0, stagger .03)
     1      frase 1 sai para cima e a frase 2 sobe; véu com desfoque de 10px → 0 (1 a 3)
     2      frase 2 sai
     2,5    a foto do centro cresce até 100vw × 100vh (1 unidade)
     3,5    as fileiras somem (.5)
     4, 5, 7 os painéis sobem (y 100vh → 0) com a foto de dentro descendo (−100vh → 0)
   Aqui a unidade é uma altura do palco (100svh), e há 4 painéis. Os painéis entram pela direita como as
   Residences do Springs (clip-path + escala 1,2 → 1,0), e a linha do cartão mostra o progresso pelos quatro. As fileiras de cima e de baixo
   correm em sentidos opostos (xPercent −30 / +30) enquanto o palco entra e fica preso.
   No celular (até 720px), sem a abertura: o título fica parado no verde e os quatro materiais vêm em
   cartões que se empilham, com a trava de trava.js, um gesto por cartão (protótipo amb-acab-mobile-b,
   22/10/2026). */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const secao = $(".a3");
  const trilho = $("[data-a3]");
  if (!secao || !trilho) return;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const suave = (x, a, b) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const sai = (t) => 1 - Math.pow(1 - t, 3);   // power3.out
  const mix = (a, b, t) => a + (b - a) * t;

  /* Revelação dos blocos de baixo (lista e Bastidores) */
  const movimento = matchMedia("(prefers-reduced-motion: reduce)");
  const reduz = movimento.matches;
  const sobem = $$("[data-a3-sobe]");
  if (reduz || !("IntersectionObserver" in window)) sobem.forEach((el) => el.classList.add("is-dentro"));
  else {
    const io = new IntersectionObserver((es, obs) => {
      let c = 0;
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target; setTimeout(() => el.classList.add("is-dentro"), c * 90); c += 1; obs.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    sobem.forEach((el) => io.observe(el));
  }

  /* Frases em letras (como o SplitText "chars,words"); as palavras não quebram no meio */
  const frases = $$("[data-a3-letras]").map((el) => {
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = el.textContent.trim().split(" ").map((p) => `<span class="a3__w">${[...p].map((c) => `<span class="a3__c">${c}</span>`).join("")}</span>`).join(" ");
    return [...el.querySelectorAll(".a3__c")];
  });

  /* O palco vale em qualquer tela, também no celular; só com movimento reduzido fica tudo em sequência */
  secao.classList.toggle("a3--estatico", reduz);

  const palco = $(".a3__palco");
  const galeria = $("[data-a3-galeria]");
  const filas = $$("[data-a3-fila]");
  const outras = $$(".a3__img:not(.a3__vaga)");
  const zoom = $("[data-a3-zoom]");
  const vaga = $(".a3__vaga");
  const veu = $("[data-a3-veu]");
  const apoio = $("[data-a3-apoio]");
  const dica = $(".a3__dica");
  const paineis = $$("[data-a3-painel]");
  const conteudos = paineis.map((p) => $(".a3__painel-conteudo", p));
  const fundos = paineis.map((p) => $(".a3__painel-fundo", p));
  const imagens = fundos.map((f) => $("img", f));
  const barras = $$(".a3__progresso i", palco);
  const camadas = [
    ...fundos.slice(1).map((elemento) => ({ elemento, propriedade: "clipPath" })),
    ...imagens.slice(1).map((elemento) => ({ elemento, propriedade: "transform" })),
    ...barras.map((elemento) => ({ elemento, propriedade: "transform", somenteVisivel: true }))
  ];
  // A abertura rola livre. Nos materiais, um gesto normal completa uma passagem lateral.
  // O trilho conserva os pontos originais: 4,5, 5,5 e 6,5, com respiro no fim.
  const PASSO = 1;
  const INICIO = [3.5, 4.5, 5.5, 6.5];

  // Letras: entram em t0 e saem em t1, cada uma .03 depois da anterior, em .5 unidade
  const letras = (cs, t, t0, t1) => cs.forEach((c, k) => {
    const e = sai(clamp((t - (t0 + k * .03)) / .5));
    const s = clamp((t - (t1 + k * .03)) / .5); const q = s * s;
    c.style.setProperty("--y", `${(105 * (1 - e) - 110 * q).toFixed(2)}%`);
  });

  function quadro() {
    agendado = false;
    if (secao.classList.contains("a3--estatico") || animacao || noCelular()) return;
    const limites = trilho.getBoundingClientRect();
    if (limites.top > innerHeight || limites.bottom < 0) return;
    const u = palco.offsetHeight || innerHeight;
    const t = (scrollY - (trilho.getBoundingClientRect().top + scrollY)) / u;

    // Fileiras correndo em sentidos opostos enquanto o palco entra e fica preso
    const corre = clamp((t + 1) / 4.5);
    filas.forEach((f) => f.style.setProperty("--x", (Number(f.dataset.a3Fila) * 30 * corre).toFixed(2)));

    // Frases e véu
    letras(frases[0], t, -.35, 1);
    letras(frases[1], t, 1, 2.05);
    veu.style.setProperty("--blur", `${(10 * (1 - suave(t, 1, 3))).toFixed(2)}px`);
    if (dica) dica.style.setProperty("--d", (1 - suave(t, .05, .6)).toFixed(3));
    apoio.style.setProperty("--a", (suave(t, 1.4, 1.9) * (1 - suave(t, 2.2, 2.6))).toFixed(3));

    // A foto do centro cresce até a tela inteira; as outras somem por baixo dela
    const g = suave(t, 2.5, 3.5);
    // Parte do tamanho da vaga no meio da fileira (40vw no desktop, 64vw no celular)
    const vw = palco.offsetWidth, w0 = vaga.offsetWidth || vw * .4;
    zoom.style.setProperty("--zw", `${mix(w0, vw, g).toFixed(1)}px`);
    zoom.style.setProperty("--zh", `${mix(w0 * 9 / 16, u, g).toFixed(1)}px`);
    outras.forEach((f) => f.style.setProperty("--o", (1 - g).toFixed(3)));

    // As fileiras e o véu somem; por baixo já está o 1º painel, com a mesma foto em tela cheia
    const s = suave(t, 3.5, 4);
    galeria.style.opacity = (1 - s).toFixed(3);
    veu.style.opacity = (1 - suave(t, 3.1, 3.6)).toFixed(3);
    galeria.style.visibility = s >= 1 ? "hidden" : "";
    veu.style.visibility = t >= 3.6 ? "hidden" : "";

    materiais(t);
  }

  function materiais(t, ficha = true) {
    // Linha de progresso dos cartões: de 0 no 1º painel até 1 quando o último termina de entrar
    const progresso = clamp((t - PONTOS[0]) / (PONTOS[ultimo] - PONTOS[0]));
    barras.forEach((barra) => { barra.style.transform = `scaleX(${progresso})`; });

    // Apenas a foto recebe o recorte. A ficha fica inteira e troca no meio da passagem.
    const atual = INICIO.reduce((a, inicio, k) => t >= inicio + (k ? PASSO / 2 : 0) ? k : a, 0);
    paineis.forEach((p, k) => {
      if (k > 0) {
        const parcial = clamp((t - INICIO[k]) / PASSO);
        const w = parcial > .998 ? 1 : parcial < .002 ? 0 : parcial;
        fundos[k].style.clipPath = `inset(0% 0% 0% ${(1 - w) * 100}%)`;
        imagens[k].style.transform = `scale(${(1.12 - .12 * w).toFixed(4)})`;
      }
      if (ficha) conteudos[k].classList.toggle("is-atual", atual === k && t >= INICIO[0]);
      conteudos[k].style.setProperty("--c", k ? "1" : suave(t, INICIO[0] + .4, INICIO[0] + .9).toFixed(3));
      if (ficha) p.setAttribute("aria-hidden", String(k !== atual || t < INICIO[0]));
    });
  }

  // Encaixe por material: só na fase dos painéis (a abertura com as frases e o zoom rola livre).
  // Pontos de parada: o 1º painel inteiro e o fim da entrada de cada painel seguinte.
  const PONTOS = [INICIO[1], ...INICIO.slice(1).map((s) => s + PASSO)];
  const ultimo = PONTOS.length - 1;
  let animacao = null, destino = null, percurso = null;
  const posicao = () => {
    const u = palco.offsetHeight || innerHeight;
    const inicio = trilho.getBoundingClientRect().top + scrollY;
    const t = (scrollY - inicio) / u;
    const indice = PONTOS.reduce((a, b, k) => Math.abs(b - t) < Math.abs(PONTOS[a] - t) ? k : a, 0);
    return { u, inicio, t, indice };
  };
  const cancelar = () => {
    if (!animacao) return;
    const p = animacao.cancelar();
    animacao = null; destino = null;
    rolar(percurso.origem + (percurso.fim - percurso.origem) * p);
    quadro();
  };
  const rolar = (y) => {
    dispatchEvent(new CustomEvent("nazzan:galeria-posicao", { detail: y }));
    if (window.nazzanLenis) window.nazzanLenis.scrollTo(y, { immediate: true, force: true });
    else scrollTo({ top: y, behavior: "instant" });
  };
  const ir = (k, imediato = false) => {
    cancelar();
    const { inicio, u } = posicao();
    k = clamp(k, 0, ultimo);
    const fim = inicio + PONTOS[k] * u, origem = scrollY;
    if (imediato || movimento.matches) {
      palco.classList.add("is-troca-direta");
      rolar(fim); quadro();
      void palco.offsetWidth;
      palco.classList.remove("is-troca-direta");
      return;
    }
    if ((origem - inicio) / u < 4) {
      if (window.nazzanLenis) window.nazzanLenis.scrollTo(fim, { duration: 1.4, force: true });
      else scrollTo({ top: fim, behavior: "smooth" });
      return;
    }
    destino = k;
    percurso = { origem, fim };
    rolar(origem);
    animacao = window.nazzanTransicaoGaleria({
      camadas,
      preparar: () => materiais(PONTOS[k], false),
      meio: () => {
        conteudos.forEach((c, i) => { c.classList.toggle("is-atual", i === k); });
        paineis.forEach((p, i) => p.setAttribute("aria-hidden", String(i !== k)));
      },
      concluir: () => {
        animacao = null; destino = null;
        rolar(fim); quadro();
      }
    });
  };
  const nosMateriais = (t) => !movimento.matches && t >= PONTOS[0] - .1 && t <= PONTOS[ultimo] + .002;
  let ultimaRoda = 0, sentido = 0, soma = 0, consumido = false;
  addEventListener("wheel", (e) => {
    if (noCelular() || movimento.matches || e.ctrlKey || e.defaultPrevented || !e.deltaY || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (e.target.closest?.("dialog[open], [data-lenis-prevent], input, textarea, select, [contenteditable]") || document.body.classList.contains("menu-aberto")) return;
    const { t, indice, u } = posicao();
    if (!nosMateriais(t)) return;
    const agora = performance.now(), dir = Math.sign(e.deltaY);
    const delta = Math.abs(e.deltaY) * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? u : 1);
    // A cauda fraca do trackpad pode chegar atrasada em um quadro pesado.
    const novo = !animacao && agora - ultimaRoda > 180 && (delta >= 32 || agora - ultimaRoda > 450);
    if (novo || dir !== sentido) { soma = 0; consumido = false; }
    ultimaRoda = agora; sentido = dir;
    if (!animacao && ((t <= PONTOS[0] + .002 && dir < 0) || (t >= PONTOS[ultimo] - .002 && dir > 0))) {
      if (!consumido) return;
    }
    e.preventDefault(); e.stopImmediatePropagation();
    if (consumido) return;
    soma += delta;
    if (soma < 32) return;
    consumido = true;
    ir((destino ?? indice) + dir);
  }, { passive: false, capture: true });

  let toque = null;
  palco.addEventListener("touchstart", (e) => {
    if (noCelular()) { toque = null; return; }
    cancelar();
    const { t, indice } = posicao();
    toque = e.touches.length === 1 && nosMateriais(t)
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY, indice } : null;
  }, { passive: true });
  palco.addEventListener("touchend", (e) => {
    if (!toque || e.touches.length || movimento.matches) { toque = null; return; }
    const fim = e.changedTouches[0], dy = toque.y - fim.clientY, dx = toque.x - fim.clientX;
    const alvo = toque.indice + Math.sign(dy);
    if (Math.abs(dy) >= 32 && Math.abs(dy) > Math.abs(dx) * 1.3 && alvo >= 0 && alvo <= ultimo) ir(alvo);
    toque = null;
  }, { passive: true });
  palco.addEventListener("touchcancel", () => { toque = null; }, { passive: true });
  addEventListener("pointerdown", cancelar, { capture: true, passive: true });
  addEventListener("resize", cancelar);
  addEventListener("keydown", (e) => {
    if (["Tab", "Escape", "PageDown", "PageUp", "ArrowDown", "ArrowUp", " "].includes(e.key)) cancelar();
    if (noCelular() || e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    if (e.target.closest?.("input, textarea, select, [contenteditable], dialog[open]") || document.body.classList.contains("menu-aberto")) return;
    const { t, indice } = posicao();
    if (!nosMateriais(t)) return;
    e.preventDefault();
    ir(e.key === "Home" ? 0 : e.key === "End" ? ultimo : indice + (e.key === "ArrowRight" ? 1 : -1), true);
  });
  movimento.addEventListener("change", () => {
    cancelar();
    secao.classList.toggle("a3--estatico", movimento.matches);
    if (movimento.matches) {
      paineis.forEach((p) => p.removeAttribute("aria-hidden"));
      fundos.forEach((f) => f.style.clipPath = "none");
      imagens.forEach((img) => img.style.transform = "none");
      sobem.forEach((el) => el.classList.add("is-dentro"));
    }
    modo();
  });
  /* Celular: cartões que se empilham, como em Ambientes. O cartão seguinte sobe da base do palco até o
     lugar dele; os de baixo encolhem 5% por cartão por cima (até três) a partir do topo, e a foto chega com
     1,12 de escala e assenta em 1. O palco vira o trilho (título, painéis presos e o ::after do CSS); os
     painéis ficam presos depois do título. */
  const celular = matchMedia("(max-width: 720px)");
  const caixaPaineis = $(".a3__paineis");
  let alturaPalco = 0;
  const desenhaCelular = (x) => paineis.forEach((p, k) => {
    const chegada = k ? clamp(x - (k - 1)) : 1;
    const fundo = Math.min(3, Math.max(0, x - k));
    p.style.visibility = chegada > 0 && fundo < 3 ? "" : "hidden";
    p.style.transform = `translate3d(0, ${((1 - chegada) * alturaPalco).toFixed(1)}px, 0) scale(${(1 - .05 * fundo).toFixed(4)})`;
    imagens[k].style.transform = `scale(${(1 + .12 * (1 - chegada)).toFixed(4)})`;
  });
  const acendeCelular = (k) => {
    conteudos.forEach((c, i) => c.classList.toggle("is-atual", i === k));
    paineis.forEach((p, i) => p.setAttribute("aria-hidden", String(i !== k)));
  };
  const trava = window.nazzanTrava?.({
    trilho: palco,
    palco: caixaPaineis,
    n: paineis.length,
    ativo: () => noCelular(),
    desenha: desenhaCelular,
    acende: acendeCelular,
    limites: () => {
      const base = palco.getBoundingClientRect().top + scrollY;
      return { inicio: base + veu.offsetTop + veu.offsetHeight, fim: base + palco.offsetHeight - caixaPaineis.offsetHeight };
    },
  });
  function noCelular() { return celular.matches && !movimento.matches && Boolean(trava); }
  // Troca de modo: limpa o que um deixou no outro e repinta
  function modo() {
    const cel = noCelular();
    cancelar();
    secao.classList.toggle("a3--celular", cel);
    [...fundos, ...imagens, ...barras, ...paineis, galeria, veu].forEach((el) => {
      ["clip-path", "transform", "visibility", "opacity"].forEach((p) => el.style.removeProperty(p));
    });
    paineis.forEach((p, k) => (cel ? p.style.setProperty("--i", k) : p.style.removeProperty("--i")));
    if (cel) alturaPalco = caixaPaineis.offsetHeight;
    conteudos.forEach((c) => (cel ? c.style.setProperty("--c", "1") : c.style.removeProperty("--c")));
    frases.flat().forEach((c) => (cel ? c.style.setProperty("--y", "0%") : c.style.removeProperty("--y")));
    if (cel) trava.redesenha();
    else quadro();
  }

  let agendado = false;
  const pede = () => { if (!agendado) { agendado = true; requestAnimationFrame(quadro); } };
  addEventListener("scroll", pede, { passive: true });
  addEventListener("resize", pede);
  celular.addEventListener("change", modo);
  addEventListener("resize", () => { if (secao.classList.contains("a3--celular")) { alturaPalco = caixaPaineis.offsetHeight; trava.redesenha(); } });
  modo();
  const preparaFotos = () => $$(".a3__palco img").forEach((img) => {
    img.loading = "eager";
    img.decode?.().catch(() => {});
  });
  if ("IntersectionObserver" in window) {
    const preparo = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      preparaFotos();
      preparo.disconnect();
    }, { rootMargin: "100% 0px" });
    preparo.observe(trilho);
  } else preparaFotos();
})();
