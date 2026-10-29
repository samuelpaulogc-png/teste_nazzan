/* Nazzan · landing page
   Sem build. Lenis (rolagem suave) vem do unpkg; o resto é JS puro.
   Padrões de movimento: estudo-referencias.md (Find, Springs, Hofstaetter). */

(() => {
  "use strict";

  const CONFIG = {
    whatsapp: "5511992478221",
  };

  const doc = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const params = new URLSearchParams(location.search);
  const reduzMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  doc.classList.add("js");

  // A decoração só precisa de quadros enquanto aparece na tela.
  // Em especial, a hero continua no DOM depois de desaparecer no manifesto.
  if ("IntersectionObserver" in window) {
    const decoracoes = new IntersectionObserver((entradas) => {
      entradas.forEach(({ target, isIntersecting }) => {
        target.classList.toggle("is-movimento-pausado", !isIntersecting);
      });
    });
    const alvos = new Set([
      ...$$(".hero, .atmosfera, .a3__dica"),
      ...$$(".mf__fecho-fundo").map((el) => el.parentElement)
    ]);
    alvos.forEach((el) => decoracoes.observe(el));
  }

  /* ---------- Modo de revisão (?revisao=1) ---------- */
  if (params.get("revisao") === "1") {
    doc.classList.remove("is-limpo");
    doc.classList.add("is-revisao");
  }
  $("[data-revisao-btn]")?.addEventListener("click", () => {
    params.delete("revisao");
    const q = params.toString();
    location.href = location.pathname + (q ? "?" + q : "") + location.hash;
  });

  /* ---------- Rolagem suave (Lenis, ref.: Hofstaetter) ---------- */
  let lenis = null;
  if (!reduzMovimento && typeof window.Lenis === "function") {
    lenis = new window.Lenis({
      duration: 1.4,
      smoothWheel: true,
      wheelMultiplier: 0.8,
      touchMultiplier: 1,
      prevent: (no) => no instanceof Element && Boolean(no.closest("dialog[open], [data-lenis-prevent]")),
    });
    // Exposto para os módulos de seção (acabamentos.js) rolarem com a mesma suavidade
    window.nazzanLenis = lenis;
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    if (doc.classList.contains("is-intro")) {
      lenis.stop();
      document.addEventListener("nazzan:intro-fim", () => {
        lenis.resize();
        if (!document.body.classList.contains("menu-aberto")) lenis.start();
      }, { once: true });
    }
  }
  // Enquanto um link de âncora rola a página, os blocos presos do celular não seguram a rolagem
  let navegandoAte = 0;
  window.nazzanNavegando = () => performance.now() < navegandoAte; // lido pela trava de Ambientes e Acabamentos (trava.js)
  const irPara = (alvo) => {
    navegandoAte = performance.now() + 1700;
    if (lenis) lenis.scrollTo(alvo, { duration: 1.4, force: true, onComplete: () => { navegandoAte = 0; } });
    else alvo.scrollIntoView({ behavior: reduzMovimento ? "auto" : "smooth" });
  };
  $$('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const sel = a.getAttribute("href");
      if (!sel || sel === "#") return;
      const alvo = $(sel);
      if (!alvo) return;
      e.preventDefault();
      irPara(alvo);
      history.replaceState(null, "", sel);
    })
  );

  /* ---------- WhatsApp ---------- */
  const linkWhats = (texto) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`;
  /* O pedido vai na mensagem de todos os links [data-wa]: o ambiente dos atalhos "Quero minha cozinha ↗"
     (ou do ?ambiente=) e, vindo da seção de arquitetos, se a pessoa já tem projeto. */
  const pedido = { ambiente: "", arquiteto: "" };
  const atualizaWhats = () => {
    const partes = [`Olá! Vim pelo site e quero um orçamento${pedido.ambiente ? ` para ${pedido.ambiente.toLowerCase()}` : ""}.`];
    if (pedido.arquiteto) partes.push(`${pedido.arquiteto}.`);
    const texto = partes.join(" ");
    $$("[data-wa]").forEach((a) => (a.href = linkWhats(texto)));
  };
  atualizaWhats();

  /* ---------- Variações por ambiente (Anexo A da copy) ---------- */
  const AMBIENTES = {
    cozinha: { form: "Cozinha" },
    closet: { form: "Closet" },
    quarto: { form: "Quarto" },
    "home-office": { form: "Home office" },
    sala: { form: "Sala" },
    "casa-completa": { form: "Casa completa" },
    corporativo: { form: "Corporativo" },
  };
  const marcaAmbiente = (valor) => {
    pedido.ambiente = valor;
    atualizaWhats();
  };
  const amb = AMBIENTES[params.get("ambiente")];
  if (amb) marcaAmbiente(amb.form);

  /* ---------- Divisão de texto em palavras ----------
     modo "mascara": cada palavra numa caixa com overflow escondido (títulos de seção).
     modo "palavra": cada palavra num span simples (manifesto). <em> fica inteiro. */
  function divide(el, modo) {
    let i = 0;
    const embrulha = (conteudo) => {
      if (modo === "mascara") {
        const caixa = document.createElement("span");
        caixa.className = "pal";
        const dentro = document.createElement("span");
        dentro.style.setProperty("--i", i++);
        dentro.append(conteudo);
        caixa.append(dentro);
        return caixa;
      }
      const s = document.createElement("span");
      s.className = "pf";
      s.append(conteudo);
      return s;
    };
    const percorre = (no) => {
      [...no.childNodes].forEach((filho) => {
        if (filho.nodeType === 3) {
          const frag = document.createDocumentFragment();
          filho.textContent.split(/( +)/).forEach((parte) => {
            if (!parte) return;
            if (/^ +$/.test(parte)) frag.append(" ");
            else frag.append(embrulha(parte.replace(/\n\s*/g, "")));
          });
          filho.replaceWith(frag);
        } else if (filho.nodeType === 1) {
          if (filho.tagName === "EM" && modo === "mascara") {
            // a pontuação colada ao <em> entra na mesma caixa, para não quebrar sozinha
            const unidade = document.createDocumentFragment();
            unidade.append(filho.cloneNode(true));
            const seguinte = filho.nextSibling;
            const pont = seguinte?.nodeType === 3 && seguinte.textContent.match(/^[,.;:!?]+/);
            if (pont) {
              unidade.append(pont[0]);
              seguinte.textContent = seguinte.textContent.slice(pont[0].length);
            }
            filho.replaceWith(embrulha(unidade));
          } else percorre(filho);
        }
      });
    };
    el.normalize();
    percorre(el);
  }
  /* ---------- Botões e navegação: troca vertical do texto no hover ---------- */
  $$(".btn, .pill, .topo__menu, .topo__contato, .menu-painel__atalho, .menu-painel__nav a").forEach((el) => {
    const leitor = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (no) => no.textContent.trim() && !no.parentElement.closest("svg, .sr, .rola, .topo__menu-icone, .topo__contato-icone")
        ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });
    const textos = [];
    while (leitor.nextNode()) textos.push(leitor.currentNode);
    textos.forEach((no) => {
      const texto = no.textContent.trim();
      const caixa = document.createElement("span");
      caixa.className = "rola";
      const original = document.createElement("span");
      original.textContent = texto;
      const copia = original.cloneNode(true);
      copia.className = "rola__copia";
      copia.setAttribute("aria-hidden", "true");
      caixa.append(original, copia);
      // Preservar espaços e elementos existentes mantém os ícones e seus eventos.
      no.replaceWith(no.textContent.match(/^\s*/)[0], caixa, no.textContent.match(/\s*$/)[0]);
    });
    if (textos.length) el.classList.add("has-rola");
  });

  /* ---------- Cabeçalho ---------- */
  const topo = $("[data-topo]");
  const hero = $(".hero");
  let ultimoY = window.scrollY;
  addEventListener("nazzan:galeria-posicao", (e) => { ultimoY = e.detail; });
  function cabecalho(y) {
    const limiteHero = hero.offsetHeight - topo.offsetHeight;
    topo.classList.toggle("is-solido", y > limiteHero - 10);
    // Ruido subpixel e quadros sem deslocamento nao invertem a direcao do cabecalho.
    if (Math.abs(y - ultimoY) >= 4) {
      const descendo = y > ultimoY && y > limiteHero + 200;
      if (!document.body.classList.contains("menu-aberto")) topo.classList.toggle("is-escondido", descendo);
      ultimoY = y;
    }
  }

  /* ---------- Menu principal: modal nativo com foco contido e Escape ---------- */
  const menuBtn = $("[data-menu-btn]");
  const menu = $("[data-menu]");
  const menuNav = $(".menu-painel__nav", menu);
  const menuLinks = $$("[data-menu-previa]", menu);
  const menuFotos = $$("[data-menu-foto]", menu);
  let versaoMenu = 0;
  let versaoPrevia = 0;
  let camadaPrevia = 2;

  function limpaFotos(fotoAtiva) {
    menuFotos.forEach((foto) => {
      foto.classList.remove("is-anterior");
      if (foto === fotoAtiva) foto.style.zIndex = "2";
      else foto.style.removeProperty("z-index");
    });
    camadaPrevia = 2;
  }

  async function mostraPrevia(link, destacar = true) {
    const pedido = ++versaoPrevia;
    menuNav.classList.toggle("has-destaque", destacar);
    menuLinks.forEach((item) => item.classList.toggle("is-previa", item === link));
    if (matchMedia("(max-width: 720px)").matches) return;
    const foto = menuFotos.find((item) => item.dataset.menuFoto === link.dataset.menuPrevia);
    const anterior = $(".menu-painel__foto.is-ativa", menu);
    if (!foto || foto === anterior) return;
    const imagem = $("img", foto);
    imagem.loading = "eager";
    try { await imagem.decode(); } catch (e) { return; }
    if (pedido !== versaoPrevia || !menu.open || menu.classList.contains("is-fechando")) return;
    // Mantém as imagens anteriores por baixo enquanto a cortina atual termina.
    // Assim, mover o mouse rapidamente não completa a foto anterior com um salto.
    foto.style.transition = "none";
    foto.classList.remove("is-anterior", "is-ativa");
    foto.style.zIndex = String(++camadaPrevia);
    foto.getBoundingClientRect();
    foto.style.removeProperty("transition");
    if (anterior) {
      anterior.classList.remove("is-ativa");
      anterior.classList.add("is-anterior");
    }
    foto.classList.add("is-ativa");
    Promise.allSettled(foto.getAnimations().map((animacao) => animacao.finished)).then(() => {
      if (pedido === versaoPrevia && foto.classList.contains("is-ativa")) limpaFotos(foto);
    });
  }

  const sincronizaMenu = () => {
    const abrir = menu.open;
    menuBtn.setAttribute("aria-expanded", String(abrir));
    menuBtn.querySelector(".sr").textContent = abrir ? "Fechar menu" : "Abrir menu";
    document.body.classList.toggle("menu-aberto", abrir);
    topo.classList.remove("is-escondido");
    if (lenis) abrir ? lenis.stop() : lenis.start();
  };
  const abreMenu = (abrir, imediato = false) => {
    const versao = ++versaoMenu;
    if (abrir) {
      menu.classList.remove("is-fechando");
      menu.classList.toggle("sem-transicao", imediato || reduzMovimento);
      if (!menu.open) menu.showModal();
      mostraPrevia(menuLinks.find((link) => link.classList.contains("is-atual")) || menuLinks[0], false);
      if (imediato || reduzMovimento) menu.classList.add("is-visivel");
      else requestAnimationFrame(() => requestAnimationFrame(() => {
        if (versao === versaoMenu && menu.open) menu.classList.add("is-visivel");
      }));
    } else {
      ++versaoPrevia;
      menu.classList.add("is-fechando");
      menu.classList.remove("is-visivel");
      if (imediato || reduzMovimento || menu.classList.contains("sem-transicao")) {
        menu.classList.add("sem-transicao");
        if (menu.open) menu.close();
      } else if (menu.open) {
        const transicoes = $$(".menu-painel__conteudo, .menu-painel__imagens", menu)
          .flatMap((painel) => painel.getAnimations());
        Promise.allSettled(transicoes.map((transicao) => transicao.finished)).then(() => {
          if (versao === versaoMenu && menu.open) {
            menu.close();
            sincronizaMenu();
          }
        });
      }
    }
    sincronizaMenu();
  };
  menuBtn.addEventListener("click", (e) => abreMenu(true, e.detail === 0));
  $("[data-menu-fechar]").addEventListener("click", (e) => abreMenu(false, e.detail === 0));
  // Fechar antes de navegar permite a rolagem para o destino fora do modal.
  $$("a", menu).forEach((a) => a.addEventListener("click", () => abreMenu(false, true), { capture: true }));
  menu.addEventListener("cancel", (e) => { e.preventDefault(); abreMenu(false, true); });
  menu.addEventListener("close", () => {
    menu.classList.remove("is-visivel", "is-fechando");
    limpaFotos($(".menu-painel__foto.is-ativa", menu));
    sincronizaMenu();
  });
  menu.addEventListener("keydown", (e) => {
    if (e.key === "Tab") menu.classList.add("sem-transicao");
  });
  menuLinks.forEach((link, i) => {
    link.style.setProperty("--menu-i", i);
    link.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse" && matchMedia("(hover: hover) and (pointer: fine)").matches) mostraPrevia(link);
    });
    link.addEventListener("focus", () => mostraPrevia(link));
  });
  const limpaDestaque = () => {
    if (!menuNav.contains(document.activeElement)) menuNav.classList.remove("has-destaque");
  };
  menuNav.addEventListener("pointerleave", limpaDestaque);
  menuNav.addEventListener("focusout", () => setTimeout(() => {
    if (!menuNav.matches(":hover")) limpaDestaque();
  }, 0));

  /* ---------- Revelação em cascata (ref.: Hofstaetter) ---------- */
  $$(".depo__foto").forEach((el) => el.setAttribute("data-cortina", ""));
  const titulos = reduzMovimento ? [] : $$(".titulo");
  titulos.forEach((t) => { t.removeAttribute("data-reveal"); divide(t, "mascara"); });
  const revelaveis = $$("[data-reveal]");
  revelaveis.forEach((el, i) => el.style.setProperty("--reveal-delay", `${Math.min(i % 4, 3) * 65}ms`));
  // A foto com cortina começa 100% recortada e o observer não a "vê";
  // por isso quem é observado é o pai, e a cortina abre junto.
  const cortinasPorPai = new Map();
  $$("[data-cortina]").forEach((el) => {
    const pai = el.parentElement;
    if (!cortinasPorPai.has(pai)) cortinasPorPai.set(pai, []);
    cortinasPorPai.get(pai).push(el);
  });
  const observaveis = [...new Set([...revelaveis, ...cortinasPorPai.keys(), ...titulos])];
  const revela = (el) => {
    el.classList.add("is-visto");
    (cortinasPorPai.get(el) || []).forEach((c) => c.classList.add("is-visto"));
  };

  if (reduzMovimento || !("IntersectionObserver" in window)) {
    observaveis.forEach(revela);
  } else {
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (e.isIntersecting) { revela(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    observaveis.forEach((el) => io.observe(el));
  }

  /* A galeria e a entrada são preparadas antes do Lenis, em hero.js.
     O encolhimento da hero e o manifesto em órbita ficam em manifesto.js. */

  /* ---------- Menu: seção atual ---------- */
  const navLinks = $$(".menu-painel__nav a");
  if ("IntersectionObserver" in window) {
    const ioNav = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        navLinks.forEach((a) => {
          const atual = a.getAttribute("href") === "#" + e.target.id;
          a.classList.toggle("is-atual", atual);
          if (atual) a.setAttribute("aria-current", "location");
          else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navLinks.map((a) => $(a.getAttribute("href"))).filter(Boolean).forEach((s) => ioNav.observe(s));
  }

  /* ---------- Blocos presos em acordeão: "Do projeto à montagem" e Projetos (protótipo 05, ref.: Bloom) ----------
     Vale para cada [data-pr-pino] da página. No desktop o bloco fica preso; a rolagem enche a linha
     do item aberto e, quando ela completa, abre o seguinte e troca a foto com cortina. O clique leva
     a rolagem até o item.
     No celular (até 900px), foto presa no alto e lista embaixo, com trava (protótipo processo-mobile-3,
     22/10/2026): o item não depende da posição de rolagem, só um gesto passa de um item para o outro.
     Enquanto o bloco está preso, a rolagem fica segurada na âncora do item (foto e lista são sticky, então
     segurar não aparece na tela) e o toque não rola a página. Nas pontas, o gesto de saída libera. Quem
     chega rolando, mesmo com um arremesso, para no primeiro item (vindo de cima) ou no último (de baixo). */
  const prFixa = matchMedia("(min-width: 901px)");
  const rolarImediato = (topo) => {
    ultimoY = topo;
    if (lenis) lenis.scrollTo(topo, { immediate: true, force: true });
    else window.scrollTo({ top: topo, behavior: "instant" });
  };
  // Corta o embalo de um arremesso no toque: overflow hidden no html por um instante para a inércia
  // (no Safari e no Chrome do celular), e o gesto seguinte volta a ser da trava.
  let freando = false;
  const freia = () => {
    if (freando || !matchMedia("(pointer: coarse)").matches) return;
    freando = true;
    doc.style.overflow = "hidden";
    setTimeout(() => { doc.style.removeProperty("overflow"); freando = false; }, 80);
  };

  function iniciaPino(pino) {
    const etapas = $$("[data-pr-etapa]", pino);
    const linhas = etapas.map((el) => $(".pr__linha i", el));
    const fotos = $$("[data-pr-fotos] .pr__foto", pino);
    const legenda = $("[data-pr-legenda]", pino);
    const col = $(".pr__lista-col", pino);
    let atual = 0;
    let camada = 1;

    function abre(i) {
      if (i === atual) return;
      etapas.forEach((el, k) => {
        el.classList.toggle("is-aberta", k === i);
        $(".pr__gatilho", el).setAttribute("aria-expanded", String(k === i));
      });
      // A foto nova sobe por cima; a anterior fica embaixo até a cortina terminar
      const anterior = fotos[atual];
      const nova = fotos[i];
      anterior.classList.remove("is-ativa");
      anterior.classList.add("is-saindo");
      nova.style.zIndex = String(++camada);
      nova.classList.add("is-ativa");
      setTimeout(() => anterior.classList.remove("is-saindo"), reduzMovimento ? 0 : 1100);
      const btn = $(".pr__gatilho", etapas[i]);
      legenda.textContent = `${$(".pr__num", btn).textContent} ${$(".pr__nome", btn).textContent}`;
      atual = i;
    }

    // Progresso dentro do trilho: x vai de 0 a n; a parte inteira é o item, a fração é a linha
    const curso = () => ({
      topo: pino.getBoundingClientRect().top + window.scrollY,
      curso: pino.offsetHeight - innerHeight,
    });
    function anima() {
      if (!prFixa.matches) return;
      const n = etapas.length;
      const { topo, curso: c } = curso();
      const x = clamp((window.scrollY - topo) / c, 0, 1) * n;
      const i = Math.min(n - 1, Math.floor(x));
      const f = i === n - 1 ? clamp(x - i, 0, 1) : x - i;
      abre(i);
      linhas.forEach((l, k) => l.style.setProperty("--f", k < i ? "1" : k === i ? f.toFixed(4) : "0"));
      encaixa();
    }

    // Se o texto do item aberto passa do pé da tela, a coluna sobe só o que falta.
    // Acompanha a abertura do painel quadro a quadro.
    function encaixa() {
      if (!col) return;
      if (!prFixa.matches) { col.style.removeProperty("--sobe"); return; }
      const split = col.parentElement;
      const aberta = etapas[atual];
      // offsetTop ignora o deslocamento; o limite é o pé da tela presa menos a margem de baixo
      let fim = aberta.offsetHeight;
      for (let el = aberta; el && el !== split; el = el.offsetParent) fim += el.offsetTop;
      const limite = split.clientHeight - parseFloat(getComputedStyle(col).paddingBottom);
      col.style.setProperty("--sobe", `${Math.max(0, Math.ceil(fim - limite))}px`);
    }

    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(encaixa);
      etapas.forEach((el) => ro.observe(el));
    }

    /* ---- Celular: foto presa e trava ---- */
    const lista = $("[data-pr-lista]", pino);
    const split = $(".pr__split", pino);
    const titulo = $(".pr__titulo", pino);
    const caixaFotos = $("[data-pr-fotos]", pino);
    const numero = $("[data-pr-n]", pino);
    const progresso = $(".pr__progresso", pino);
    const ultimo = etapas.length - 1;
    const curva = (p) => 1 - Math.pow(1 - p, 4); // saída suave, perto da --ease
    let topos = [];
    let xv = 0;           // posição desenhada da lista, em itens
    let quadro = 0;
    let livre = "";       // "cima" ou "baixo": gesto de saída numa ponta, a página rola só para esse lado
    let antes = window.scrollY;

    const medeTopos = () => { topos = etapas.map((el) => el.offsetTop); };
    // O bloco fica preso de quando a foto chega ao topo até o fim do trilho (::after do .pr__split)
    const limites = () => {
      const base = split.getBoundingClientRect().top + window.scrollY;
      const inicio = base + titulo.offsetTop + titulo.offsetHeight + parseFloat(getComputedStyle(titulo).marginBottom);
      const fim = base + split.offsetHeight - parseFloat(getComputedStyle(split).paddingBottom) - caixaFotos.offsetHeight - lista.offsetHeight;
      return { inicio, fim, passo: (fim - inicio) / ultimo };
    };
    const ancora = (i) => { const { inicio, passo } = limites(); return Math.round(inicio + passo * i); };
    const preso = () => {
      if (prFixa.matches) return false;
      const { inicio, fim } = limites();
      return window.scrollY >= inicio - 2 && window.scrollY <= fim + 2;
    };
    const segura = (y) => { if (Math.abs(window.scrollY - y) > 1) rolarImediato(y); };

    // A lista sobe por trás da foto: o item x fica 16px abaixo da foto
    const desenha = (x) => {
      if (!topos.length) return;
      const c = clamp(x, -.5, ultimo + .5);
      const i = clamp(Math.floor(c), 0, ultimo - 1);
      const y = topos[i] + (topos[i + 1] - topos[i]) * (c - i);
      lista.style.setProperty("--pr-y", `${(16 - y).toFixed(1)}px`);
      xv = x;
    };
    const acende = (i) => {
      abre(i);
      if (numero) numero.textContent = String(i + 1).padStart(2, "0");
      progresso?.style.setProperty("--p", ((i + 1) / etapas.length).toFixed(3));
    };
    const para = () => { cancelAnimationFrame(quadro); quadro = 0; };
    // Só a camada da lista anima (900ms); a rolagem pula direto para a âncora
    const vai = (alvo) => {
      para();
      const de = xv;
      if (reduzMovimento) { desenha(alvo); return; }
      const t0 = performance.now();
      const passo = (t) => {
        const p = Math.min(1, (t - t0) / 900);
        desenha(de + (alvo - de) * curva(p));
        quadro = p < 1 ? requestAnimationFrame(passo) : 0;
      };
      quadro = requestAnimationFrame(passo);
    };
    const ir = (i) => {
      i = clamp(i, 0, ultimo);
      livre = "";
      acende(i);
      segura(ancora(i));
      vai(i);
    };

    // Rolagem: dentro do trilho, segura na âncora do item; ao entrar, começa pelo primeiro ou pelo último
    addEventListener("scroll", () => {
      const y = window.scrollY;
      if (prFixa.matches || performance.now() < navegandoAte) { antes = y; return; }
      const { inicio, fim, passo } = limites();
      const dentro = y >= inicio - 2 && y <= fim + 2;
      if (!dentro) { livre = ""; antes = y; return; }
      if (antes < inicio - 2 && atual !== 0 && !livre) { acende(0); para(); desenha(0); }
      if (antes > fim + 2 && atual !== ultimo && !livre) { acende(ultimo); para(); desenha(ultimo); }
      const a = Math.round(inicio + passo * atual);
      if (!(livre === "cima" && y <= a) && !(livre === "baixo" && y >= a) && Math.abs(y - a) > 1) { segura(a); freia(); }
      antes = window.scrollY;
    }, { passive: true });

    // Toque: um gesto = um item. O dedo dá uma prévia de até 0,3 item; ao soltar, passa ou volta.
    let toque = null;
    split.addEventListener("touchstart", (e) => {
      livre = "";
      toque = e.touches.length === 1 && preso() ? { y: e.touches[0].clientY, dy: 0, dono: null } : null;
    }, { passive: true });
    split.addEventListener("touchmove", (e) => {
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
      desenha(atual + clamp(dy / 500, -.3, .3));
      toque.dy = dy;
    }, { passive: false });
    const solta = () => {
      if (toque?.dono) {
        if (Math.abs(toque.dy) >= 32) ir(atual + Math.sign(toque.dy));
        else vai(atual);
      }
      toque = null;
    };
    split.addEventListener("touchend", solta, { passive: true });
    split.addEventListener("touchcancel", solta, { passive: true });

    // Roda (tablet com mouse ou janela estreita): a mesma trava; pausa de 180ms ou troca de sentido é outro gesto.
    // Na captura, antes do Lenis, como em Ambientes.
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

    const preparaCelular = () => {
      if (prFixa.matches) { para(); lista.style.removeProperty("--pr-y"); return; }
      medeTopos();
      desenha(atual);
      acende(atual);
    };
    addEventListener("resize", preparaCelular);
    prFixa.addEventListener?.("change", preparaCelular);
    document.fonts?.ready.then(preparaCelular);

    // Clique: no desktop leva a rolagem até o começo do item; no celular passa direto para ele
    etapas.forEach((el, i) => {
      $(".pr__gatilho", el).addEventListener("click", () => {
        if (!prFixa.matches) { ir(i); return; }
        const { topo, curso: c } = curso();
        const alvo = topo + (c * (i + 0.04)) / etapas.length;
        if (lenis) lenis.scrollTo(alvo, { duration: 1.4, force: true });
        else window.scrollTo({ top: alvo, behavior: reduzMovimento ? "auto" : "smooth" });
      });
    });

    // Teclado: setas sobem e descem entre os itens
    $("[data-pr-lista]", pino).addEventListener("keydown", (e) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const k = etapas.findIndex((el) => el.contains(document.activeElement));
      if (k < 0) return;
      e.preventDefault();
      const prox = (k + (e.key === "ArrowDown" ? 1 : -1) + etapas.length) % etapas.length;
      $(".pr__gatilho", etapas[prox]).focus();
    });

    // Pré-carrega as fotos para a troca não piscar
    const preparaFotos = () => fotos.forEach((f) => {
      const img = $("img", f); img.loading = "eager"; img.decode?.().catch(() => {});
    });
    if ("IntersectionObserver" in window) {
      const preparo = new IntersectionObserver(([entrada]) => {
        if (!entrada.isIntersecting) return;
        preparaFotos(); preparo.disconnect();
      }, { rootMargin: "100% 0px" });
      preparo.observe(pino);
    } else preparaFotos();
    encaixa();
    preparaCelular();
    return { anima, encaixa, preso };
  }

  const pinos = $$("[data-pr-pino]").map(iniciaPino);
  const animaProcesso = () => pinos.forEach((p) => p.anima());
  const encaixaProcesso = () => pinos.forEach((p) => p.encaixa());
  if (pinos.length) {
    addEventListener("resize", encaixaProcesso);
    prFixa.addEventListener?.("change", () => { encaixaProcesso(); aoRolar(); });
  }

  /* ---------- Ambientes: ficha compacta sobre as fotos (protótipo ambientes-ficha) ---------- */
  const animaComodos = window.iniciaAmbientes?.({
    reduzMovimento,
    rolar: (topo) => {
      ultimoY = topo;
      if (lenis) lenis.scrollTo(topo, { immediate: true, force: true });
      else window.scrollTo({ top: topo, behavior: "instant" });
    },
  }) || (() => {});

  /* ---------- Atalhos para o orçamento ---------- */
  $$("[data-escolher]").forEach((a) => a.addEventListener("click", () => marcaAmbiente(a.dataset.escolher)));
  const ARQUITETO = { "Sou arquiteto(a)": "Sou arquiteto(a) e já tenho o projeto", "Quero que a Nazzan desenvolva": "Ainda não tenho projeto" };
  $$("[data-arquiteto]").forEach((a) =>
    a.addEventListener("click", () => {
      pedido.arquiteto = ARQUITETO[a.dataset.arquiteto] || "";
      atualizaWhats();
    })
  );

  /* ---------- Fixos: WhatsApp flutuante e barra móvel ---------- */
  const waFlutua = $("[data-wa-flutua]");
  const barra = $("[data-barra]");
  const orcamento = $("#orcamento");
  let orcamentoVisivel = false;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { orcamentoVisivel = e.isIntersecting; fixos(window.scrollY); }, { threshold: 0.05 }).observe(orcamento);
  }
  function fixos(y) {
    const metade = (doc.scrollHeight - innerHeight) * 0.4;
    waFlutua.classList.toggle("is-visivel", y > metade && !orcamentoVisivel);
    // Some também enquanto Ambientes ou Acabamentos estão presos no celular, para não cobrir a ficha de vidro
    const galeriaPresa = (window.nazzanTravas || []).some((t) => t.preso());
    barra.classList.toggle("is-visivel", y > hero.offsetHeight * 0.7 && !orcamentoVisivel && !galeriaPresa && !document.body.classList.contains("menu-aberto"));
  }

  /* ---------- Um laço de rolagem para tudo que depende da posição ---------- */
  let agendado = false;
  function aoRolar() {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => {
      agendado = false;
      const y = window.scrollY;
      cabecalho(y);
      // Com um bloco ou uma galeria presa no celular, o cabeçalho sai da frente da foto
      if (pinos.some((p) => p.preso()) || (window.nazzanTravas || []).some((t) => t.preso())) topo.classList.add("is-escondido");
      fixos(y);
      animaProcesso();
      animaComodos();
    });
  }
  addEventListener("scroll", aoRolar, { passive: true });
  addEventListener("resize", aoRolar);
  aoRolar();
})();
