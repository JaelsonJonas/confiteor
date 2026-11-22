const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('./carregar');

const L = C.logica;
const perguntas = L.montarPerguntas(C.SECOES);
const HOJE = new Date(2026, 10, 22); // 22/11/2026
const ATO = C.ATOS.bom.texto;

const perfil = extra => ({ ...L.perfilVazio(), estado: 'solteiro', filhos: false, confessou: 'sim', ...extra });
const pequei = extra => ({ valor: 'pequei', ...extra });
const gerar = (respostas, p = perfil(), opcoes = {}) =>
  L.gerarTextoConfissao({ perguntas, respostas, perfil: p, ato: ATO, hoje: HOJE, ...opcoes });
const linhas = texto => texto.split('\n\n')[1].split('\n');

/* ---------- formatarVezes ---------- */

test('formatarVezes: números e texto livre', () => {
  assert.equal(L.formatarVezes(''), '');
  assert.equal(L.formatarVezes(undefined), '');
  assert.equal(L.formatarVezes('1'), '1 vez');
  assert.equal(L.formatarVezes(' 4 '), '4 vezes');
  assert.equal(L.formatarVezes('Várias vezes'), 'várias vezes');
  assert.equal(L.formatarVezes('muitas'), 'muitas');
});

/* ---------- mascararData ---------- */

test('mascararData: insere as barras enquanto digita', () => {
  assert.equal(L.mascararData('1'), '1');
  assert.equal(L.mascararData('120'), '12/0');
  assert.equal(L.mascararData('12092'), '12/09/2');
  assert.equal(L.mascararData('12092026'), '12/09/2026');
  assert.equal(L.mascararData('12/09/2026999'), '12/09/2026');
  assert.equal(L.mascararData('ab12cd'), '12');
});

/* ---------- tempoDesde ---------- */

test('tempoDesde: tempo aproximado a partir da data', () => {
  const t = d => L.tempoDesde(d, HOJE);
  assert.deepEqual(t('22/11/2026'), { texto: 'hoje' });
  assert.deepEqual(t('21/11/2026'), { texto: 'ontem' });
  assert.deepEqual(t('15/11/2026'), { texto: 'há 7 dias' });
  assert.deepEqual(t('01/11/2026'), { texto: 'há 3 semanas' });
  assert.deepEqual(t('12/09/2026'), { texto: 'há 2 meses' });
  assert.deepEqual(t('22/11/2025'), { texto: 'há 1 ano' });
  assert.deepEqual(t('10/08/2025'), { texto: 'há 1 ano e 3 meses' });
  assert.deepEqual(t('01/01/2020'), { texto: 'há 6 anos e 11 meses' });
});

test('tempoDesde: a partir de 45 dias fala em meses, não em semanas', () => {
  assert.deepEqual(L.tempoDesde('09/10/2026', HOJE), { texto: 'há 6 semanas' }); // 44 dias
  assert.deepEqual(L.tempoDesde('08/10/2026', HOJE), { texto: 'há 1 mês' });     // 45 dias
});

test('tempoDesde: data incompleta, inválida ou futura', () => {
  assert.equal(L.tempoDesde('', HOJE), null);
  assert.equal(L.tempoDesde('12/9/2026', HOJE), null);
  assert.deepEqual(L.tempoDesde('31/02/2026', HOJE), { erro: 'Data inválida.' });
  assert.deepEqual(L.tempoDesde('01/01/1800', HOJE), { erro: 'Data inválida.' });
  assert.deepEqual(L.tempoDesde('01/12/2026', HOJE), { erro: 'Essa data ainda não chegou.' });
});

/* ---------- abertura ---------- */

test('aberturaConfissao: primeira confissão, data, tempo livre e lacuna', () => {
  assert.equal(L.aberturaConfissao(perfil({ confessou: 'nunca' }), HOJE), 'Padre, esta é a minha primeira confissão.');
  assert.equal(L.aberturaConfissao(perfil({ data: '12/09/2026' }), HOJE), 'Padre, minha última confissão foi há 2 meses.');
  assert.equal(L.aberturaConfissao(perfil({ data: '22/11/2026' }), HOJE), 'Padre, minha última confissão foi hoje.');
  assert.equal(L.aberturaConfissao(perfil({ tempo: 'há 3 meses.' }), HOJE), 'Padre, minha última confissão foi há 3 meses.');
  assert.equal(L.aberturaConfissao(perfil(), HOJE), 'Padre, minha última confissão foi há ___.');
  // data inválida cai no tempo livre
  assert.equal(L.aberturaConfissao(perfil({ data: '31/02/2026', tempo: '1 ano' }), HOJE), 'Padre, minha última confissão foi há 1 ano.');
});

