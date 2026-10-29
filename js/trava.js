/* Trava das galerias presas no celular (22/10/2026; protótipo prototypes/amb-acab-mobile-a.html).
   Usada por Ambientes e Acabamentos. É a mesma ideia do iniciaPino do main.js (Processo, Projetos e
   "O que definimos"): o item não depende da posição de rolagem, só um gesto passa de um item para o outro.
   Enquanto o palco está preso, a rolagem fica segurada na âncora do item (o palco é sticky, então segurar
   não aparece) e o toque não rola a página. Quem chega rolando, mesmo com arremesso, para no primeiro item
   (vindo de cima) ou no último (de baixo). Nas pontas, o gesto de saída libera.
   Uso: nazzanTrava({ trilho, palco, n, ativo(), desenha(x), acende(i), limites() }).
   desenha recebe a posição em itens (fracionária durante a passagem); acende, o item novo assim que o
   gesto termina; ativo diz se a trava vale agora (ex.: só no celular); limites é opcional. */
(() => {
  "use strict";
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const curva = (p) => 1 - Math.pow(1 - p, 4); // saída suave, perto da --ease
  const reduzido = matchMedia("(prefers-reduced-motion: reduce)");
  const toqueGrosso = matchMedia("(pointer: coarse)");

  // Lista lida pelo main.js: com uma galeria presa, o cabeçalho sai da frente da foto
  const travas = window.nazzanTravas = window.nazzanTravas || [];

  // Pula para a posição sem animar; o main.js guarda a posição para o cabeçalho não piscar
  const rolar = (y) => {
    dispatchEvent(new CustomEvent("nazzan:galeria-posicao", { detail: y }));
    if (window.nazzanLenis) window.nazzanLenis.scrollTo(y, { immediate: true, force: true });
    else scrollTo({ top: y, behavior: "instant" });
  };

  // Corta o embalo de um arremesso: overflow hidden no html por um instante para a inércia
  let freando = false;
  const freia = () => {
    if (freando || !toqueGrosso.matches) return;
    freando = true;
    document.documentElement.style.overflow = "hidden";
    setTimeout(() => { document.documentElement.style.removeProperty("overflow"); freando = false; }, 80);
  };

  window.nazzanTrava = ({ trilho, palco, n, ativo = () => true, desenha, acende, limites }) => {
    const ultimo = n - 1;
    let atual = 0;
    let xv = 0;
    let quadro = 0;
    let livre = "";       // "cima" ou "baixo": gesto de saída numa ponta, a página rola só para esse lado
    let antes = scrollY;

    const mede = limites || (() => {
      const inicio = trilho.getBoundingClientRect().top + scrollY;
      return { inicio, fim: inicio + trilho.offsetHeight - palco.offsetHeight };
    });
    const faixa = () => { const { inicio, fim } = mede(); return { inicio, fim, passo: (fim - inicio) / ultimo }; };
    const ancora = (i) => { const { inicio, passo } = faixa(); return Math.round(inicio + passo * i); };
    const preso = () => {
      if (!ativo()) return false;
      const { inicio, fim } = faixa();
      return scrollY >= inicio - 2 && scrollY <= fim + 2;
    };
    const segura = (y) => { if (Math.abs(scrollY - y) > 1) rolar(y); };

    const pinta = (x) => { xv = x; desenha(x); };
    const marca = (i) => { if (i !== atual) { atual = i; acende(i); } };
    const para = () => { cancelAnimationFrame(quadro); quadro = 0; };
    const vai = (alvo) => {
      para();
      const de = xv;
      if (reduzido.matches) { pinta(alvo); return; }
      const t0 = performance.now();
      const passo = (t) => {
        const p = Math.min(1, (t - t0) / 900);
        pinta(de + (alvo - de) * curva(p));
        quadro = p < 1 ? requestAnimationFrame(passo) : 0;
      };
      quadro = requestAnimationFrame(passo);
    };
    const ir = (i) => {
      i = clamp(i, 0, ultimo);
      livre = "";
      marca(i);
      segura(ancora(i));
      vai(i);
    };

    addEventListener("scroll", () => {
      const y = scrollY;
      if (!ativo() || window.nazzanNavegando?.()) { antes = y; return; }
      const { inicio, fim, passo } = faixa();
      const dentro = y >= inicio - 2 && y <= fim + 2;
      if (!dentro) { livre = ""; antes = y; return; }
      if (antes < inicio - 2 && atual !== 0 && !livre) { marca(0); para(); pinta(0); }
      if (antes > fim + 2 && atual !== ultimo && !livre) { marca(ultimo); para(); pinta(ultimo); }
      const a = Math.round(inicio + passo * atual);
      if (!(livre === "cima" && y <= a) && !(livre === "baixo" && y >= a) && Math.abs(y - a) > 1) { segura(a); freia(); }
      antes = scrollY;
    }, { passive: true });

    // Toque: um gesto = um item. O dedo dá uma prévia de até 0,3 item; ao soltar, passa ou volta.
    let toque = null;
    palco.addEventListener("touchstart", (e) => {
      livre = "";
      toque = e.touches.length === 1 && preso() ? { y: e.touches[0].clientY, dy: 0, dono: null } : null;
    }, { passive: true });
    palco.addEventListener("touchmove", (e) => {
      if (!toque) return;
      const dy = toque.y - e.touches[0].clientY; // > 0: o dedo sobe, próximo item
      if (toque.dono === null) {
        if (!dy) return;
        if ((atual === 0 && dy < 0) || (atual === ultimo && dy > 0)) {
          livre = dy < 0 ? "cima" : "baixo";
          toque.dono = false;
          return;
        }
        toque.dono = e.cancelable;
      }
      if (!toque.dono) return;
      e.preventDefault();
      para();
      pinta(atual + clamp(dy / 500, -.3, .3));
      toque.dy = dy;
    }, { passive: false });
    const solta = () => {
      if (toque?.dono) {
        if (Math.abs(toque.dy) >= 32) ir(atual + Math.sign(toque.dy));
        else vai(atual);
      }
      toque = null;
    };
    palco.addEventListener("touchend", solta, { passive: true });
    palco.addEventListener("touchcancel", solta, { passive: true });

    // Roda (celular com mouse ou janela estreita): a mesma trava; pausa de 180ms ou troca de sentido
    // é outro gesto. Na captura, antes do Lenis.
    let rodaT = 0, rodaSentido = 0, rodaSoma = 0, rodaUsada = false;
    addEventListener("wheel", (e) => {
      if (e.ctrlKey || !e.deltaY || e.defaultPrevented || !preso() || document.body.classList.contains("menu-aberto")) return;
      const dir = Math.sign(e.deltaY), agora = performance.now();
      if (agora - rodaT > 180 || dir !== rodaSentido) { rodaSoma = 0; rodaUsada = false; }
      rodaT = agora; rodaSentido = dir;
      if (!rodaUsada && ((atual === 0 && dir < 0) || (atual === ultimo && dir > 0))) {
        livre = dir < 0 ? "cima" : "baixo";
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      if (rodaUsada) return;
      rodaSoma += Math.abs(e.deltaY) * (e.deltaMode === 1 ? 16 : 1);
      if (rodaSoma < 32) return;
      rodaUsada = true;
      ir(atual + dir);
    }, { passive: false, capture: true });

    const trava = {
      ir,
      preso,
      atual: () => atual,
      // Repinta o item atual (ao entrar no modo celular ou mudar o tamanho da tela)
      redesenha: () => { para(); acende(atual); pinta(atual); },
    };
    travas.push(trava);
    return trava;
  };
})();
