/*
 * Regras do exame, sem nenhum acesso ao DOM.
 * Tudo aqui é função pura: recebe os dados e devolve o resultado,
 * por isso pode ser testado com `node --test` (ver tests/).
 *
 * Termos usados:
 *   pergunta   { id, secao, grupo, texto, requisito, capital }
 *   respostas  { [id]: { valor: 'pequei' | 'nao', vezes, obs, esquecido } }
 *   perfil     { estado, filhos, confessou, data, tempo } (as três perguntas iniciais)
 */
(function (C) {
  'use strict';

  /* ---------- Configuração ---------- */

  /** As três perguntas de "Antes de começar". */
  const PERGUNTAS_PERFIL = [
    { campo: 'estado', titulo: 'Estado de vida', opcoes: [['solteiro', 'Solteiro(a)'], ['casado', 'Casado(a)']] },
    { campo: 'filhos', titulo: 'Filhos', opcoes: [[true, 'Tenho filhos'], [false, 'Não tenho']] },
    // pedeDataSe: com essa resposta, a tela pede a data (ou o tempo) da última confissão.
    { campo: 'confessou', titulo: 'Última confissão', opcoes: [['sim', 'Já me confessei'], ['nunca', 'Nunca me confessei']], pedeDataSe: 'sim' },
  ];

  /** Grupos que só valem para parte das pessoas. */
  const REQUISITO_DO_GRUPO = { 'Para os pais': 'filhos', 'Para os casados': 'casado' };

  /** Matéria grave: vai para o topo do texto da confissão (logo após os pecados esquecidos). */
  const MATERIA_GRAVE = new Set([
    '0-0-0', '0-0-3', '0-0-4', '0-0-6', '0-0-7', '0-0-8', '0-0-9', '0-0-11',
    '1-0-0', '1-0-1', '1-0-2', '1-0-3',
    '2-0-0',
    '4-0-0', '4-0-5', '4-0-6', '4-0-7', '4-0-9', '4-0-10',
    '5-0-0', '5-0-3', '5-0-4', '5-1-0', '5-1-1', '5-1-2',
    '6-0-0',
    '7-0-2', '7-0-10',
    '8-0-0', '8-0-1', '8-0-2',
  ]);

  /** Frase do texto da confissão para cada pecado capital, na ordem em que aparecem. */
  const FRASES_CAPITAIS = [
    'Pequei por soberba e orgulho', 'Pequei por avareza', 'Pequei por impureza', 'Pequei por ira',
    'Pequei por gula', 'Pequei por inveja', 'Pequei por preguiça',
  ];

  /** Perguntas que descrevem o mesmo fato: viram uma frase só no texto da confissão. */
  const JUNCOES = [
    { ids: ['8-0-3', '8-0-4'], frase: 'Comi carne numa sexta-feira e não troquei por outra penitência' },
  ];

  const ENCERRAMENTO = 'Por estes e por todos os pecados de que não me lembro, peço perdão.';
  const ANTES_DO_ATO = 'Depois da penitência, o ato de contrição:';

  /* ---------- Utilidades de texto ---------- */

  const minuscula = t => t.charAt(0).toLowerCase() + t.slice(1);
  const semPontoFinal = t => t.replace(/[.\s]+$/, '');

  /** "1" → "1 vez", "4" → "4 vezes"; texto livre ("Várias vezes") fica como foi escrito. */
  function formatarVezes(valor) {
    const t = String(valor || '').trim();
    if (!t) return '';
    if (/^\d+$/.test(t)) return t === '1' ? '1 vez' : `${t} vezes`;
    return minuscula(t);
  }

  /** Máscara dd/mm/aaaa enquanto a pessoa digita: "12092026" → "12/09/2026". */
  function mascararData(valor) {
    const d = String(valor).replace(/\D/g, '').slice(0, 8);
    if (d.length > 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
    if (d.length > 2) return `${d.slice(0, 2)}/${d.slice(2)}`;
    return d;
  }

  /* ---------- Perguntas e perfil ---------- */

  const perfilVazio = () => ({ estado: null, filhos: null, confessou: null, data: '', tempo: '' });

  /** Achata as seções numa lista de perguntas com id "seção-grupo-pergunta". */
  function montarPerguntas(secoes) {
    const perguntas = [];
    secoes.forEach((secao, si) => {
      secao.g.forEach(([grupo, texto], gi) => {
        const lista = Array.isArray(texto) ? texto : texto.split(/(?<=\?)\s+/);
        lista.forEach((q, qi) => perguntas.push({
          id: `${si}-${gi}-${qi}`,
          secao: si,
          grupo,
          texto: q,
          requisito: REQUISITO_DO_GRUPO[grupo] || null,
          capital: secao.k === 'Capitais' ? qi : null,
        }));
      });
    });
    return perguntas;
  }

  function visivel(pergunta, perfil) {
    if (pergunta.requisito === 'filhos') return perfil.filhos === true;
    if (pergunta.requisito === 'casado') return perfil.estado === 'casado';
    return true;
  }

  /** Perguntas de uma seção que valem para este perfil. */
  const perguntasDaSecao = (perguntas, si, perfil) => perguntas.filter(p => p.secao === si && visivel(p, perfil));

  /** Pergunta visível e marcada como "Pequei". */
  function marcada(pergunta, respostas, perfil) {
    return visivel(pergunta, perfil) && respostas[pergunta.id]?.valor === 'pequei';
  }

  /** "Esqueci de confessar na última confissão" só vale para quem já se confessou. */
  const podeTerEsquecido = perfil => perfil.confessou !== 'nunca';

  function esquecida(pergunta, respostas, perfil) {
    return podeTerEsquecido(perfil) && !!respostas[pergunta.id]?.esquecido;
  }

  /** Sequência de telas do formulário para o perfil atual. */
  function montarPassos(secoes, perguntas, perfil) {
    const visiveis = secoes.map((_, si) => perguntasDaSecao(perguntas, si, perfil));
    const partes = visiveis.filter(qs => qs.length).length;
    const passos = [{ tipo: 'boas-vindas' }];
    PERGUNTAS_PERFIL.forEach((def, i) => passos.push({ tipo: 'perfil', def, numero: i + 1, total: PERGUNTAS_PERFIL.length }));
    let parte = 0;
    visiveis.forEach((qs, si) => {
      if (!qs.length) return;
      parte++;
      passos.push({ tipo: 'secao', secao: si, total: qs.length, parte, partes });
      qs.forEach((p, i) => passos.push({ tipo: 'pergunta', pergunta: p, posicao: i, total: qs.length }));
    });
    passos.push({ tipo: 'resumo' });
    return passos;
  }

  /* ---------- Última confissão ---------- */

  /**
   * Data dd/mm/aaaa → tempo aproximado para dizer ao padre ("há 2 meses").
   * Devolve null se a data estiver incompleta, { erro } se for inválida ou futura, ou { texto }.
   */
  function tempoDesde(data, hoje = new Date()) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data || '');
    if (!m) return null;
    const dia = +m[1], mes = +m[2], ano = +m[3];
    const alvo = Date.UTC(ano, mes - 1, dia);
    const conferida = new Date(alvo);
    if (ano < 1900 || conferida.getUTCDate() !== dia || conferida.getUTCMonth() !== mes - 1) return { erro: 'Data inválida.' };

    const dias = Math.round((Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()) - alvo) / 864e5);
    if (dias < 0) return { erro: 'Essa data ainda não chegou.' };
    if (dias === 0) return { texto: 'hoje' };
    if (dias === 1) return { texto: 'ontem' };
    if (dias < 14) return { texto: `há ${dias} dias` };
    if (dias < 45) return { texto: `há ${Math.round(dias / 7)} semanas` };

    const meses = Math.round(dias / 30.4375);
    const anos = Math.floor(meses / 12), resto = meses % 12;
    const partes = [
      anos && (anos === 1 ? '1 ano' : `${anos} anos`),
      resto && (resto === 1 ? '1 mês' : `${resto} meses`),
    ].filter(Boolean);
    return { texto: 'há ' + partes.join(' e ') };
  }

  /** Primeira frase do texto: primeira confissão, tempo pela data, tempo livre ou lacuna "___". */
  function aberturaConfissao(perfil, hoje) {
    if (perfil.confessou === 'nunca') return 'Padre, esta é a minha primeira confissão.';
    const pelaData = tempoDesde(perfil.data, hoje);
    if (pelaData && pelaData.texto) return `Padre, minha última confissão foi ${pelaData.texto}.`;
    const livre = semPontoFinal((perfil.tempo || '').trim().replace(/^há\s+/i, ''));
    return `Padre, minha última confissão foi há ${livre || '___'}.`;
  }

  /* ---------- Resumo ---------- */

  /**
   * Texto para levar à confissão: abertura, uma frase por pecado (esquecidos, matéria grave,
   * demais, pecados capitais), encerramento e o ato de contrição escolhido.
   */
  function gerarTextoConfissao({ perguntas, respostas, perfil, incluirObs = false, ato, hoje }) {
    const marcadas = perguntas.filter(p => marcada(p, respostas, perfil));
    const ids = new Set(marcadas.map(p => p.id));

    const fraseJunta = new Map();
    const omitidas = new Set();
    JUNCOES.forEach(j => {
      if (!j.ids.every(id => ids.has(id))) return;
      fraseJunta.set(j.ids[0], j.frase);
      j.ids.slice(1).forEach(id => omitidas.add(id));
    });

    const prioridade = p => {
      if (esquecida(p, respostas, perfil)) return 0;
      if (p.capital !== null) return 3;
      return MATERIA_GRAVE.has(p.id) ? 1 : 2;
    };

    const frase = p => {
      const r = respostas[p.id];
      let t = fraseJunta.get(p.id) || (p.capital !== null ? FRASES_CAPITAIS[p.capital] : p.texto.replace(/\?$/, ''));
      if (esquecida(p, respostas, perfil)) t = 'Na última confissão, esqueci de confessar que ' + minuscula(t);
      const vezes = formatarVezes(r.vezes);
      if (vezes) t += ', ' + vezes;
      if (incluirObs && r.obs && r.obs.trim()) t += ` (${semPontoFinal(r.obs.trim())})`;
      return semPontoFinal(t) + '.';
    };

    const linhas = marcadas
      .map((p, ordem) => ({ p, ordem, prioridade: prioridade(p) }))
      .filter(({ p }) => !omitidas.has(p.id))
      .sort((a, b) => a.prioridade - b.prioridade || a.ordem - b.ordem)
      .map(({ p }) => frase(p));

    return [aberturaConfissao(perfil, hoje), linhas.join('\n'), ENCERRAMENTO, `${ANTES_DO_ATO}\n${ato}`].join('\n\n');
  }

  /**
   * Itens marcados como "Pequei", agrupados por seção (só seções com algum item).
   * Base comum da tela "Lista por mandamento" e do texto do botão "Copiar lista".
   */
  function marcadasPorSecao({ secoes, perguntas, respostas, perfil }) {
    return secoes
      .map((secao, si) => ({
        secao,
        itens: perguntas
          .filter(p => p.secao === si && marcada(p, respostas, perfil))
          .map(p => ({
            pergunta: p,
            vezes: formatarVezes(respostas[p.id].vezes),
            obs: respostas[p.id].obs || '',
            esquecido: esquecida(p, respostas, perfil),
          })),
      }))
      .filter(g => g.itens.length);
  }

  /** Lista por mandamento, em texto simples (botão "Copiar lista"). */
  function gerarLista(dados) {
    return marcadasPorSecao(dados).map(({ secao, itens }) => secao.t + '\n' + itens.map(i => '• ' + i.pergunta.texto
      + (i.vezes ? ` (${i.vezes})` : '')
      + (i.obs ? ` — ${i.obs}` : '')
      + (i.esquecido ? ' [esquecido na última confissão]' : '')).join('\n')).join('\n\n');
  }

  /** Troca o ato de contrição dentro de um texto já editado, preservando o resto da edição. */
  const trocarAto = (texto, anterior, novo) => texto.split(anterior).join(novo);

  C.logica = {
    MATERIA_GRAVE, FRASES_CAPITAIS, JUNCOES,
    formatarVezes, mascararData, perfilVazio,
    montarPerguntas, visivel, perguntasDaSecao, marcada, podeTerEsquecido, esquecida, montarPassos,
    tempoDesde, aberturaConfissao, gerarTextoConfissao, marcadasPorSecao, gerarLista, trocarAto,
  };
})(globalThis.Confiteor = globalThis.Confiteor || {});
