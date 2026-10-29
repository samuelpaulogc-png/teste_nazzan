/* Entrada da hero independente do Lenis e dos demais efeitos da página. */
(() => {
  "use strict";

  const doc = document.documentElement;
  const hero = document.querySelector("[data-hero]");
  const titulo = document.querySelector("[data-hero-titulo]");
  const galeria = document.querySelector("[data-galeria-hero]");
  const split = document.querySelector("[data-split]");
  const logoIntro = document.querySelector("[data-logo-intro]");
  if (!hero || !titulo || !galeria) {
    doc.classList.remove("is-hero-entrada", "is-intro", "is-intro-logo");
    return;
  }

  const movimento = matchMedia("(prefers-reduced-motion: reduce)");
  const TITULOS = {
    cozinha: "Sua cozinha <em>sob medida</em>, pronta na data combinada.",
    closet: "Seu closet <em>sob medida</em>, pronto na data combinada.",
    quarto: "Seu quarto <em>sob medida</em>, pronto na data combinada.",
    "home-office": "Seu home office <em>sob medida</em>, pronto na data combinada.",
    sala: "Sua sala <em>sob medida</em>, pronta na data combinada.",
    "casa-completa": "Sua casa inteira <em>sob medida</em>, num só cronograma.",
  };
  const ambiente = new URLSearchParams(location.search).get("ambiente");
  if (Object.hasOwn(TITULOS, ambiente)) titulo.innerHTML = TITULOS[ambiente];

  function preparaPalavras() {
    let indice = 0;
    const mascara = (conteudo) => {
      const caixa = document.createElement("span");
      caixa.className = "pal";
      const palavra = document.createElement("span");
      palavra.style.setProperty("--i", indice++);
      palavra.append(conteudo);
      caixa.append(palavra);
      return caixa;
    };
    [...titulo.childNodes].forEach((no) => {
      if (no.nodeType === Node.TEXT_NODE) {
        const fragmento = document.createDocumentFragment();
        no.textContent.split(/(\s+)/).forEach((parte) => {
          if (!parte) return;
          fragmento.append(/^\s+$/.test(parte) ? parte : mascara(parte));
        });
        no.replaceWith(fragmento);
      } else if (no.nodeName === "EM") {
        const unidade = document.createDocumentFragment();
        unidade.append(no.cloneNode(true));
        const seguinte = no.nextSibling;
        const pontuacao = seguinte?.nodeType === Node.TEXT_NODE && seguinte.textContent.match(/^[,.;:!?]+/);
        if (pontuacao) {
          unidade.append(pontuacao[0]);
          seguinte.textContent = seguinte.textContent.slice(pontuacao[0].length);
        }
        no.replaceWith(mascara(unidade));
      }
    });
  }

  // Os mesmos ambientes e projetos da página, em miniaturas de 600px já no formato da galeria
  const FOTOS = [
    "hero-galeria/01-cozinha", "hero-galeria/02-sala-jantar", "hero-galeria/02-closet",
    "hero-galeria/01-cozinha-nogueira", "hero-galeria/05-sala", "hero-galeria/03-quarto",
    "hero-galeria/03-cozinha-carvalho", "hero-galeria/04-home-office", "hero-galeria/04-sala-ripado",
    "hero-galeria/00-ambientes",
  ];

  let finalizada = false;
  let garantia = 0;
  const espera = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function inicia() {
    doc.classList.add("hero-iniciada", "galeria-iniciada");
  }

  function conclui() {
    if (finalizada) return;
    finalizada = true;
    clearTimeout(garantia);
    inicia();
    doc.classList.remove("is-intro", "is-intro-logo", "intro-finalizando");
    logoIntro?.remove();
    split?.remove();
    removeEventListener("resize", ajustaLogo);
    document.removeEventListener("keydown", pulaPorTeclado);
    document.dispatchEvent(new Event("nazzan:intro-fim"));
  }

  function ajustaLogo() {
    if (!logoIntro?.classList.contains("is-viajando")) return;
    const alvo = document.querySelector(".topo__logo").getBoundingClientRect();
    const palco = hero.getBoundingClientRect();
    const x = alvo.left - palco.left - palco.width / 2;
    const y = alvo.top - palco.top - palco.height / 2;
    logoIntro.style.transform = `translate(${x}px, ${y}px) scale(${alvo.width / logoIntro.offsetWidth})`;
  }

  function pulaPorTeclado(evento) {
    if (evento.key === "Tab" || evento.key === "Escape") conclui();
  }

  async function aguarda(ms) {
    await espera(ms);
    if (!doc.classList.contains("is-intro") || movimento.matches) conclui();
    return !finalizada;
  }

  async function aberturaSprings() {
    if (!split || !logoIntro || !doc.classList.contains("is-intro")) {
      conclui();
      return;
    }
    addEventListener("resize", ajustaLogo);
    if (!await aguarda(150)) return;
    logoIntro.classList.add("is-visivel");
    if (!await aguarda(1300)) return;

    const metades = [...split.querySelectorAll(".hero__metade")];
    for (let foto = 0; foto < 2; foto++) {
      metades[0].querySelectorAll("figure")[foto].classList.add("is-dentro");
      if (!await aguarda(180)) return;
      metades[1].querySelectorAll("figure")[foto].classList.add("is-dentro");
      if (!await aguarda(870)) return;
    }
    if (!await aguarda(250)) return;

    doc.classList.add("galeria-iniciada", "intro-finalizando");
    split.classList.add("is-aberto");
    logoIntro.classList.add("is-viajando");
    ajustaLogo();
    if (!await aguarda(900)) return;
    inicia();
    if (!await aguarda(800)) return;
    try { sessionStorage.setItem("nazzan-abertura-springs", "1"); } catch (e) {}
    conclui();
  }

  async function entrada() {
    try {
      if (doc.classList.contains("is-intro")) {
        hero.querySelectorAll("[data-intro-src]").forEach((img) => { img.src = img.dataset.introSrc; });
        if (!movimento.matches) preparaPalavras();
      }
      if (!galeria.children.length) {
      for (let f = 0; f < 5; f++) {
        const fileira = document.createElement("div");
        fileira.className = "hero__fileira";
        const ordem = FOTOS.map((_, i) => FOTOS[(i + f * 4) % FOTOS.length]);
        [...ordem, ...ordem].forEach((nome) => {
          const figura = document.createElement("figure");
          const imagem = document.createElement("img");
          // data-fotos permite usar a hero fora da raiz (ex.: protótipos em prototypes/)
          imagem.src = `${galeria.dataset.fotos || "assets/img/"}${nome}.webp`;
          imagem.alt = "";
          imagem.decoding = "async";
          figura.append(imagem);
          fileira.append(figura);
        });
        galeria.append(fileira);
      }

      }
      if (movimento.matches || !doc.classList.contains("is-intro")) {
        conclui();
        return;
      }

      // Aguarda a fonte e uma amostra das fotos, sem prolongar a espera da copy.
      const fotosIniciais = [...hero.querySelectorAll("[data-split] img"), ...[...galeria.querySelectorAll(".hero__fileira:first-child img")].slice(0, 4)];
      await Promise.race([
        Promise.allSettled([document.fonts.ready, ...fotosIniciais.map((img) => img.decode())]),
        new Promise((resolve) => setTimeout(resolve, 850)),
      ]);
      // Duas pinturas separam o estado mascarado do estado revelado.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (!finalizada) await aberturaSprings();
    } catch (erro) {
      doc.classList.remove("is-hero-entrada");
      conclui();
    }
  }

  hero.addEventListener("focusin", conclui, { once: true });
  movimento.addEventListener("change", (evento) => {
    if (evento.matches) {
      doc.classList.remove("is-hero-entrada");
      conclui();
    }
  });
  if (doc.classList.contains("is-intro")) document.addEventListener("keydown", pulaPorTeclado);
  garantia = setTimeout(conclui, 9000);
  doc.classList.add("hero-preparada");
  entrada();
})();
