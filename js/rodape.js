/* Nazzan · logo do rodapé (ícone dourado + NAZZAN), do traço ao sólido
   Quando 35% da logo aparece, uma vez: o contorno de cada peça corre em linha fina (1,5s, a cada 55ms), o
   preenchimento sobe de baixo e fecha (1,1s) e, por fim, o contorno se apaga (.9s). O ícone fica em dourado e as
   letras em creme. Com mouse, a peça sob o cursor volta a ser só o desenho e fecha de novo ao sair.
   Todas as passagens usam a mesma curva (cúbica de entrada e saída) e partem do ponto em que estão. */
(() => {
  "use strict";
  const svg = document.querySelector("[data-gigante]");
  if (!svg) return;

  // Traço de 1,25px em qualquer largura (o SVG escala com a tela)
  const espessura = () => svg.style.setProperty("--linha", (1.25 * svg.viewBox.baseVal.width / Math.max(1, svg.clientWidth)).toFixed(2));
  espessura();
  addEventListener("resize", espessura);

  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;

  // g: guias desenhadas · gv: guias visíveis · t: contorno desenhado · v: contorno visível · f: preenchimento
  const estado = { g: 0, gv: 1 };
  const letras = [...svg.querySelectorAll("[data-gigante-letra]")].map((el, i) => {
    const nivel = svg.querySelector(`#rg-cheio-${i} rect`);
    return { el, nivel, altura: nivel.height.baseVal.value, t: 0, v: 1, f: 0 };
  });
  const curva = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  function pinta() {
    svg.style.setProperty("--g", estado.g.toFixed(4));
    svg.style.setProperty("--gv", estado.gv.toFixed(4));
    letras.forEach((l) => {
      l.el.style.setProperty("--t", l.t.toFixed(4));
      l.el.style.setProperty("--v", l.v.toFixed(4));
      l.nivel.setAttribute("transform", `translate(0 ${((1 - l.f) * l.altura).toFixed(1)})`);
    });
  }

  let rodando = false;
  function vai(obj, chave, para, dur, atraso = 0) {
    (obj.tw ||= {})[chave] = { de: null, para, ini: performance.now() + atraso, dur };
    if (!rodando) { rodando = true; requestAnimationFrame(passo); }
  }
  function passo(agora) {
    let falta = false;
    [estado, ...letras].forEach((obj) => {
      Object.entries(obj.tw || {}).forEach(([chave, tw]) => {
        if (agora < tw.ini) { falta = true; return; }
        if (tw.de === null) tw.de = obj[chave];
        const x = Math.min(1, (agora - tw.ini) / tw.dur);
        obj[chave] = tw.de + (tw.para - tw.de) * curva(x);
        if (x < 1) falta = true; else delete obj.tw[chave];
      });
    });
    pinta();
    if (falta) requestAnimationFrame(passo); else rodando = false;
  }

  pinta();
  let pronto = false;
  const FECHA = 1500, PASSO = 55, FIM = FECHA + (letras.length - 1) * PASSO + 1100;
  new IntersectionObserver((entradas, obs) => {
    if (!entradas.some((e) => e.isIntersecting)) return;
    obs.disconnect();
    vai(estado, "g", 1, 1200);
    letras.forEach((l, i) => {
      vai(l, "t", 1, 1500, 200 + i * PASSO);
      vai(l, "f", 1, 1100, FECHA + i * PASSO);
      vai(l, "v", 0, 900, FECHA + i * PASSO + 1100);
    });
    vai(estado, "gv", 0, 900, FIM);
    setTimeout(() => (pronto = true), FIM + 900);
  }, { threshold: .35 }).observe(svg);

  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  letras.forEach((l) => {
    l.el.addEventListener("pointerenter", () => { if (pronto) { vai(l, "v", 1, 400); vai(l, "f", 0, 650); } });
    l.el.addEventListener("pointerleave", () => { if (pronto) { vai(l, "f", 1, 900); vai(l, "v", 0, 700, 600); } });
  });
})();
