/*
 * Atos de contrição oferecidos no resumo. São rezados depois que o padre dá a penitência.
 * A chave é usada pela interface; "titulo" aparece no seletor e "texto" no cartão e no
 * final do texto para a confissão.
 */
(function (C) {
  'use strict';
  C.ATOS = {
    bom: {
      titulo: 'Meu bom Jesus',
      texto: 'Meu Jesus, meu bom Jesus, que por mim morrestes na cruz, perdoa os meus pecados. Já não quero mais pecar. Amém.',
    },
    breve: {
      titulo: 'Meu Deus',
      texto: 'Meu Deus, eu me arrependo de todo o coração de vos ter ofendido, porque sois tão bom e amável. Prometo, com a vossa graça, esforçar-me para ser bom. Meu Jesus, misericórdia!',
    },
  };
})(globalThis.Confiteor = globalThis.Confiteor || {});
