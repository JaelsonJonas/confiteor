/*
 * Interface do Confiteor: telas, navegação e eventos.
 * O estado vive na memória. No app instalado, a página pode pedir ao confiteor.py
 * (via message handler do WebKit) para gerar o PDF, que também guarda o exame até
 * a confissão, e para registrar a confissão, que apaga o exame e guarda só a data.
 */
(function (C) {
  'use strict';

  const L = C.logica;
  const PERGUNTAS = L.montarPerguntas(C.SECOES, C.CONFISSOES, { graves: C.MATERIA_GRAVE, catecismo: C.CATECISMO });
  const ATRASO_AVANCO = 260; // ms entre escolher uma resposta e ir para a próxima tela

  const $ = id => document.getElementById(id);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const palco = $('stage');
  const rodape = $('foot');

  /* ---------- Ponte com o app instalado (confiteor.py) ----------
   * ConfiteorHost traz as datas de confissão e o exame salvo; os pedidos vão por
   * webkit.messageHandlers.confiteor e a resposta volta em Confiteor.hostResposta. */
  const host = globalThis.ConfiteorHost && globalThis.webkit?.messageHandlers?.confiteor ? globalThis.ConfiteorHost : null;
  const pendentes = new Map();
  let proximoPedido = 1;

  function pedirAoApp(acao, dados = {}) {
    return new Promise(resolver => {
      const id = proximoPedido++;
      pendentes.set(id, resolver);
      globalThis.webkit.messageHandlers.confiteor.postMessage(JSON.stringify({ id, acao, ...dados }));
    });
  }

  C.hostResposta = (id, resultado) => {
    const resolver = pendentes.get(id);
    if (resolver) { pendentes.delete(id); resolver(resultado || { ok: false }); }
  };

  const SO_NO_APP = 'Disponível só no app instalado (abra pelo menu ou pelo comando confiteor).';

  /* ---------- Estado (só em memória) ---------- */

  const textoNovo = () => ({ atual: '', editado: false });

  const st = {
    confissoes: host?.confissoes ? [...host.confissoes] : [],   // datas AAAA-MM-DD
    pdf: '',                    // PDF exportado (o app lembra o caminho só até a confissão)
    respostas: {},
    perfil: null,
    passos: [],
    indice: 0,
    direcao: 1,
    timer: 0,
    exemplosAbertos: false,
    aba: 'confissao',          // 'confissao' | 'lista'
    incluirObs: false,
    ato: 'bom',
    texto: textoNovo(),        // texto da confissão na caixa; enquanto não editado, acompanha as respostas
  };

  /** Perfil inicial: com confissão registrada, "Última confissão" já vem com a data. */
  function perfilInicial() {
    const perfil = L.perfilVazio();
    const ultima = st.confissoes.at(-1);
    if (ultima) Object.assign(perfil, { confessou: 'sim', data: L.isoParaBR(ultima) });
    return perfil;
  }
  st.perfil = perfilInicial();

  function apagarTudo() {
    st.respostas = {};
    st.perfil = perfilInicial();
    st.pdf = '';
    st.aba = 'confissao';
    st.incluirObs = false;
    st.texto = textoNovo();
  }

  const passoAtual = () => st.passos[st.indice];
  const respostaDe = id => st.respostas[id] || {};
  const marcada = p => L.marcada(p, st.respostas, st.perfil);
  const perguntasDaSecao = si => L.perguntasDaSecao(PERGUNTAS, si, st.perfil);
  const respondidas = lista => lista.filter(p => respostaDe(p.id).valor).length;

  function textoConfissao() {
    if (!st.texto.editado) {
      st.texto.atual = L.gerarTextoConfissao({
        secoes: C.SECOES, perguntas: PERGUNTAS, respostas: st.respostas, perfil: st.perfil,
        incluirObs: st.incluirObs, ato: C.ATOS[st.ato].texto,
      });
    }
    return st.texto.atual;
  }

  /* ---------- Pedaços de HTML ---------- */

  const ICONE_CRUZ = '<svg viewBox="0 0 44 56" aria-hidden="true"><rect x="18" y="0" width="8" height="56" rx="2" fill="#d8b865"/><rect x="4" y="14" width="36" height="8" rx="2" fill="#d8b865"/></svg>';
  const ICONE_SETA = '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
  const BOTAO_CONTINUAR = '<button class="btn" id="next">Continuar</button>';
  const BOTAO_REFAZER = '<button class="edit" id="regen">Refazer o texto a partir das respostas</button>';

  const cartao = (i, rotulo, tecla, marcado) =>
    `<button class="choice" data-c="${i}" aria-pressed="${marcado}"><span class="r"></span>${esc(rotulo)}<kbd>${tecla}</kbd></button>`;

  const avisar = texto => { const t = $('toast'); if (t) t.textContent = texto; };

  function avisoData() {
    const t = L.tempoDesde(st.perfil.data);
    if (!t) return '';
    return t.erro ? `<span class="err">${t.erro}</span>` : `Para dizer ao padre: <b>${t.texto}</b>`;
  }

  /** "Última confissão: 22/11/2026 (há 3 dias)", se houver registro. */
  function ultimaConfissao() {
    const ultima = st.confissoes.at(-1);
    if (!ultima) return '';
    const br = L.isoParaBR(ultima);
    return `<p class="ultima-conf">Última confissão: ${br} (${L.tempoDesde(br)?.texto || ''})</p>`
      + '<button class="link-hero" id="historico">Minhas confissões</button>';
  }

  /* ---------- Telas: cada uma devolve { corpo, acoes } ---------- */

  function telaBoasVindas() {
    return {
      corpo: `<div class="welcome">${ICONE_CRUZ}<h1>Exame de Consciência</h1>`
        + '<p>Antes de começar, peça a luz do Espírito Santo para conhecer bem os seus pecados. '
        + (host
          ? 'Nada do que você marcar é salvo, a não ser que você gere o PDF: aí o exame fica guardado só até você marcar “Pecados confessados”, quando ele é apagado e fica registrada apenas a data da confissão.</p>'
          : 'Nada do que você marcar é salvo: ao fechar a página, tudo se apaga.</p>')
        + '<button class="link-hero" id="comoconfessar">Como se confessar</button>'
        + ultimaConfissao() + '</div>',
      acoes: '<button class="btn" id="next">Começar</button>'
        + (host ? '<button class="btn ghost" id="verpdf">Ver o PDF do exame</button>' : ''),
    };
  }

  function telaPerfil({ def, numero, total }) {
    const valor = st.perfil[def.campo];
    const pedeData = def.pedeDataSe !== undefined && valor === def.pedeDataSe;
    const campos = !pedeData ? '' : '<div class="det">'
      + `<label class="field"><span>Data da última confissão</span><input id="ultima" data-perfil="data" inputmode="numeric" maxlength="10" value="${esc(st.perfil.data)}" autocomplete="off" placeholder="dd/mm/aaaa"></label>`
      + `<p class="rel" id="rel" aria-live="polite">${avisoData()}</p>`
      + `<label class="field"><span>Não lembra a data? <small>Diga há quanto tempo, aproximadamente</small></span><input data-perfil="tempo" value="${esc(st.perfil.tempo)}" autocomplete="off" placeholder="Ex.: 2 meses, 1 ano"></label>`
      + '</div>';
    return {
      corpo: `<div class="eyebrow">Antes de começar · ${numero} de ${total}</div><p class="qt">${def.titulo}</p>`
        + (numero === 1 ? '<p class="sub">Três perguntas rápidas para adaptar o exame a você.</p>' : '')
        + `<div class="choices">${def.opcoes.map(([v, rotulo], i) => cartao(i, rotulo, i + 1, valor === v)).join('')}</div>`
        + campos,
      acoes: pedeData ? BOTAO_CONTINUAR : '',
    };
  }

  function telaSecao({ secao: si, total, parte, partes }) {
    const secao = C.SECOES[si];
    const feitas = respondidas(perguntasDaSecao(si));
    return {
      corpo: `<div class="part">Parte ${parte} de ${partes}</div><h2>${esc(secao.t)}</h2>`
        + (secao.s ? `<p class="lede">${esc(secao.s)}</p>` : '')
        + `<div class="rule"></div><p class="meta">${total} ${total > 1 ? 'perguntas' : 'pergunta'}`
        + (feitas ? ` · ${feitas} respondida${feitas > 1 ? 's' : ''}` : '') + '</p>'
        + (si === 0 ? '<p class="hint">Cada pergunta descreve uma falta. Marque <b>Pequei</b> quando reconhecer que a cometeu. Só os itens marcados como Pequei vão para o resumo.</p>'
          + '<p class="hint">O selo <b>Matéria grave</b> indica faltas graves em si mesmas. Elas são pecado mortal quando cometidas com pleno conhecimento e deliberado consentimento (Catecismo, § 1857), e os pecados mortais devem ser confessados com a espécie e o número de vezes (§ 1456). Os pecados veniais não são obrigatórios na confissão, mas é recomendado confessá-los (§ 1458).</p>'
          + '<p class="hint">Se quiser, use o campo <b>Observação</b> para anotar detalhes (circunstâncias, por quê). Eles servem só para você consultar se o padre perguntar e são apagados depois da confissão.</p>' : ''),
      acoes: `<button class="btn" id="next">${feitas ? 'Continuar' : 'Começar'}</button>`,
    };
  }

  function blocoExemplos({ id, catecismo }) {
    const exemplos = C.EXEMPLOS[id];
    if (!exemplos) return '';
    const aberto = st.exemplosAbertos;
    const lista = !aberto ? '' : `<ul class="ex" id="ex">${exemplos.map(t =>
      t.startsWith('Obs.:') ? `<li class="obs">${esc(t)}</li>` : `<li>${esc(t)}</li>`).join('')}`
      + (catecismo ? `<li class="cic">Catecismo da Igreja Católica, § ${esc(catecismo)}</li>` : '') + '</ul>';
    return `<button class="exbtn" id="exbtn" aria-expanded="${aberto}" aria-controls="ex">${aberto ? 'Ocultar exemplos' : 'Ver exemplos'}${ICONE_SETA}</button>${lista}`;
  }

  /** Quantidade: um número, ou "Mais de dez", ou "Não sei quantas, mas foram várias". */
  function campoQuantidade(vezes) {
    const numero = /^\d+$/.test(vezes) ? vezes : '';
    const opcao = (valor, rotulo) => `<button class="qtd-op" data-vezes="${valor}" aria-pressed="${vezes === valor}">${rotulo}</button>`;
    return '<div class="field"><label for="vezes">Quantas vezes? <small>(aproximadamente)</small></label>'
      + `<input id="vezes" inputmode="numeric" maxlength="3" data-resposta="vezes" value="${numero}" autocomplete="off" placeholder="Ex.: 2">`
      + `<div class="qtd">${opcao(L.MAIS_DE_DEZ, 'Mais de dez')}${opcao(L.VARIAS, 'Não sei quantas, mas foram várias')}</div></div>`;
  }

  function detalhesPequei(r) {
    return '<div class="det">'
      + campoQuantidade(r.vezes || '')
      + `<label class="field"><span>Observação <small>(opcional)</small></span><input data-resposta="obs" value="${esc(r.obs || '')}" autocomplete="off" placeholder="Algo que queira lembrar"></label>`
      + (!L.podeTerEsquecido(st.perfil) ? '' : `<label class="chk"><input type="checkbox" data-resposta="esquecido" ${r.esquecido ? 'checked' : ''}>Esqueci de confessar em confissão anterior</label>`)
      + '</div>';
  }

  function telaPergunta({ pergunta: p, posicao, total }) {
    const r = respostaDe(p.id), valor = r.valor || '';
    let acoes = '';
    if (valor === 'pequei') acoes = BOTAO_CONTINUAR;
    else if (!valor) acoes = '<button class="btn ghost" id="skip">Pular esta pergunta</button>';
    return {
      corpo: `<div class="eyebrow"><span>${esc(C.SECOES[p.secao].t)}</span><span aria-hidden="true">·</span><span>${posicao + 1} de ${total}</span>`
        + (p.grupo ? `<span class="chip">${esc(p.grupo)}</span>` : '')
        + (p.grave ? '<span class="chip grave">Matéria grave</span>' : '') + '</div>'
        + `<p class="qt" id="qt">${esc(p.texto)}</p>`
        + blocoExemplos(p)
        + `<div class="choices" role="group" aria-labelledby="qt">${cartao(0, 'Pequei', 'P', valor === 'pequei')}${cartao(1, 'Não', 'N', valor === 'nao')}</div>`
        + (valor === 'pequei' ? detalhesPequei(r) : ''),
      acoes,
    };
  }

  function abaConfissao() {
    const texto = textoConfissao();
    const temObs = PERGUNTAS.some(p => marcada(p) && (respostaDe(p.id).obs || '').trim());
    const ato = C.ATOS[st.ato];
    return '<p class="hint topo">Gerado a partir das suas respostas, por mandamento, como no PDF. Edite à vontade antes de copiar: junte, corrija ou retire o que quiser.</p>'
      + (temObs ? `<label class="chk"><input type="checkbox" id="incobs" ${st.incluirObs ? 'checked' : ''}>Incluir minhas observações no texto</label>` : '')
      + `<textarea id="conf" class="conf" spellcheck="false" aria-label="Texto para a confissão" rows="${texto.split('\n').length + 2}">${esc(texto)}</textarea>`
      + `<div id="regenw">${st.texto.editado ? BOTAO_REFAZER : ''}</div>`
      + '<section class="act" aria-labelledby="acth"><div class="act-h"><h3 id="acth">Ato de contrição</h3>'
      + `<div class="seg sm" role="tablist" aria-label="Versão do ato de contrição">${Object.entries(C.ATOS).map(([chave, a]) =>
        `<button role="tab" data-ato="${chave}" aria-selected="${st.ato === chave}">${a.titulo}</button>`).join('')}</div></div>`
      + `<p class="act-x">${esc(ato.texto)}</p><p class="act-n">Reze depois que o padre der a penitência. A versão escolhida também vai no final do texto acima.</p></section>`
      + '<p class="note">Antes de entrar, faça o propósito de emenda: decida, com a graça de Deus, não voltar a pecar e fugir das ocasiões de pecado (Catecismo, § 1451).</p>'
      + '<p class="note">Na confissão basta dizer o tipo de pecado e quantas vezes, sem citar nomes de outras pessoas.</p>';
  }

  function abaLista() {
    const grupos = L.marcadasPorSecao({ secoes: C.SECOES, perguntas: PERGUNTAS, respostas: st.respostas, perfil: st.perfil });
    const secoes = grupos.map(({ secao, itens }) => {
      const linhas = itens.map(i => {
        const meta = [esc(i.vezes), esc(i.obs), i.esquecido ? 'esquecido em confissão anterior' : ''].filter(Boolean).join(' · ');
        return `<li><div>${esc(i.pergunta.texto)}${meta ? `<div class="meta">${meta}</div>` : ''}</div><button class="edit" data-editar="${i.pergunta.id}">Editar</button></li>`;
      }).join('');
      return `<h3>${esc(secao.t)}</h3><ol>${linhas}</ol>`;
    }).join('');
    return `<p class="lede">Somente os pontos marcados como Pequei, por mandamento.</p><div class="sum">${secoes}</div>`;
  }

  function telaResumo() {
    const algum = PERGUNTAS.some(marcada);
    const abas = !algum ? '' : '<div class="seg" role="tablist">'
      + `<button role="tab" data-aba="confissao" aria-selected="${st.aba === 'confissao'}">Texto para a confissão</button>`
      + `<button role="tab" data-aba="lista" aria-selected="${st.aba === 'lista'}">Lista por mandamento</button></div>`;
    let conteudo;
    if (!algum) conteudo = '<p class="empty">Nenhum ponto marcado ainda. Volte às seções para fazer o exame.</p>';
    else conteudo = st.aba === 'confissao' ? abaConfissao() : abaLista();
    const principais = !algum
      ? '<button class="btn" id="restart">Voltar ao início</button>'
      : '<button class="btn" id="pdf">Gerar PDF</button>'
        + `<button class="btn ghost" id="copy">${st.aba === 'confissao' ? 'Copiar texto' : 'Copiar lista'}</button>`;
    let nota = 'Ao fechar esta página, todas as marcações se apagam. Nada fica salvo.';
    if (host) {
      nota = st.pdf
        ? `Exame guardado neste computador até você marcar “Pecados confessados”. PDF: ${esc(st.pdf)}`
        : 'Ao fechar, as marcações se apagam, a não ser que você gere o PDF: aí o exame fica guardado até a confissão.';
    }
    return {
      corpo: `<div class="part">Fim do exame</div><h2>Resumo para a confissão</h2>${abas}${conteudo}`
        + '<section class="depois"><h3>Depois da confissão</h3>'
        + '<p class="act-n">Marque quando já tiver se confessado: as respostas e o exame guardado são apagados, e só a data de hoje fica registrada.</p>'
        + (host ? '<button class="btn ghost" id="verpdf">Ver PDF</button>' : '')
        + '<button class="btn line" id="confessei">Pecados confessados</button>'
        + (host && st.pdf ? '<button class="edit" id="outropdf">Escolher outro PDF</button>' : '')
        + '</section>'
        + `<div id="fallback"></div><p class="note">${nota}</p>`,
      acoes: `${principais}<div class="toast" id="toast"></div><button class="btn danger" id="clr">Apagar tudo</button>`,
    };
  }

  const TELAS = {
    'boas-vindas': telaBoasVindas,
    perfil: telaPerfil,
    secao: telaSecao,
    pergunta: telaPergunta,
    resumo: telaResumo,
  };

  /* ---------- Renderização e navegação ---------- */

  /** Faz a caixa do texto crescer com o conteúdo (uma rolagem só na página). */
  function ajustarCaixaTexto() {
    const t = $('conf');
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = (t.scrollHeight + 2) + 'px';
  }

  function render(animar = true) {
    st.passos = L.montarPassos(C.SECOES, PERGUNTAS, st.perfil);
    st.indice = Math.max(0, Math.min(st.indice, st.passos.length - 1));
    const passo = passoAtual();

    document.body.classList.toggle('hero', passo.tipo === 'boas-vindas');
    $('top').hidden = passo.tipo === 'boas-vindas';
    $('back').disabled = st.indice === 0;
    $('bar').style.width = (st.indice / (st.passos.length - 1)) * 100 + '%';

    const { corpo, acoes } = TELAS[passo.tipo](passo);
    const animacao = !animar ? 'still' : st.direcao < 0 ? 'back' : '';
    palco.innerHTML = `<div class="screen ${animacao}">${corpo}</div>`;
    rodape.innerHTML = acoes;
    ajustarCaixaTexto();
    if (animar) palco.scrollTop = 0;
  }

  function irPara(indice, direcao) {
    clearTimeout(st.timer);
    st.direcao = direcao ?? (indice >= st.indice ? 1 : -1);
    st.indice = indice;
    render();
    const proximo = $('next');
    if (proximo && !proximo.disabled) proximo.focus({ preventScroll: true });
    else {
      const c = palco.querySelector('.choice[aria-pressed=true]') || palco.querySelector('.choice');
      if (c) c.focus({ preventScroll: true });
    }
  }

  const avancar = () => { if (st.indice < st.passos.length - 1) irPara(st.indice + 1, 1); };
  const voltar = () => { if (st.indice > 0) irPara(st.indice - 1, -1); };
  const indiceDe = criterio => st.passos.findIndex(criterio);

  function podeAvancar() {
    const passo = passoAtual();
    if (passo.tipo === 'perfil') return st.perfil[passo.def.campo] !== null;
    if (passo.tipo === 'pergunta') return !!respostaDe(passo.pergunta.id).valor;
    return true;
  }

  /** Enter / seta para a direita: usa o botão da tela, se houver; senão avança se já respondeu. */
  function avancarPeloTeclado() {
    const proximo = $('next');
    if (proximo) { if (!proximo.disabled) proximo.click(); }
    else if (podeAvancar()) avancar();
  }

  /** Clique num cartão de resposta (índice 0 ou 1). */
  function escolher(i) {
    clearTimeout(st.timer); // escolher de novo antes do avanço automático não pode avançar duas vezes
    const passo = passoAtual();
    if (passo.tipo === 'perfil') {
      const [valor] = passo.def.opcoes[i];
      st.perfil[passo.def.campo] = valor;
      render(false);
      if (valor === passo.def.pedeDataSe) {
        const campo = $('ultima');
        if (campo) campo.focus({ preventScroll: true });
      } else {
        st.timer = setTimeout(avancar, ATRASO_AVANCO);
      }
      return;
    }
    if (passo.tipo !== 'pergunta') return;
    const id = passo.pergunta.id;
    const valor = i === 0 ? 'pequei' : 'nao';
    st.respostas[id] = { ...respostaDe(id), valor };
    render(false);
    if (valor === 'pequei') {
      const vezes = $('vezes');
      if (vezes) {
        vezes.focus({ preventScroll: true });
        vezes.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    } else {
      st.timer = setTimeout(avancar, ATRASO_AVANCO);
    }
  }

  /* ---------- Copiar ---------- */

  function copiaManual(texto, caixa) {
    const aviso = $('toast');
    if (caixa) {
      caixa.focus();
      caixa.select();
      aviso.textContent = 'Selecione o texto e copie.';
      return;
    }
    $('fallback').innerHTML = '<textarea readonly></textarea>';
    const area = $('fallback').querySelector('textarea');
    area.value = texto;
    area.select();
    aviso.textContent = 'Selecione o texto abaixo e copie.';
  }

  function copiar() {
    const caixa = st.aba === 'confissao' && $('conf');
    const texto = caixa ? caixa.value : L.gerarLista({ secoes: C.SECOES, perguntas: PERGUNTAS, respostas: st.respostas, perfil: st.perfil });
    const sucesso = caixa ? 'Texto copiado.' : 'Lista copiada.';
    try {
      navigator.clipboard.writeText(texto).then(() => { $('toast').textContent = sucesso; }, () => copiaManual(texto, caixa));
    } catch (e) {
      copiaManual(texto, caixa);
    }
  }

  /* ---------- Camadas: menu de seções e confirmação ---------- */

  function abrirMenuSecoes() {
    const atual = passoAtual();
    const secaoAtual = atual.tipo === 'secao' ? atual.secao : atual.tipo === 'pergunta' ? atual.pergunta.secao : -1;
    const ponto = destaque => destaque ? '<span class="dot"></span>' : '<span class="nodot"></span>';
    $('jumps').innerHTML =
      `<button class="jump" data-ir="perfil" aria-current="${atual.tipo === 'perfil'}">${ponto(false)}Antes de começar</button>`
      + C.SECOES.map((secao, si) => {
        const qs = perguntasDaSecao(si);
        return `<button class="jump" data-ir="${si}" aria-current="${secaoAtual === si}">${ponto(qs.some(marcada))}${esc(secao.t)}<span class="c">${respondidas(qs)}/${qs.length}</span></button>`;
      }).join('')
      + `<button class="jump" data-ir="resumo" aria-current="${atual.tipo === 'resumo'}">${ponto(false)}Resumo</button>`
      + `<button class="jump" data-ir="guia">${ponto(false)}Como se confessar</button>`
      + (host ? `<button class="jump" data-ir="historico">${ponto(false)}Minhas confissões<span class="c">${st.confissoes.length}</span></button>` : '');
    $('sheet').classList.add('on');
    ($('jumps').querySelector('[aria-current=true]') || $('jumps').firstChild).focus();
  }

  /* Confirmação: mostra a pergunta e resolve true (botão principal) ou false (cancelar, Esc, clique fora). */
  let respostaConfirmacao = null;

  function confirmar({ mensagem, sim, nao = 'Cancelar', perigo = false }) {
    $('dlgmsg').textContent = mensagem;
    $('yes').textContent = sim;
    $('yes').className = perigo ? 'btn perigo' : 'btn';
    $('no').textContent = nao;
    $('dlg').classList.add('on');
    $('no').focus();
    return new Promise(resolver => { respostaConfirmacao = resolver; });
  }

  function responderConfirmacao(valor) {
    $('dlg').classList.remove('on');
    const resolver = respostaConfirmacao;
    respostaConfirmacao = null;
    if (resolver) resolver(valor);
  }

  const CAMADAS = ['sheet', 'hist', 'guia', 'dlg'];
  const fecharCamadas = () => { CAMADAS.forEach(id => { if (id !== 'dlg') $(id).classList.remove('on'); }); responderConfirmacao(false); };
  const camadaAberta = () => CAMADAS.some(id => $(id).classList.contains('on'));

  /* "Como se confessar": oração ao Espírito Santo e os passos da confissão, com o Catecismo. */
  function abrirGuia() {
    const oracao = C.ORACAO_ESPIRITO_SANTO;
    $('guiacorpo').innerHTML = `<h5 class="guia-t">${esc(oracao.titulo)}</h5><p class="act-x">${esc(oracao.texto)}</p>`
      + `<ol class="passos">${C.PASSOS_CONFISSAO.map(p => `<li><b>${esc(p.titulo)}</b><span>${esc(p.texto)}</span>`
        + `<small>Catecismo, § ${esc(p.cic)}</small></li>`).join('')}</ol>`
      + '<div class="foot inline"><button class="btn ghost" id="fecharguia">Fechar</button></div>';
    $('guia').classList.add('on');
    $('fecharguia').focus();
  }

  /* "Minhas confissões": só as datas registradas em "Pecados confessados". */
  function abrirHistorico() {
    const r = L.resumoConfissoes(st.confissoes);
    const plural = (n, um, varios) => (n === 1 ? um : varios);
    $('histcorpo').innerHTML = !r.total
      ? '<p class="hist-resumo">Nenhuma confissão registrada ainda. Ao marcar “Pecados confessados”, a data aparece aqui.</p>'
        + '<div class="foot inline"><button class="btn ghost" id="fecharhist">Fechar</button></div>'
      : `<p class="hist-resumo">${r.total} ${plural(r.total, 'confissão registrada', 'confissões registradas')}`
        + ` · ${r.noAno} em ${new Date().getFullYear()}` + (r.media ? ` · em média a cada ${r.media}` : '') + '</p>'
        + `<ol class="hist">${r.itens.map(i => `<li><b>${esc(i.extenso)}</b><span>${esc(i.desde)}`
          + (i.intervalo ? ` · ${esc(i.intervalo)} depois da anterior` : ' · primeira registrada') + '</span></li>').join('')}</ol>`
        + '<p class="act-n">Só as datas ficam guardadas, nenhum pecado.</p>'
        + '<div class="foot inline"><button class="btn danger" id="apagarhist">Apagar histórico de datas</button>'
        + '<button class="btn ghost" id="fecharhist">Fechar</button></div>';
    $('hist').classList.add('on');
    $('fecharhist').focus();
  }

  async function apagarHistorico() {
    const confirmou = await confirmar({
      mensagem: `Apagar o histórico com ${st.confissoes.length} ${st.confissoes.length === 1 ? 'data' : 'datas'} de confissão? Isso não pode ser desfeito.`,
      sim: 'Apagar histórico', perigo: true,
    });
    if (!confirmou) return;
    const resultado = await pedirAoApp('apagarHistorico');
    if (!resultado.ok) return;
    st.confissoes = [];
    render(false);
    abrirHistorico();
  }

  function irParaDestino(destino) {
    if (destino === 'perfil') return indiceDe(p => p.tipo === 'perfil');
    if (destino === 'resumo') return st.passos.length - 1;
    return indiceDe(p => p.tipo === 'secao' && p.secao === +destino);
  }

  /* ---------- PDF e confissão (app instalado) ---------- */

  async function gerarPdf() {
    if (!host) { avisar(SO_NO_APP); return; }
    avisar('Gerando o PDF…');
    const hoje = new Date();
    const resultado = await pedirAoApp('gerarPdf', {
      html: L.gerarDocumentoPdf({
        secoes: C.SECOES, perguntas: PERGUNTAS, respostas: st.respostas, perfil: st.perfil,
        ato: C.ATOS[st.ato].texto, hoje,
      }),
      exame: { versao: C.VERSAO_PERGUNTAS, respostas: st.respostas, perfil: st.perfil, ato: st.ato },
      nome: L.nomeDoPdf(hoje),
    });
    if (resultado.ok) {
      st.pdf = resultado.caminho;
      render(false);
      avisar('PDF salvo. O exame fica guardado até você marcar “Pecados confessados”.');
    } else {
      avisar(resultado.cancelado ? '' : `Não foi possível gerar o PDF: ${resultado.erro || 'erro desconhecido'}`);
    }
  }

  /** Abre o PDF numa janela do app: o gerado/escolhido antes ou, se não houver, um escolhido agora. */
  async function verPdf(escolher = false) {
    if (!host) { avisar(SO_NO_APP); return; }
    const resultado = await pedirAoApp('verPdf', { escolher });
    if (resultado.ok) {
      st.pdf = resultado.caminho;
      render(false);
      avisar('Depois de se confessar, use “Pecados confessados”.');
    } else if (!resultado.cancelado) {
      avisar(`Não foi possível abrir o PDF: ${resultado.erro || 'erro desconhecido'}`);
    }
  }

  async function pecadosConfessados() {
    if (!host) { avisar(SO_NO_APP); return; }
    const confirmou = await confirmar({
      mensagem: 'Você já se confessou? As respostas e o exame guardado serão apagados, e só a data de hoje ficará registrada.',
      sim: 'Sim, pecados confessados',
    });
    if (!confirmou) return;
    const apagarPdf = !!st.pdf && await confirmar({
      mensagem: `Apagar também o PDF salvo em ${st.pdf}?`,
      sim: 'Apagar o PDF', nao: 'Manter o PDF', perigo: true,
    });
    const resultado = await pedirAoApp('confessado', { apagarPdf });
    if (!resultado.ok) { avisar(`Não foi possível registrar: ${resultado.erro || 'erro desconhecido'}`); return; }
    st.confissoes = resultado.confissoes;
    apagarTudo();
    irPara(0, -1);
  }

  async function confirmarApagarTudo() {
    const confirmou = await confirmar({
      mensagem: 'Apagar todas as marcações? Isso não pode ser desfeito.' + (host ? ' O exame guardado também é apagado (o PDF, se houver, continua onde você salvou).' : ''),
      sim: 'Apagar tudo', perigo: true,
    });
    if (!confirmou) return;
    if (host) await pedirAoApp('apagarExame');
    apagarTudo();
    irPara(0, -1);
  }

  /* ---------- Eventos ---------- */

  const ACOES = {
    next: avancar,
    skip: avancar,
    back: voltar,
    menu: abrirMenuSecoes,
    exbtn() { st.exemplosAbertos = !st.exemplosAbertos; render(false); $('exbtn').focus({ preventScroll: true }); },
    restart() { irPara(indiceDe(p => p.tipo === 'secao')); },
    copy: copiar,
    regen() { st.texto = textoNovo(); render(false); },
    pdf: gerarPdf,
    confessei: pecadosConfessados,
    verpdf() { verPdf(false); },
    historico() { if (host) abrirHistorico(); else avisar(SO_NO_APP); },
    apagarhist: apagarHistorico,
    fecharhist: fecharCamadas,
    comoconfessar: abrirGuia,
    fecharguia: fecharCamadas,
    outropdf() { verPdf(true); },
    clr: confirmarApagarTudo,
    yes() { responderConfirmacao(true); },
    no() { responderConfirmacao(false); },
  };

  document.addEventListener('click', e => {
    const alvo = e.target;
    if (alvo.classList.contains('layer')) { fecharCamadas(); return; }

    const cartaoClicado = alvo.closest('.choice');
    if (cartaoClicado) { escolher(+cartaoClicado.dataset.c); return; }

    const botao = alvo.closest('button');
    if (!botao) return;
    if (ACOES[botao.id]) { ACOES[botao.id](); return; }

    const { ato, aba, ir, editar, vezes } = botao.dataset;
    if (vezes && passoAtual().tipo === 'pergunta') {
      const id = passoAtual().pergunta.id;
      const atual = respostaDe(id).vezes;
      st.respostas[id] = { ...respostaDe(id), vezes: atual === vezes ? '' : vezes };
      render(false);
    } else if (ato) {
      const anterior = C.ATOS[st.ato].texto;
      st.ato = ato;
      // Se o texto foi editado, troca só a oração e preserva a edição.
      const oracaoEditada = st.texto.editado && !st.texto.atual.includes(anterior);
      if (st.texto.editado) st.texto.atual = L.trocarAto(st.texto.atual, anterior, C.ATOS[ato].texto);
      render(false);
      if (oracaoEditada) $('toast').textContent = 'A oração do texto foi editada: use "Refazer o texto" para trocá-la.';
    } else if (aba) {
      st.aba = aba;
      render(false);
    } else if (ir === 'historico') {
      fecharCamadas();
      abrirHistorico();
    } else if (ir === 'guia') {
      fecharCamadas();
      abrirGuia();
    } else if (ir !== undefined) {
      fecharCamadas();
      irPara(irParaDestino(ir));
    } else if (editar) {
      irPara(indiceDe(p => p.tipo === 'pergunta' && p.pergunta.id === editar), -1);
    }
  });

  palco.addEventListener('input', e => {
    const campo = e.target;

    if (campo.id === 'conf') {
      st.texto.atual = campo.value;
      ajustarCaixaTexto();
      if (!st.texto.editado) {
        st.texto.editado = true;
        $('regenw').innerHTML = BOTAO_REFAZER;
      }
      return;
    }

    const { perfil, resposta } = campo.dataset;
    if (perfil) {
      if (perfil === 'data') campo.value = L.mascararData(campo.value);
      st.perfil[perfil] = campo.value;
      const aviso = $('rel');
      if (aviso) aviso.innerHTML = avisoData();
      return;
    }

    const passo = passoAtual();
    if (resposta && passo.tipo === 'pergunta') {
      const id = passo.pergunta.id;
      if (resposta === 'vezes') {
        // Só dígitos; digitar um número desmarca "Mais de dez" / "várias".
        campo.value = campo.value.replace(/\D/g, '').slice(0, 3);
        palco.querySelectorAll('.qtd-op').forEach(b => b.setAttribute('aria-pressed', 'false'));
      }
      st.respostas[id] = { ...respostaDe(id), [resposta]: campo.type === 'checkbox' ? campo.checked : campo.value };
    }
  });

  palco.addEventListener('change', e => {
    if (e.target.id !== 'incobs') return;
    st.incluirObs = e.target.checked;
    // Texto editado à mão é preservado; "Refazer o texto" aplica a mudança quando a pessoa quiser.
    render(false);
    if (st.texto.editado) $('toast').textContent = 'Seu texto editado foi mantido: use "Refazer o texto" para incluir a mudança.';
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { fecharCamadas(); return; }
    if (camadaAberta() || e.ctrlKey || e.metaKey || e.isComposing) return;

    const alvo = e.target instanceof Element ? e.target : document.body;
    const digitando = alvo.matches('input, textarea');

    if (e.key === 'Enter') {
      if (digitando || !alvo.matches('button')) { e.preventDefault(); avancarPeloTeclado(); }
      return;
    }
    if (digitando) return;

    if (e.key === 'ArrowLeft' || e.key === 'Backspace') { e.preventDefault(); voltar(); return; }
    if (e.key === 'ArrowRight') { avancarPeloTeclado(); return; }

    const tecla = e.key.toLowerCase();
    const tipo = passoAtual().tipo;
    if (tipo === 'perfil' && (tecla === '1' || tecla === '2')) escolher(+tecla - 1);
    if (tipo === 'pergunta') {
      if (tecla === 'p' || tecla === '1') escolher(0);
      else if (tecla === 'n' || tecla === '2') escolher(1);
      else if (tecla === 'e' && $('exbtn')) $('exbtn').click();
    }
  });

  // Botão "Pecados confessados" da janela do PDF.
  C.marcarConfessado = () => pecadosConfessados();

  // Exame guardado (PDF já gerado, confissão ainda não feita): volta direto para o Resumo.
  const salvo = host?.exame && L.restaurarExame(host.exame, PERGUNTAS, C.ATOS, { versao: C.VERSAO_PERGUNTAS, idsAnteriores: C.IDS_ANTERIORES });
  if (salvo) {
    Object.assign(st, { respostas: salvo.respostas, perfil: salvo.perfil, ato: salvo.ato, pdf: salvo.pdf });
    st.indice = Infinity; // render() limita ao último passo, o Resumo
  }

  render();
})(globalThis.Confiteor);
