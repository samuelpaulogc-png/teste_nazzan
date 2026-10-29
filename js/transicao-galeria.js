/* Passagem nativa compartilhada: anima as camadas sem rolar o documento a cada quadro. */
(() => {
  "use strict";
  window.nazzanTransicaoGaleria = ({ camadas, preparar, concluir, meio, duracao = 1000 }) => {
    const ler = ({ elemento, propriedade }) => {
      const valor = getComputedStyle(elemento)[propriedade];
      // "none" e inset() precisam da mesma forma para uma interpolacao continua.
      return propriedade === "clipPath" && valor === "none" ? "inset(0% 0% 0% 0%)" : valor;
    };
    const antes = camadas.map(ler);
    preparar();
    const depois = camadas.map(ler);
    const animacoes = [];
    const pendentes = [];
    const criar = (i) => {
      const { elemento, propriedade } = camadas[i];
      const a = elemento.animate(
        [{ [propriedade]: antes[i] }, { [propriedade]: depois[i] }],
        { duration: duracao, easing: "cubic-bezier(.25, 0, .35, 1)", fill: "both" }
      );
      animacoes.push(a);
      return a;
    };
    camadas.forEach(({ elemento, somenteVisivel }, i) => {
      if (antes[i] === depois[i]) return;
      // Barras em visibility:hidden não ganham camada de composição no Chrome.
      // Animá-las mesmo escondidas mantinha o cálculo de estilos ativo a cada quadro.
      if (somenteVisivel && getComputedStyle(elemento).visibility !== "visible") pendentes.push(i);
      else criar(i);
    });
    // O relogio da timeline pode estar no quadro anterior durante uma tarefa longa.
    // Nao atribuir startTime: isso descontava o preparo e pulava o inicio da passagem.
    // Seguramos todas as camadas no quadro zero e deixamos o navegador iniciar juntas.
    animacoes.forEach((a) => { a.pause(); a.currentTime = 0; });
    let encerrada = false;
    let legenda;
    let aposLegenda;
    const partida = requestAnimationFrame(() => {
      if (encerrada) return;
      animacoes.forEach((a) => a.play());
      Promise.all(animacoes.map((a) => a.ready)).then(() => {
        if (!encerrada) legenda = setTimeout(() => {
          if (encerrada) return;
          meio?.();
          // A barra do novo card só anima depois de visível, no mesmo ponto da foto.
          const tempo = animacoes[0]?.currentTime ?? duracao * .35;
          pendentes.forEach((i) => {
            if (getComputedStyle(camadas[i].elemento).visibility !== "visible") return;
            const a = criar(i);
            a.currentTime = tempo;
          });
          aposLegenda = setTimeout(() => {
            animacoes.forEach((a) => {
              const el = a.effect?.target;
              if (el && camadas.some((c) => c.elemento === el && c.somenteVisivel) &&
                  getComputedStyle(el).visibility !== "visible") a.cancel();
            });
          }, 220);
        }, duracao * .35);
      }).catch(() => {});
    });
    const liberar = () => {
      cancelAnimationFrame(partida);
      clearTimeout(legenda);
      clearTimeout(aposLegenda);
      animacoes.forEach((a) => a.cancel());
    };
    Promise.all(animacoes.map((a) => a.finished.catch(() => {}))).then(() => {
      if (encerrada) return;
      encerrada = true;
      concluir();
      liberar();
    }).catch(() => {}); // cancelamento por novo gesto, teclado ou redimensionamento
    return {
      cancelar() {
        if (encerrada) return 1;
        const progresso = animacoes[0]?.effect.getComputedTiming().progress ?? 1;
        const atuais = camadas.map(ler);
        encerrada = true;
        camadas.forEach(({ elemento, propriedade }, i) => { elemento.style[propriedade] = atuais[i]; });
        liberar();
        return progresso;
      }
    };
  };
})();
