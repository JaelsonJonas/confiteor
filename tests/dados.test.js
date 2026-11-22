const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('./carregar');

const L = C.logica;
const perguntas = L.montarPerguntas(C.SECOES);
const ids = new Set(perguntas.map(p => p.id));

test('o exame tem 10 seções e 103 perguntas', () => {
  assert.equal(C.SECOES.length, 10);
  assert.equal(perguntas.length, 103);
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

test('há uma frase de confissão para cada pecado capital', () => {
  const capitais = perguntas.filter(p => p.capital !== null);
  assert.equal(capitais.length, L.FRASES_CAPITAIS.length);
});

test('as regras de matéria grave e de junção apontam para perguntas que existem', () => {
  for (const id of L.MATERIA_GRAVE) assert.ok(ids.has(id), id);
  for (const j of L.JUNCOES) for (const id of j.ids) assert.ok(ids.has(id), id);
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
