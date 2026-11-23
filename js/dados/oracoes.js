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
      texto: 'Meu Jesus, meu bom Jesus, que por mim morrestes na cruz, perdoai os meus pecados. Já não quero mais pecar. Amém.',
    },
    breve: {
      titulo: 'Meu Deus',
      texto: 'Meu Deus, eu me arrependo de todo o coração de vos ter ofendido, porque sois tão bom e amável. Prometo, com a vossa graça, esforçar-me para ser bom. Meu Jesus, misericórdia!',
    },
  };

  /** Rezada antes do exame, para pedir a luz de conhecer os próprios pecados. */
  C.ORACAO_ESPIRITO_SANTO = {
    titulo: 'Oração ao Espírito Santo',
    texto: 'Vinde, Espírito Santo, enchei os corações dos vossos fiéis e acendei neles o fogo do vosso amor. '
      + 'Enviai o vosso Espírito, e tudo será criado, e renovareis a face da terra. '
      + 'Oremos: Ó Deus, que instruístes os corações dos vossos fiéis com a luz do Espírito Santo, '
      + 'concedei-nos que, no mesmo Espírito, saibamos o que é reto e gozemos sempre da sua consolação. '
      + 'Por Cristo, Senhor nosso. Amém.',
  };

  /** Os passos para uma boa confissão (tela "Como se confessar"), com o parágrafo do Catecismo. */
  C.PASSOS_CONFISSAO = [
    { titulo: 'Exame de consciência', cic: '1454',
      texto: 'Peça a luz do Espírito Santo e lembre com sinceridade os pecados cometidos desde a última confissão bem feita.' },
    { titulo: 'Arrependimento', cic: '1451',
      texto: 'Tenha dor de ter ofendido a Deus. A contrição perfeita nasce do amor a Deus; a imperfeita, do temor do castigo ou da feiura do pecado, e também basta para a confissão (§ 1453).' },
    { titulo: 'Propósito de emenda', cic: '1451',
      texto: 'Decida, com a graça de Deus, não voltar a pecar e fugir das ocasiões de pecado. Não é preciso ter certeza de que nunca mais vai cair: basta querer de verdade mudar.' },
    { titulo: 'Confissão ao padre', cic: '1456',
      texto: 'Diga há quanto tempo foi a última confissão e conte todos os pecados graves, com a espécie e o número de vezes. Os pecados veniais não são obrigatórios, mas é recomendado confessá-los (§ 1458).' },
    { titulo: 'Penitência', cic: '1460',
      texto: 'Reze o ato de contrição quando o padre pedir e cumpra, o quanto antes, a penitência que ele der. Se o pecado causou dano a alguém, como um roubo ou uma calúnia, repare-o na medida do possível (§ 1459).' },
  ];
})(globalThis.Confiteor = globalThis.Confiteor || {});