/* ---------- texto da confissão ---------- */

test('texto da confissão: estrutura completa', () => {
  const texto = gerar({ '0-0-10': pequei({ vezes: '3' }) }, perfil({ data: '12/09/2026' }));
  assert.equal(texto, [
    'Padre, minha última confissão foi há 2 meses.',
    'Deixei de rezar por muito tempo, 3 vezes.',
    'Por estes e por todos os pecados de que não me lembro, peço perdão.',
    `Depois da penitência, o ato de contrição:\n${ATO}`,
  ].join('\n\n'));
});

test('texto da confissão: ordem esquecidos > matéria grave > demais > capitais', () => {
  const texto = gerar({
    '9-0-6': pequei({ vezes: '2' }),          // capital: preguiça
    '0-0-10': pequei(),                       // comum
    '5-0-3': pequei({ vezes: 'várias vezes' }), // matéria grave
    '4-0-9': pequei({ vezes: '1', esquecido: true }), // esquecido
  });
  assert.deepEqual(linhas(texto), [
    'Numa confissão anterior, esqueci de confessar que usei, entreguei, recomendei a "pílula do dia seguinte", 1 vez.',
    'Li e olhei sites, livros ou revistas, estampas, filmes, séries, vídeos ou fotografias obscenas e imorais, várias vezes.',
    'Deixei de rezar por muito tempo.',
    'Pequei por preguiça, 2 vezes.',
  ]);
});

test('texto da confissão: as duas perguntas da carne na sexta viram uma frase só', () => {
  const ambas = gerar({ '8-0-3': pequei({ vezes: '1' }), '8-0-4': pequei({ vezes: '1' }) });
  assert.deepEqual(linhas(ambas), ['Comi carne numa sexta-feira e não troquei por outra penitência, 1 vez.']);
  const so = gerar({ '8-0-3': pequei() });
  assert.deepEqual(linhas(so), ['Não guardei abstinência de carne nas sextas-feiras do ano.']);
});

test('texto da confissão: "esquecido" é ignorado na primeira confissão', () => {
  const texto = gerar({ '4-0-9': pequei({ esquecido: true }) }, perfil({ confessou: 'nunca' }));
  assert.ok(texto.startsWith('Padre, esta é a minha primeira confissão.'));
  assert.deepEqual(linhas(texto), ['Usei, entreguei, recomendei a "pílula do dia seguinte".']);
});

test('texto da confissão: observações só entram quando pedidas', () => {
  const respostas = { '7-0-0': pequei({ vezes: '2', obs: 'no trabalho.' }) };
  assert.deepEqual(linhas(gerar(respostas)), ['Menti, 2 vezes.']);
  assert.deepEqual(linhas(gerar(respostas, perfil(), { incluirObs: true })), ['Menti, 2 vezes (no trabalho).']);
});

test('texto da confissão: respostas "Não" e perguntas ocultas pelo perfil não entram', () => {
  const respostas = {
    '0-0-10': { valor: 'nao' },
    '3-1-0': pequei(),   // "Para os pais": oculto para quem não tem filhos
    '5-1-0': pequei(),   // "Para os casados": oculto para solteiro
    '7-0-0': pequei(),
  };
  assert.deepEqual(linhas(gerar(respostas)), ['Menti.']);
  const casadoComFilhos = gerar(respostas, perfil({ estado: 'casado', filhos: true }));
  assert.equal(linhas(casadoComFilhos).length, 3);
});

/* ---------- lista ---------- */

test('lista por mandamento: formato do texto copiado', () => {
  const lista = L.gerarLista({
    secoes: C.SECOES, perguntas, perfil: perfil(),
    respostas: {
      '0-0-10': pequei({ vezes: '4' }),
      '1-0-5': pequei({ vezes: 'Muitas vezes', obs: 'por hábito' }),
      '4-0-9': pequei({ esquecido: true }),
    },
  });
  assert.equal(lista, [
    '1º mandamento',
    '• Deixei de rezar por muito tempo? (4 vezes)',
    '',
    '2º mandamento',
    '• Pronunciei levianamente o nome de Deus? (muitas vezes) — por hábito',
    '',
    '5º mandamento',
    '• Usei, entreguei, recomendei a "pílula do dia seguinte"? [esquecido em confissão anterior]',
  ].join('\n'));
});

