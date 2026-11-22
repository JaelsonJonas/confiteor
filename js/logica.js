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

  /* ---------- Números e datas por extenso ---------- */

  const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const DEZ_A_DEZENOVE = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  /** 1 a 999 por extenso ("duas", "vinte e um"); fora disso, o próprio número. */
  function porExtenso(n, feminino = false) {
    if (!Number.isInteger(n) || n < 1 || n > 999) return String(n);
    if (n === 100) return 'cem';
    const c = Math.floor(n / 100), d = Math.floor((n % 100) / 10), u = n % 10;
    const partes = [];
    if (c) partes.push(feminino && c > 1 ? CENTENAS[c].replace(/os$/, 'as') : CENTENAS[c]);
    if (d === 1) partes.push(DEZ_A_DEZENOVE[u]);
    else {
      if (d) partes.push(DEZENAS[d]);
      if (u) partes.push(feminino && u <= 2 ? ['', 'uma', 'duas'][u] : UNIDADES[u]);
    }
    return partes.join(' e ');
  }

  /** Quantidade para o PDF: "2" → "duas vezes"; texto livre fica exatamente como foi escrito. */
  function vezesPorExtenso(valor) {
    const t = String(valor || '').trim();
    if (!/^\d+$/.test(t)) return t;
    const n = parseInt(t, 10);
    if (n === 1) return 'uma vez';
    return `${porExtenso(n, true)} vezes`;
  }

  const DIAS_DA_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  /** "Domingo, 22 de novembro de 2026". */
  const dataPorExtenso = d => `${DIAS_DA_SEMANA[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;

  const doisDigitos = n => String(n).padStart(2, '0');
  /** Data local no formato AAAA-MM-DD (histórico de confissões, nome do PDF). */
  const dataISO = d => `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
  /** "2026-11-22" → "22/11/2026". */
  const isoParaBR = iso => { const [a, m, d] = iso.split('-'); return `${d}/${m}/${a}`; };

  /* ---------- Última confissão ---------- */

  /**
   * Data dd/mm/aaaa → tempo aproximado para dizer ao padre ("há 2 meses", ou "há dois meses" com extenso).
   * Devolve null se a data estiver incompleta, { erro } se for inválida ou futura, ou { texto }.
   */
  function tempoDesde(data, hoje = new Date(), { extenso = false } = {}) {
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
    return { texto: 'há ' + formatarDuracao(dias, { extenso }) };
  }

  /** Duração aproximada: 5 → "5 dias", 21 → "3 semanas", 71 → "2 meses", 469 → "1 ano e 3 meses". */
  function formatarDuracao(dias, { extenso = false } = {}) {
    const qtd = (n, singular, plural, feminino) => n === 1
      ? `${extenso ? (feminino ? 'uma' : 'um') : 1} ${singular}`
      : `${extenso ? porExtenso(n, feminino) : n} ${plural}`;
    if (dias < 14) return qtd(dias, 'dia', 'dias');
    if (dias < 45) return qtd(Math.round(dias / 7), 'semana', 'semanas', true);
    const meses = Math.round(dias / 30.4375);
    const anos = Math.floor(meses / 12), resto = meses % 12;
    return [anos && qtd(anos, 'ano', 'anos'), resto && qtd(resto, 'mês', 'meses')].filter(Boolean).join(' e ');
  }

  /* ---------- Histórico de confissões (só datas) ---------- */

  const isoParaData = iso => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); };
  const diasEntre = (isoA, isoB) => Math.round((Date.UTC(...isoB.split('-').map((n, i) => +n - (i === 1))) - Date.UTC(...isoA.split('-').map((n, i) => +n - (i === 1)))) / 864e5);

  /**
   * Resumo da tela "Minhas confissões": datas da mais recente para a mais antiga,
   * com o tempo desde hoje e o intervalo desde a anterior, mais total, quantas no ano e média.
   */
  function resumoConfissoes(datasISO, hoje = new Date()) {
    const datas = [...new Set(datasISO)].sort();
    const itens = datas.map((iso, i) => ({
      iso,
      extenso: dataPorExtenso(isoParaData(iso)),
      desde: tempoDesde(isoParaBR(iso), hoje)?.texto || '',
      intervalo: i ? formatarDuracao(diasEntre(datas[i - 1], iso)) : '',
    })).reverse();
    const media = datas.length > 1 ? formatarDuracao(Math.round(diasEntre(datas[0], datas.at(-1)) / (datas.length - 1))) : '';
    return { total: datas.length, noAno: datas.filter(d => +d.slice(0, 4) === hoje.getFullYear()).length, media, itens };
  }

  /** Primeira frase do texto: primeira confissão, tempo pela data, tempo livre ou lacuna "___". */
  function aberturaConfissao(perfil, hoje, opcoes) {
    if (perfil.confessou === 'nunca') return 'Padre, esta é a minha primeira confissão.';
    const pelaData = tempoDesde(perfil.data, hoje, opcoes);
    if (pelaData && pelaData.texto) return `Padre, minha última confissão foi ${pelaData.texto}.`;
    const livre = semPontoFinal((perfil.tempo || '').trim().replace(/^há\s+/i, ''));
    return `Padre, minha última confissão foi há ${livre || '___'}.`;
  }

  /* ---------- Itens da confissão (base do texto e do PDF) ---------- */

  /**
   * Um item por pecado marcado, já com as junções aplicadas:
   * { pergunta, ordem, frase (sem quantidade), vezes, obs, esquecido, prioridade }.
   * Prioridade: 0 esquecido, 1 matéria grave, 2 demais, 3 pecados capitais.
   */
  function itensDaConfissao({ perguntas, respostas, perfil }) {
    const marcadas = perguntas.filter(p => marcada(p, respostas, perfil));
    const ids = new Set(marcadas.map(p => p.id));

    // Perguntas juntadas: a primeira leva a frase única e os detalhes de todas.
    const fraseJunta = new Map();
    const omitidas = new Set();
    const respostasJuntas = {};
    JUNCOES.forEach(j => {
      if (!j.ids.every(id => ids.has(id))) return;
      const [primeira, ...outras] = j.ids;
      const rs = j.ids.map(id => respostas[id]);
      fraseJunta.set(primeira, j.frase);
      outras.forEach(id => omitidas.add(id));
      respostasJuntas[primeira] = {
        valor: 'pequei',
        vezes: rs.map(r => String(r.vezes || '').trim()).find(Boolean) || '',
        obs: rs.map(r => (r.obs || '').trim()).filter(Boolean).join('; '),
        esquecido: rs.some(r => r.esquecido),
      };
    });
    const efetivas = { ...respostas, ...respostasJuntas };

    return marcadas
      .map((p, ordem) => ({ p, ordem }))
      .filter(({ p }) => !omitidas.has(p.id))
      .map(({ p, ordem }) => {
        const r = efetivas[p.id];
        const esquecido = esquecida(p, efetivas, perfil);
        return {
          pergunta: p,
          ordem,
          frase: fraseJunta.get(p.id) || (p.capital !== null ? FRASES_CAPITAIS[p.capital] : p.texto.replace(/\?$/, '')),
          vezes: String(r.vezes || '').trim(),
          obs: (r.obs || '').trim(),
          esquecido,
          prioridade: esquecido ? 0 : p.capital !== null ? 3 : MATERIA_GRAVE.has(p.id) ? 1 : 2,
        };
      });
  }

  /* ---------- Resumo ---------- */

  /**
   * Texto para levar à confissão: abertura, uma frase por pecado (esquecidos, matéria grave,
   * demais, pecados capitais), encerramento e o ato de contrição escolhido.
   */
  function gerarTextoConfissao({ perguntas, respostas, perfil, incluirObs = false, ato, hoje }) {
    const linhas = itensDaConfissao({ perguntas, respostas, perfil })
      .sort((a, b) => a.prioridade - b.prioridade || a.ordem - b.ordem)
      .map(i => {
        let t = i.esquecido ? 'Numa confissão anterior, esqueci de confessar que ' + minuscula(i.frase) : i.frase;
        const vezes = formatarVezes(i.vezes);
        if (vezes) t += ', ' + vezes;
        if (incluirObs && i.obs) t += ` (${semPontoFinal(i.obs)})`;
        return semPontoFinal(t) + '.';
      });
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
      + (i.esquecido ? ' [esquecido em confissão anterior]' : '')).join('\n')).join('\n\n');
  }

  /** Troca o ato de contrição dentro de um texto já editado, preservando o resto da edição. */
  const trocarAto = (texto, anterior, novo) => texto.split(anterior).join(novo);

  /* ---------- PDF ---------- */

  const escHTML = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /** Título de grupo no PDF: "Contra o 1º mandamento", "Contra o 6º e o 9º mandamentos"… */
  function tituloContra(secao) {
    if (secao.k === 'Igreja') return 'Contra os mandamentos da Igreja';
    if (secao.k === 'Capitais') return 'Pecados capitais';
    return 'Contra o ' + secao.t.replace(' e ', ' e o ');
  }

  const ESTILO_PDF = `
    @page { size: A4; margin: 0; }
    body { margin: 0; font-family: 'Liberation Serif', 'DejaVu Serif', serif; font-size: 12.5pt; line-height: 1.45; color: #1d1724; }
    h1 { margin: 0 0 2pt; font-size: 24pt; color: #5a2d82; }
    .data { margin: 0 0 18pt; color: #655c70; }
    .abertura { margin: 0 0 14pt; font-size: 13pt; }
    h2 { margin: 16pt 0 6pt; padding-bottom: 2pt; font-size: 14pt; color: #5a2d82; border-bottom: 0.6pt solid #e3daec; break-after: avoid; }
    ul { list-style: none; margin: 0; padding: 0; }
    li { margin: 0 0 7pt; break-inside: avoid; }
    li p { margin: 0; }
    .obs { margin-top: 1pt; font-size: 10.5pt; font-style: italic; color: #777777; }
    .intro { margin: 0 0 6pt; font-style: italic; color: #655c70; }
    .fim { margin-top: 22pt; }
    .ato { margin-top: 10pt; font-style: italic; }
  `;

  /**
   * HTML do PDF: título e data por extenso, abertura (tempo por extenso), pecados por mandamento
   * com a quantidade na frase e a observação embaixo, a seção "Por último" com os pecados
   * esquecidos em confissão anterior, o encerramento e o ato de contrição.
   */
  function gerarDocumentoPdf({ secoes, perguntas, respostas, perfil, ato, hoje = new Date() }) {
    const itens = itensDaConfissao({ perguntas, respostas, perfil });
    const linha = i => {
      const vezes = vezesPorExtenso(i.vezes);
      const frase = semPontoFinal(i.frase + (vezes ? ', ' + vezes : '')) + '.';
      return `<li><p>${escHTML(frase)}</p>${i.obs ? `<p class="obs">(${escHTML(semPontoFinal(i.obs))})</p>` : ''}</li>`;
    };
    const grupos = secoes.map((secao, si) => {
      const doGrupo = itens.filter(i => !i.esquecido && i.pergunta.secao === si);
      return doGrupo.length ? `<h2>${escHTML(tituloContra(secao))}</h2><ul>${doGrupo.map(linha).join('')}</ul>` : '';
    }).join('');
    const esquecidos = itens.filter(i => i.esquecido);
    const porUltimo = !esquecidos.length ? '' : '<h2>Por último</h2>'
      + '<p class="intro">Pecados que esqueci de confessar em confissão anterior:</p>'
      + `<ul>${esquecidos.map(linha).join('')}</ul>`;

    return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">'
      + `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">`
      + `<title>Exame de Consciência</title><style>${ESTILO_PDF}</style></head><body>`
      + '<h1>Exame de Consciência</h1>'
      + `<p class="data">${escHTML(dataPorExtenso(hoje))}</p>`
      + `<p class="abertura">${escHTML(aberturaConfissao(perfil, hoje, { extenso: true }))}</p>`
      + grupos + porUltimo
      + `<p class="fim">${escHTML(ENCERRAMENTO)}</p>`
      + `<p class="ato">${escHTML(ato)}</p>`
      + '</body></html>';
  }

  /** Nome sugerido no "Salvar como". */
  const nomeDoPdf = hoje => `exame-de-consciencia-${dataISO(hoje)}.pdf`;

  /* ---------- Exame salvo até a confissão ---------- */

  const texto = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

  /**
   * Restaura um exame lido do disco aceitando só campos conhecidos e ids que existem.
   * Devolve { respostas, perfil, ato, pdf } ou null se o conteúdo não for válido.
   */
  function restaurarExame(dados, perguntas, atos) {
    if (!dados || typeof dados !== 'object' || !dados.respostas || typeof dados.respostas !== 'object') return null;
    const ids = new Set(perguntas.map(p => p.id));
    const respostas = {};
    for (const [id, r] of Object.entries(dados.respostas)) {
      if (!ids.has(id) || !r || !['pequei', 'nao'].includes(r.valor)) continue;
      respostas[id] = { valor: r.valor, vezes: texto(r.vezes, 40), obs: texto(r.obs, 500), esquecido: r.esquecido === true };
    }
    const p = dados.perfil || {};
    const perfil = {
      estado: ['solteiro', 'casado'].includes(p.estado) ? p.estado : null,
      filhos: typeof p.filhos === 'boolean' ? p.filhos : null,
      confessou: ['sim', 'nunca'].includes(p.confessou) ? p.confessou : null,
      data: texto(p.data, 10),
      tempo: texto(p.tempo, 60),
    };
    return {
      respostas,
      perfil,
      ato: Object.prototype.hasOwnProperty.call(atos, dados.ato) ? dados.ato : 'bom',
      pdf: texto(dados.pdf, 4096),
    };
  }

  C.logica = {
    MATERIA_GRAVE, FRASES_CAPITAIS, JUNCOES,
    formatarVezes, mascararData, perfilVazio,
    montarPerguntas, visivel, perguntasDaSecao, marcada, podeTerEsquecido, esquecida, montarPassos,
    porExtenso, vezesPorExtenso, dataPorExtenso, dataISO, isoParaBR,
    tempoDesde, formatarDuracao, resumoConfissoes, aberturaConfissao, itensDaConfissao, gerarTextoConfissao, marcadasPorSecao, gerarLista, trocarAto,
    tituloContra, gerarDocumentoPdf, nomeDoPdf, restaurarExame,
  };
})(globalThis.Confiteor = globalThis.Confiteor || {});
