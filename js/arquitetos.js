/* Arquitetos (23/10/2026): a cômoda do desenho se forma quando aparece, uma vez (opção D de
   prototypes/arquitetos-opcoes.html; o desenho é o do estudo do Codex, prototypes/arquitetos-01.html).
   Em ms: linhas de construção e cotas de 0 a 385 (55ms entre elas); corpo aos 450, lateral aos 700 e base aos 900;
   as três gavetas a partir dos 1500, 220ms entre elas, cada uma desenhando o contorno e deslizando 18px para o
   lugar; a aresta dourada aos 2300 e as faces aos 2400. O traço é stroke-dashoffset 1 → 0 com pathLength 1, pela
   Web Animations (pelo CSS, a transição não disparava nesses paths). */
(() => {
  "use strict";
  const desenhos = document.querySelectorAll("[data-aq-forma]");
  if (!desenhos.length) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window) || !Element.prototype.animate) {
    desenhos.forEach((el) => el.classList.add("is-formado"));
    return;
  }

  const corre = "cubic-bezier(.45, 0, .2, 1)", assenta = "cubic-bezier(.22, 1, .36, 1)";
  const traco = (p, inicio, duracao) => p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: duracao, delay: inicio, easing: corre, fill: "both" });
  const forma = (el) => {
    const aux = [...el.querySelectorAll(".auxiliar [pathLength]")];
    const [corpo, lateral, base] = el.querySelectorAll(".estrutura > [pathLength]");
    const gavetas = [...el.querySelectorAll(".aq-gaveta")];
    aux.forEach((p, i) => traco(p, i * 55, 900));
    traco(corpo, 450, 1400); traco(lateral, 700, 1000); traco(base, 900, 800);
    gavetas.forEach((g, k) => {
      g.animate([{ opacity: 0, transform: "translateX(-18px)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: 1500 + k * 220, easing: assenta, fill: "both" });
      g.querySelectorAll("[pathLength]").forEach((p) => traco(p, 1500 + k * 220, 800));
    });
    traco(el.querySelector(".detalhe"), 2300, 900);
    el.querySelectorAll(".face").forEach((f) => f.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: 2400, easing: assenta, fill: "both" }));
  };

  const vigia = new IntersectionObserver((entradas) => entradas.forEach((e) => {
    if (!e.isIntersecting) return;
    forma(e.target);
    vigia.unobserve(e.target);
  }), { threshold: .35 });
  desenhos.forEach((el) => vigia.observe(el));
})();