/* ---------- passos ---------- */

test('passos: telas de acordo com o perfil', () => {
  const contar = p => L.montarPassos(C.SECOES, perguntas, p).filter(x => x.tipo === 'pergunta').length;
  assert.equal(contar(perfil()), 103 - 7 - 3);                                  // sem "Para os pais" (7) e "Para os casados" (3)
  assert.equal(contar(perfil({ estado: 'casado', filhos: true })), 103);
  const passos = L.montarPassos(C.SECOES, perguntas, perfil());
  assert.deepEqual(passos.slice(0, 4).map(p => p.tipo), ['boas-vindas', 'perfil', 'perfil', 'perfil']);
  assert.equal(passos.at(-1).tipo, 'resumo');
  assert.equal(passos.find(p => p.tipo === 'secao').partes, 10);
});

/* ---------- utilidades usadas pela interface ---------- */

test('trocarAto: troca só a oração e mantém a edição', () => {
  const editado = gerar({ '7-0-0': pequei() }).replace('Menti.', 'Menti muitas vezes.');
  const trocado = L.trocarAto(editado, ATO, C.ATOS.breve.texto);
  assert.ok(trocado.includes('Menti muitas vezes.'));
  assert.ok(trocado.endsWith(C.ATOS.breve.texto));
  assert.ok(!trocado.includes(ATO));
});

test('marcadasPorSecao: agrupa só seções com itens marcados', () => {
  const grupos = L.marcadasPorSecao({
    secoes: C.SECOES, perguntas, perfil: perfil({ confessou: 'nunca' }),
    respostas: { '7-0-0': pequei({ vezes: '2', obs: 'x', esquecido: true }), '0-0-1': { valor: 'nao' } },
  });
  assert.equal(grupos.length, 1);
  assert.equal(grupos[0].secao.t, '8º mandamento');
  assert.deepEqual(
    grupos[0].itens.map(i => [i.pergunta.id, i.vezes, i.obs, i.esquecido]),
    [['7-0-0', '2 vezes', 'x', false]], // "esquecido" não vale na primeira confissão
  );
});

test('texto da confissão: a junção da carne na sexta combina os detalhes das duas perguntas', () => {
  const texto = gerar({
    '8-0-3': pequei({ obs: 'em casa' }),
    '8-0-4': pequei({ vezes: '3', obs: 'esqueci da penitência', esquecido: true }),
    '7-0-0': pequei(),
  }, perfil(), { incluirObs: true });
  assert.deepEqual(linhas(texto), [
    'Numa confissão anterior, esqueci de confessar que comi carne numa sexta-feira e não troquei por outra penitência, 3 vezes (em casa; esqueci da penitência).',
    'Menti.',
  ]);
});

/* ---------- extenso e datas ---------- */

test('porExtenso e vezesPorExtenso', () => {
  assert.equal(L.porExtenso(2), 'dois');
  assert.equal(L.porExtenso(2, true), 'duas');
  assert.equal(L.porExtenso(21, true), 'vinte e uma');
  assert.equal(L.porExtenso(100), 'cem');
  assert.equal(L.porExtenso(115), 'cento e quinze');
  assert.equal(L.porExtenso(202, true), 'duzentas e duas');
  assert.equal(L.porExtenso(1000), '1000');
  assert.equal(L.vezesPorExtenso('1'), 'uma vez');
  assert.equal(L.vezesPorExtenso('2'), 'duas vezes');
  assert.equal(L.vezesPorExtenso(' 12 '), 'doze vezes');
  assert.equal(L.vezesPorExtenso('Várias vezes'), 'Várias vezes'); // texto fica como foi escrito
  assert.equal(L.vezesPorExtenso('3x'), '3x');
  assert.equal(L.vezesPorExtenso(''), '');
});

