const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('./carregar');

const L = C.logica;
const perguntas = L.montarPerguntas(C.SECOES, C.CONFISSOES);
const ids = new Set(perguntas.map(p => p.id));

test('o exame tem 10 seções e 128 perguntas', () => {
  assert.equal(C.SECOES.length, 10);
  assert.equal(perguntas.length, 128);
});

test('ids de perguntas são únicos', () => {
  assert.equal(ids.size, perguntas.length);
});

test('toda pergunta tem exemplos, e não há exemplos sem pergunta', () => {
  const semExemplo = perguntas.filter(p => !C.EXEMPLOS[p.id]).map(p => p.id);
  const orfaos = Object.keys(C.EXEMPLOS).filter(id => !ids.has(id));
  assert.deepEqual(semExemplo, []);
  assert.deepEqual(orfaos, []);
});

test('cada pergunta tem de 1 a 4 exemplos em texto, com pelo menos um exemplo que não é observação', () => {
  for (const [id, lista] of Object.entries(C.EXEMPLOS)) {
    assert.ok(Array.isArray(lista) && lista.length >= 1 && lista.length <= 4, id);
    assert.ok(lista.every(t => typeof t === 'string' && t.trim().length > 0), id);
    assert.ok(lista.some(t => !t.startsWith('Obs.:')), id);
  }
});

test('perguntas dos mandamentos terminam com "?" e começam com maiúscula', () => {
  for (const p of perguntas.filter(q => q.capital === null)) {
    assert.match(p.texto, /\?$/, p.id);
    assert.match(p.texto, /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/, p.id);
  }
});

test('grupos condicionais existem: "Para os pais" (filhos) e "Para os casados" (casado)', () => {
  assert.ok(perguntas.some(p => p.requisito === 'filhos'));
  assert.ok(perguntas.some(p => p.requisito === 'casado'));
});

test('atos de contrição têm título e texto', () => {
  for (const [chave, ato] of Object.entries(C.ATOS)) {
    assert.ok(ato.titulo && ato.texto, chave);
  }
  assert.ok(C.ATOS.bom, 'o ato padrão ("bom") existe');
});

test('"Como se confessar": oração ao Espírito Santo e cinco passos com o Catecismo', () => {
  assert.ok(C.ORACAO_ESPIRITO_SANTO.titulo && C.ORACAO_ESPIRITO_SANTO.texto.endsWith('Amém.'));
  assert.deepEqual(C.PASSOS_CONFISSAO.map(p => p.titulo),
    ['Exame de consciência', 'Arrependimento', 'Propósito de emenda', 'Confissão ao padre', 'Penitência']);
  for (const p of C.PASSOS_CONFISSAO) {
    assert.ok(p.texto.trim(), p.titulo);
    assert.match(p.cic, /^\d{1,4}$/, p.titulo);
  }
});

test('toda pergunta tem frase de confissão "Pequei por…", sem pontuação final', () => {
  const semFrase = perguntas.filter(p => !p.confissao).map(p => p.id);
  const orfas = Object.keys(C.CONFISSOES).filter(id => !ids.has(id));
  assert.deepEqual(semFrase, []);
  assert.deepEqual(orfas, []);
  for (const p of perguntas) {
    assert.match(p.confissao, /^Pequei por [a-záéíóúâêôãõç]/, p.id);
    assert.doesNotMatch(p.confissao, /[.?;:]$/, p.id);
  }
});

test('as junções apontam para perguntas que existem e usam "Pequei por"', () => {
  for (const j of L.JUNCOES) {
    for (const id of j.ids) assert.ok(ids.has(id), id);
    assert.match(j.frase, /^Pequei por /);
  }
});

test('matéria grave e Catecismo apontam para perguntas que existem', () => {
  assert.ok(C.MATERIA_GRAVE.length > 0);
  for (const id of C.MATERIA_GRAVE) assert.ok(ids.has(id), id);
  assert.equal(new Set(C.MATERIA_GRAVE).size, C.MATERIA_GRAVE.length);
  for (const [id, n] of Object.entries(C.CATECISMO)) {
    assert.ok(ids.has(id), id);
    assert.match(n, /^\d{1,4}$/, id); // parágrafos do CIC vão de 1 a 2865
    assert.ok(+n >= 1 && +n <= 2865, id);
  }
});

test('ids da versão anterior levam a perguntas que existem, sem repetir destino', () => {
  const destinos = Object.values(C.IDS_ANTERIORES);
  assert.equal(destinos.length, 103);
  assert.equal(new Set(destinos).size, destinos.length);
  for (const id of destinos) assert.ok(ids.has(id), id);
  // exemplos: "Deixei de rezar por muito tempo?" e a formação religiosa, que foi do 5º para o 1º
  const texto = antigo => perguntas.find(p => p.id === C.IDS_ANTERIORES[antigo]).texto;
  assert.equal(texto('0-0-10'), 'Deixei de rezar por muito tempo?');
  assert.match(texto('4-0-14'), /^Descuidei da minha formação religiosa/);
  assert.equal(perguntas.find(p => p.id === C.IDS_ANTERIORES['4-0-14']).secao, 0);
});
