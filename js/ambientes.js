/* Ambientes · ficha compacta (protótipo ambientes-ficha).
   A rolagem passa as fotos de lado, como no Springs (Residences): cada foto nova entra pela direita com
   clip-path e vai de 1,12 a 1,0 de escala; a ficha de vidro fica parada e só troca o texto, e a linha da
   ficha mostra o progresso por todos os ambientes.
   Setas do teclado e arrasto lateral também trocam. Sem temporizador.
   No celular (até 720px), cartões que se empilham, com a trava de trava.js: um gesto por cartão
   (protótipo amb-acab-mobile-b, 22/10/2026). */
(() => {
  "use strict";

  window.iniciaAmbientes = ({ reduzMovimento, rolar }) => {
    const secao = document.querySelector("[data-amb]");
    if (!secao) return () => {};
    const palco = secao.querySelector("[data-amb-palco]");
    const paineis = [...secao.querySelectorAll(".amb__painel")];
    const status = secao.querySelector("[data-amb-status]");
    if (!palco || !paineis.length) return () => {};
    const ultimo = paineis.length - 1;
    const fotos = paineis.map((p) => p.querySelector(".amb__foto"));
    const imagens = fotos.map((f) => f.querySelector("img"));
    const barras = [...secao.querySelectorAll(".amb__progresso i")];
    const camadas = [
      ...fotos.slice(1).map((elemento) => ({ elemento, propriedade: "clipPath" })),
      ...imagens.slice(1).map((elemento) => ({ elemento, propriedade: "transform" })),
      ...barras.map((elemento) => ({ elemento, propriedade: "transform", somenteVisivel: true }))
    ];
    const clamp = (v) => Math.min(1, Math.max(0, v));
    // Passagem lateral (Springs: clip-path de polygon(100% 0, 100% 0, 100% 100%, 100% 100%) até a foto
    // inteira). Aqui o zoom termina junto da passagem. x vai de 0 ao último ambiente.
    // A foto que ainda não entrou também fica em visibility:hidden: o usuário viu a primeira foto sumir no
    // celular, e o recorte sozinho pode falhar no Safari (clip-path com will-change e escala), deixando a foto
    // do último ambiente por cima de tudo. Durante uma passagem (manterVisivel), a foto que sai só some no fim, e as outras continuam escondidas.
    const passa = (x, { manterVisivel = false } = {}) => {
      barras.forEach((barra) => { barra.style.transform = `scaleX(${clamp(x / ultimo)})`; });
      fotos.forEach((f, k) => {
        if (!k) return;
        const parcial = clamp(x - (k - 1));
        const t = movimento.matches ? (x >= k - .5 ? 1 : 0) : parcial > .998 ? 1 : parcial < .002 ? 0 : parcial;
        f.style.clipPath = `inset(0% 0% 0% ${(1 - t) * 100}%)`;
        f.style.visibility = t > 0 ? "" : manterVisivel ? f.style.visibility : "hidden";
        imagens[k].style.transform = `scale(${movimento.matches ? 1 : (1.12 - .12 * t).toFixed(4)})`;
      });
    };
    let ativo = -1;
    let gesto = null;
    let trocaDireta;

    const ativa = (k, { direto = false, anunciar = false } = {}) => {
      if (k === ativo) return;
      if (direto) {
        clearTimeout(trocaDireta);
        secao.classList.add("is-troca-direta");
      }
      // O foco não desaparece quando a rolagem esconde a ficha em que ele estava.
      const focoNaFicha = paineis[ativo]?.contains(document.activeElement);
      ativo = k;
      paineis.forEach((painel, i) => {
        const atual = i === k;
        painel.classList.toggle("is-ativo", atual);
        painel.inert = !atual;
        painel.setAttribute("aria-hidden", String(!atual));
      });
      if (focoNaFicha) paineis[k].querySelector("a")?.focus({ preventScroll: true });
      if (anunciar) status.textContent = paineis[k].getAttribute("aria-label");
      if (direto) {
        void secao.offsetWidth;
        trocaDireta = setTimeout(() => secao.classList.remove("is-troca-direta"), 0);
      }
    };

    const curso = () => secao.offsetHeight - palco.offsetHeight;
    const movimento = matchMedia("(prefers-reduced-motion: reduce)");
    const celular = matchMedia("(max-width: 720px)");
    let animacao = null, destino = null, percurso = null;
    const posicao = () => {
      const inicio = secao.getBoundingClientRect().top + scrollY;
      const passo = curso() / ultimo;
      return { inicio, passo, x: (scrollY - inicio) / passo };
    };
    const cancelar = () => {
      if (!animacao) return;
      const p = animacao.cancelar();
      animacao = null;
      destino = null;
      const y = percurso.origem + (percurso.fim - percurso.origem) * p;
      rolar(y);
      const { x } = posicao();
      passa(x);
      ativa(Math.max(0, Math.min(ultimo, Math.round(x))));
    };
    const deslizar = (k, imediato = false) => {
      cancelar();
      const { inicio, passo } = posicao();
      k = Math.max(0, Math.min(ultimo, k));
      const fim = inicio + passo * k;
      const origem = scrollY;
      if (imediato || movimento.matches) { rolar(fim); passa(k); return; }
      destino = k;
      percurso = { origem, fim };
      rolar(origem); // encerra uma eventual inercia da rolagem anterior
      animacao = window.nazzanTransicaoGaleria({
        camadas,
        preparar: () => passa(k, { manterVisivel: true }),
        meio: () => ativa(k),
        concluir: () => {
          animacao = null; destino = null;
          rolar(fim);
          passa(k); ativa(k);
        }
      });
    };
    const ir = (k, teclado = false) => {
      k = Math.max(0, Math.min(ultimo, k));
      if (teclado || movimento.matches) ativa(k, { direto: true, anunciar: true });
      deslizar(k, teclado);
    };

    // Um gesto normal troca uma foto; eventos de inercia pertencem ao mesmo gesto.
    // So a galeria presa intercepta a roda. Nas duas extremidades a pagina fica livre.
    let ultimaRoda = 0, sentido = 0, soma = 0, consumido = false;
    addEventListener("wheel", (e) => {
      if (celular.matches || movimento.matches || e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (e.target.closest?.("dialog[open], [data-lenis-prevent], input, textarea, select") || document.body.classList.contains("menu-aberto")) return;
      const { x, passo } = posicao();
      if (passo <= 0 || x < -.002 || x > ultimo + .002 || !e.deltaY) return;
      const agora = performance.now(), dir = Math.sign(e.deltaY);
      const delta = Math.abs(e.deltaY) * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? palco.offsetHeight : 1);
      const novo = (!animacao && agora - ultimaRoda > 180 &&
        (delta >= 32 || agora - ultimaRoda > 450)) || dir !== sentido;
      if (novo) { soma = 0; consumido = false; }
      ultimaRoda = agora;
      sentido = dir;
      if (!animacao && ((x <= .002 && dir < 0) || (x >= ultimo - .002 && dir > 0))) {
        if (!consumido) return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      if (consumido) return;
      soma += delta;
      if (soma < 32) return;
      consumido = true;
      const base = destino ?? Math.round(x);
      ir(base + dir);
    }, { passive: false, capture: true });

    // No toque, o dedo continua movendo a pagina; ao soltar, conclui a passagem.
    let toque = null;
    palco.addEventListener("touchstart", (e) => {
      if (celular.matches) { toque = null; return; }
      cancelar();
      const { x } = posicao();
      toque = e.touches.length === 1 && x >= -.002 && x <= ultimo + .002
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY, indice: Math.round(x) } : null;
    }, { passive: true });
    palco.addEventListener("touchend", (e) => {
      if (!toque || e.touches.length || movimento.matches) { toque = null; return; }
      const fim = e.changedTouches[0], dy = toque.y - fim.clientY, dx = toque.x - fim.clientX;
      const alvo = toque.indice + Math.sign(dy);
      if (Math.abs(dy) >= 32 && Math.abs(dy) > Math.abs(dx) * 1.3 && alvo >= 0 && alvo <= ultimo) ir(alvo);
      toque = null;
    }, { passive: true });
    palco.addEventListener("touchcancel", () => { toque = null; }, { passive: true });
    addEventListener("resize", cancelar);
    addEventListener("pointerdown", cancelar, { capture: true, passive: true });
    addEventListener("keydown", (e) => {
      if (["Tab", "Escape", "PageDown", "PageUp", "ArrowDown", "ArrowUp", " "].includes(e.key)) cancelar();
    });
    movimento.addEventListener("change", cancelar);

    // Setas só valem enquanto o palco está preso na tela, fora de campos de texto.
    document.addEventListener("keydown", (e) => {
      if (celular.matches || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
      const r = secao.getBoundingClientRect();
      if (r.top > 1 || r.bottom < innerHeight - 1) return;
      e.preventDefault();
      ir(e.key === "Home" ? 0 : e.key === "End" ? ultimo : ativo + (e.key === "ArrowRight" ? 1 : -1), true);
    });

    palco.addEventListener("pointerdown", (e) => {
      if (celular.matches || !e.isPrimary || e.button !== 0 || e.target.closest("a, button")) return;
      gesto = { id: e.pointerId, x: e.clientX, y: e.clientY };
      palco.setPointerCapture(e.pointerId);
    });
    const encerraGesto = (e) => {
      if (!gesto || e.pointerId !== gesto.id) return;
      const dx = e.clientX - gesto.x;
      const dy = e.clientY - gesto.y;
      if (e.type === "pointerup" && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3) ir(ativo + (dx < 0 ? 1 : -1));
      gesto = null;
    };
    palco.addEventListener("pointerup", encerraGesto);
    palco.addEventListener("pointercancel", encerraGesto);
    palco.addEventListener("lostpointercapture", encerraGesto);

    /* Celular: cartões que se empilham. O cartão seguinte sobe da base do palco até o lugar dele; os de
       baixo encolhem 5% por cartão por cima (até três) a partir do topo, e a foto chega com 1,12 de escala
       e assenta em 1. Os que ainda não chegaram e os cobertos por três ficam com visibility hidden. */
    let alturaPalco = 0;
    const desenhaCelular = (x) => paineis.forEach((p, k) => {
      const chegada = k ? clamp(x - (k - 1)) : 1;
      const fundo = Math.min(3, Math.max(0, x - k));
      p.style.visibility = chegada > 0 && fundo < 3 ? "" : "hidden";
      p.style.transform = `translate3d(0, ${((1 - chegada) * alturaPalco).toFixed(1)}px, 0) scale(${(1 - .05 * fundo).toFixed(4)})`;
      imagens[k].style.transform = `scale(${(1 + .12 * (1 - chegada)).toFixed(4)})`;
    });
    const trava = window.nazzanTrava?.({
      trilho: secao,
      palco,
      n: paineis.length,
      ativo: () => celular.matches,
      desenha: desenhaCelular,
      acende: (k) => ativa(k, { anunciar: true }),
    });

    // Rolagem no computador: a passagem lateral segue a posição no palco
    const acompanha = () => {
      if (animacao || (celular.matches && trava)) return;
      const c = curso();
      if (c <= 0) return;
      const p = Math.max(0, Math.min(1, -secao.getBoundingClientRect().top / c));
      passa(p * ultimo);
      ativa(Math.round(p * ultimo), { direto: reduzMovimento });
    };
    // Troca de modo: limpa o que um deixou no outro e repinta
    const modo = () => {
      const cel = celular.matches && Boolean(trava);
      cancelar();
      secao.classList.toggle("is-celular", cel);
      fotos.forEach((f) => { f.style.clipPath = ""; f.style.visibility = ""; });
      imagens.forEach((img) => { img.style.transform = ""; });
      barras.forEach((barra) => { barra.style.transform = ""; });
      paineis.forEach((p, k) => {
        ["transform", "visibility"].forEach((prop) => p.style.removeProperty(prop));
        if (cel) p.style.setProperty("--i", k); else p.style.removeProperty("--i");
      });
      if (cel) { alturaPalco = palco.offsetHeight; trava.redesenha(); }
      else { passa(0); acompanha(); }
    };
    addEventListener("resize", () => { if (secao.classList.contains("is-celular")) { alturaPalco = palco.offsetHeight; trava.redesenha(); } });

    secao.classList.add("is-pronta");
    ativa(0, { direto: true });
    passa(0);
    modo();
    celular.addEventListener("change", modo);
    if ("IntersectionObserver" in window) {
      const imagens = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        paineis.forEach((painel) => {
          const img = painel.querySelector("img");
          img.loading = "eager";
          img.decode?.().catch(() => {});
        });
        imagens.disconnect();
      }, { rootMargin: "100% 0px" });
      imagens.observe(secao);
    }

    return acompanha;
  };
})();