test('datas: por extenso, ISO e brasileira', () => {
  assert.equal(L.dataPorExtenso(HOJE), 'Domingo, 22 de novembro de 2026');
  assert.equal(L.dataPorExtenso(new Date(2026, 2, 4)), 'Quarta-feira, 4 de março de 2026');
  assert.equal(L.dataISO(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(L.isoParaBR('2026-11-22'), '22/11/2026');
  assert.equal(L.nomeDoPdf(HOJE), 'exame-de-consciencia-2026-11-22.pdf');
});

test('tempoDesde por extenso (PDF)', () => {
  const t = d => L.tempoDesde(d, HOJE, { extenso: true }).texto;
  assert.equal(t('12/09/2026'), 'há dois meses');
  assert.equal(t('15/11/2026'), 'há sete dias');
  assert.equal(t('01/11/2026'), 'há três semanas');
  assert.equal(t('08/10/2026'), 'há um mês');
  assert.equal(t('10/08/2025'), 'há um ano e três meses');
  assert.equal(t('22/11/2026'), 'hoje');
});

/* ---------- PDF ---------- */

test('títulos de grupo do PDF', () => {
  const t = k => L.tituloContra(C.SECOES.find(s => s.k === k));
  assert.equal(t('1º'), 'Contra o 1º mandamento');
  assert.equal(t('6º e 9º'), 'Contra o 6º e o 9º mandamentos');
  assert.equal(t('Igreja'), 'Contra os mandamentos da Igreja');
  assert.equal(t('Capitais'), 'Pecados capitais');
});

test('documento do PDF: conteúdo, ordem e "Por último"', () => {
  const html = L.gerarDocumentoPdf({
    secoes: C.SECOES, perguntas, perfil: perfil({ data: '12/09/2026' }), ato: ATO, hoje: HOJE,
    respostas: {
      '0-0-10': pequei({ vezes: '2', obs: 'por preguiça <de manhã>' }),
      '1-0-5': pequei({ vezes: 'Muitas vezes' }),
      '4-0-9': pequei({ vezes: '1', esquecido: true }),
    },
  });
  const textoPuro = html.replace(/<head>[\s\S]*?<\/head>/, '').replace(/<[^>]+>/g, '\n').split('\n').filter(Boolean);
  assert.deepEqual(textoPuro, [
    'Exame de Consciência',
    'Domingo, 22 de novembro de 2026',
    'Padre, minha última confissão foi há dois meses.',
    'Contra o 1º mandamento',
    'Deixei de rezar por muito tempo, duas vezes.',
    '(por preguiça &lt;de manhã&gt;)',
    'Contra o 2º mandamento',
    'Pronunciei levianamente o nome de Deus, Muitas vezes.',
    'Por último',
    'Pecados que esqueci de confessar em confissão anterior:',
    'Usei, entreguei, recomendei a &quot;pílula do dia seguinte&quot;, uma vez.',
    'Por estes e por todos os pecados de que não me lembro, peço perdão.',
    ATO,
  ]);
  assert.match(html, /#5a2d82/);
  assert.match(html, /Liberation Serif/);
  assert.match(html, /size: A4/);
});

test('documento do PDF: sem registro de confissão, deixa a lacuna', () => {
  const html = L.gerarDocumentoPdf({ secoes: C.SECOES, perguntas, perfil: perfil(), ato: ATO, hoje: HOJE, respostas: { '7-0-0': pequei() } });
  assert.ok(html.includes('Padre, minha última confissão foi há ___.'));
});

/* ---------- exame salvo ---------- */

test('restaurarExame: aceita só campos conhecidos e ids existentes', () => {
  const r = L.restaurarExame({
    respostas: {
      '0-0-10': { valor: 'pequei', vezes: '2', obs: 'nota', esquecido: true, extra: 'x' },
      '1-0-5': { valor: 'nao' },
      '99-0-0': { valor: 'pequei' },
      '7-0-0': { valor: 'talvez' },
    },
    perfil: { estado: 'casado', filhos: true, confessou: 'sim', data: '12/09/2026', tempo: '', invasor: 1 },
    ato: 'breve', pdf: '/home/x/exame.pdf',
  }, perguntas, C.ATOS);
  assert.deepEqual(r.respostas, {
    '0-0-10': { valor: 'pequei', vezes: '2', obs: 'nota', esquecido: true },
    '1-0-5': { valor: 'nao', vezes: '', obs: '', esquecido: false },
  });
  assert.deepEqual(r.perfil, { estado: 'casado', filhos: true, confessou: 'sim', data: '12/09/2026', tempo: '' });
  assert.equal(r.ato, 'breve');
  assert.equal(r.pdf, '/home/x/exame.pdf');
  assert.equal(L.restaurarExame(null, perguntas, C.ATOS), null);
  assert.equal(L.restaurarExame({ respostas: 'x' }, perguntas, C.ATOS), null);
  assert.equal(L.restaurarExame({ respostas: {}, ato: 'toString' }, perguntas, C.ATOS).ato, 'bom');
});
