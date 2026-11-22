const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('./carregar');

const L = C.logica;
const perguntas = L.montarPerguntas(C.SECOES, C.CONFISSOES);
const HOJE = new Date(2026, 10, 22); // 22/11/2026
const ATO = C.ATOS.bom.texto;

const perfil = extra => ({ ...L.perfilVazio(), estado: 'solteiro', filhos: false, confessou: 'sim', ...extra });
const pequei = extra => ({ valor: 'pequei', ...extra });
const gerar = (respostas, p = perfil(), opcoes = {}) =>
  L.gerarTextoConfissao({ secoes: C.SECOES, perguntas, respostas, perfil: p, ato: ATO, hoje: HOJE, ...opcoes });
// blocos do texto entre a abertura e o encerramento
const corpo = texto => texto.split('\n\n').slice(1, -2);
const textoPdf = html => html.replace(/<head>[\s\S]*?<\/head>/, '').replace(/<[^>]+>/g, '\n').split('\n').filter(Boolean);

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

/* ---------- extenso e datas ---------- */

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

/* ---------- histórico de confissões ---------- */

test('formatarDuracao', () => {
  assert.equal(L.formatarDuracao(1), '1 dia');
  assert.equal(L.formatarDuracao(5), '5 dias');
  assert.equal(L.formatarDuracao(21), '3 semanas');
  assert.equal(L.formatarDuracao(71), '2 meses');
  assert.equal(L.formatarDuracao(469), '1 ano e 3 meses');
  assert.equal(L.formatarDuracao(71, { extenso: true }), 'dois meses');
});

test('resumoConfissoes: lista, intervalos, ano e média', () => {
  const r = L.resumoConfissoes(['2026-09-12', '2025-11-30', '2026-11-22', '2026-11-22'], HOJE);
  assert.equal(r.total, 3);
  assert.equal(r.noAno, 2);
  assert.equal(r.media, '6 meses'); // 357 dias / 2 intervalos
  assert.deepEqual(r.itens, [
    { iso: '2026-11-22', extenso: 'Domingo, 22 de novembro de 2026', desde: 'hoje', intervalo: '2 meses' },
    { iso: '2026-09-12', extenso: 'Sábado, 12 de setembro de 2026', desde: 'há 2 meses', intervalo: '9 meses' },
    { iso: '2025-11-30', extenso: 'Domingo, 30 de novembro de 2025', desde: 'há 1 ano', intervalo: '' },
  ]);
});

test('resumoConfissoes: vazio e uma só', () => {
  assert.deepEqual(L.resumoConfissoes([], HOJE), { total: 0, noAno: 0, media: '', itens: [] });
  const uma = L.resumoConfissoes(['2026-11-15'], HOJE);
  assert.equal(uma.media, '');
  assert.equal(uma.itens[0].desde, 'há 7 dias');
});

/* ---------- formato "Pequei por…" ---------- */

test('quantidade: por extenso no feminino, "mais de dez" e "várias"', () => {
  assert.equal(L.vezesPorExtenso('1'), 'uma vez');
  assert.equal(L.vezesPorExtenso('2'), 'duas vezes');
  assert.equal(L.vezesPorExtenso('4'), 'quatro vezes');
  assert.equal(L.vezesPorExtenso('15'), 'quinze vezes');
  assert.equal(L.vezesPorExtenso(L.MAIS_DE_DEZ), 'mais de dez vezes');
  assert.equal(L.vezesPorExtenso(L.VARIAS), '');
  assert.equal(L.vezesPorExtenso('0'), '');
  assert.equal(L.fraseComQuantidade('Pequei por mentir', '2'), 'Pequei por mentir, duas vezes.');
  assert.equal(L.fraseComQuantidade('Pequei por mentir', L.MAIS_DE_DEZ), 'Pequei por mentir, mais de dez vezes.');
  assert.equal(L.fraseComQuantidade('Pequei por mentir', L.VARIAS), 'Pequei por mentir. Não sei dizer quantas vezes, mas foram várias.');
  assert.equal(L.fraseComQuantidade('Pequei por mentir', ''), 'Pequei por mentir.');
  assert.equal(L.formatarVezes(L.MAIS_DE_DEZ), 'mais de dez vezes');
  assert.equal(L.formatarVezes(L.VARIAS), 'várias vezes');
  assert.ok(!/x\b/.test(L.fraseComQuantidade('Pequei por mentir', '3')));
});

test('normalizarVezes: aceita número, "mais de dez" e "várias"; texto antigo vira "várias"', () => {
  assert.equal(L.normalizarVezes('4'), '4');
  assert.equal(L.normalizarVezes(L.MAIS_DE_DEZ), L.MAIS_DE_DEZ);
  assert.equal(L.normalizarVezes(L.VARIAS), L.VARIAS);
  assert.equal(L.normalizarVezes('Várias vezes'), L.VARIAS);
  assert.equal(L.normalizarVezes(''), '');
  assert.equal(L.normalizarVezes(undefined), '');
});

test('texto do Resumo: mesma estrutura do PDF, por mandamento', () => {
  const texto = gerar({
    '0-0-10': pequei({ vezes: '4', obs: 'o terço diário' }),
    '4-0-14': pequei(),
    '7-0-0': pequei({ vezes: L.VARIAS }),
  }, perfil({ data: '12/09/2026' }));
  assert.equal(texto, [
    'Padre, minha última confissão foi há 2 meses.',
    'Contra o 1º mandamento\nPequei por deixar de rezar por muito tempo, quatro vezes.',
    'Contra o 5º mandamento\nPequei por descuidar da minha formação religiosa e moral e da formação das pessoas que moram comigo ou dependem de mim.',
    'Contra o 8º mandamento\nPequei por mentir. Não sei dizer quantas vezes, mas foram várias.',
    'Por estes e por todos os pecados de que não me lembro, peço perdão.',
    `Depois da penitência, o ato de contrição:\n${ATO}`,
  ].join('\n\n'));
});

test('texto do Resumo: observações só quando pedidas, na linha de baixo', () => {
  const respostas = { '0-0-10': pequei({ vezes: '4', obs: 'o terço diário.' }) };
  assert.deepEqual(corpo(gerar(respostas)), ['Contra o 1º mandamento\nPequei por deixar de rezar por muito tempo, quatro vezes.']);
  assert.deepEqual(corpo(gerar(respostas, perfil(), { incluirObs: true })),
    ['Contra o 1º mandamento\nPequei por deixar de rezar por muito tempo, quatro vezes.\n(o terço diário)']);
});

test('"Por último": um item esquecido vira uma frase com o mandamento e "pequei" minúsculo', () => {
  const texto = gerar({ '4-0-9': pequei({ vezes: '2', esquecido: true }), '7-0-0': pequei() });
  assert.deepEqual(corpo(texto), [
    'Contra o 8º mandamento\nPequei por mentir.',
    'Por último, lembrei de um pecado contra o 5º mandamento que esqueci de confessar em confissões anteriores: pequei por usar, entregar ou recomendar a pílula do dia seguinte, duas vezes.',
  ]);
  const capital = gerar({ '9-0-6': pequei({ esquecido: true }) });
  assert.deepEqual(corpo(capital), ['Por último, lembrei de um pecado capital que esqueci de confessar em confissões anteriores: pequei por preguiça.']);
});

test('"Por último": vários itens esquecidos', () => {
  const texto = gerar({
    '5-0-2': pequei({ vezes: L.VARIAS, esquecido: true }),
    '7-0-5': pequei({ vezes: '1', esquecido: true }),
    '9-0-1': pequei({ esquecido: true }),
  });
  assert.deepEqual(corpo(texto), [[
    'Por último, lembrei de alguns pecados que esqueci de confessar em confissões anteriores:',
    'contra o 6º e o 9º mandamentos, pequei por ter conversas impuras. Não sei dizer quantas vezes, mas foram várias.',
    'contra o 8º mandamento, pequei por fazer juízos temerários, uma vez.',
    'pequei por avareza.',
  ].join('\n')]);
});

test('"esquecido" é ignorado na primeira confissão; "Não" e perguntas ocultas não entram', () => {
  const texto = gerar({
    '4-0-9': pequei({ esquecido: true }), '0-0-10': { valor: 'nao' },
    '3-1-0': pequei(), '5-1-0': pequei(), // ocultas para solteiro sem filhos
  }, perfil({ confessou: 'nunca' }));
  assert.ok(texto.startsWith('Padre, esta é a minha primeira confissão.'));
  assert.deepEqual(corpo(texto), ['Contra o 5º mandamento\nPequei por usar, entregar ou recomendar a pílula do dia seguinte.']);
});

test('junção da carne na sexta: frase única com os detalhes das duas perguntas', () => {
  const texto = gerar({
    '8-0-3': pequei({ obs: 'em casa' }),
    '8-0-4': pequei({ vezes: '1', obs: 'de madrugada' }),
  }, perfil(), { incluirObs: true });
  assert.deepEqual(corpo(texto), ['Contra os mandamentos da Igreja\nPequei por comer carne numa sexta-feira sem substituí-la por outra penitência, uma vez.\n(em casa; de madrugada)']);
});

test('trocarAto: troca só a oração e mantém a edição', () => {
  const editado = gerar({ '7-0-0': pequei() }).replace('Pequei por mentir.', 'Pequei por mentir muitas vezes.');
  const trocado = L.trocarAto(editado, ATO, C.ATOS.breve.texto);
  assert.ok(trocado.includes('Pequei por mentir muitas vezes.'));
  assert.ok(trocado.endsWith(C.ATOS.breve.texto));
});

test('documento do PDF: "Pequei por…", quantidade, observação e "Por último"', () => {
  const html = L.gerarDocumentoPdf({
    secoes: C.SECOES, perguntas, perfil: perfil({ data: '12/09/2026' }), ato: ATO, hoje: HOJE,
    respostas: {
      '0-0-10': pequei({ vezes: '4', obs: 'o terço diário <manhã>' }),
      '4-0-9': pequei({ vezes: '2', esquecido: true, obs: 'só lembrei agora' }),
    },
  });
  assert.deepEqual(textoPdf(html), [
    'Exame de Consciência',
    'Domingo, 22 de novembro de 2026',
    'Padre, minha última confissão foi há dois meses.',
    'Contra o 1º mandamento',
    'Pequei por deixar de rezar por muito tempo, quatro vezes.',
    '(o terço diário &lt;manhã&gt;)',
    'Por último, lembrei de um pecado contra o 5º mandamento que esqueci de confessar em confissões anteriores: pequei por usar, entregar ou recomendar a pílula do dia seguinte, duas vezes.',
    '(só lembrei agora)',
    'Por estes e por todos os pecados de que não me lembro, peço perdão.',
    ATO,
  ]);
  assert.match(html, /#5a2d82/);
  assert.match(html, /size: A4/);
});
