/*
 * Perguntas do exame de consciência, com base nos Dez Mandamentos como os apresenta
 * o Catecismo da Igreja Católica (CIC, 3ª parte, 2ª seção), nos mandamentos da Igreja
 * (CIC 2041–2043) e nos pecados capitais (CIC 1866).
 *
 * Cada seção tem:
 *   k  rótulo curto (menu de seções)
 *   t  título
 *   s  subtítulo (pode ser vazio)
 *   g  grupos: [rótulo do grupo ou null, texto]
 *      - texto em parágrafo: dividido em perguntas a cada "?"
 *      - texto em lista: cada item é uma pergunta (pecados capitais)
 *
 * O id de cada pergunta é "seção-grupo-pergunta" (ex.: "0-0-5") e liga a pergunta
 * aos exemplos (exemplos.js), à frase da confissão (confissoes.js) e às listas abaixo.
 * Os grupos "Para os pais" e "Para os casados" só aparecem para quem tem filhos / é casado.
 *
 * Ao mudar a ordem das perguntas, aumente VERSAO_PERGUNTAS e diga em IDS_ANTERIORES
 * para onde foi cada id da versão anterior, para que um exame guardado (PDF gerado,
 * confissão ainda não feita) continue com as respostas nas perguntas certas.
 */
(function (C) {
  'use strict';
  C.SECOES = [
{k:'1º',t:'1º mandamento',s:'Amar a Deus sobre todas as coisas',g:[[null,'Deixei de crer fielmente em tudo o que Deus revelou, ou duvidei voluntariamente de alguma doutrina da Igreja Católica Apostólica Romana? Li, divulguei ou recomendei, sem necessidade, livros, sites, vídeos ou publicações contrários à fé, expondo a minha fé ou a dos outros a perigo? Dei ouvido a conversas ou discursos ímpios ou heréticos? Participei de sessões espíritas ou de rituais e cultos de outras religiões, tomando parte neles como fiel? Abandonei a fé católica para entrar em outra religião ou igreja? Neguei ou escondi a minha fé por vergonha ou por respeito humano? Faltei com a confiança em Deus e na divina graça? Consultei espíritas ou cartomantes? Consultei videntes? Pratiquei superstições, usando amuletos, simpatias ou objetos de "sorte"? Desesperei da minha salvação ou fui presunçoso, esperando encontrá-la sem deixar o pecado? Cometi pecados no intuito de confessá-los mais tarde? Deixei de rezar por muito tempo? Blasfemei contra Nossa Senhora, os santos, a Igreja ou as coisas sagradas? Rezei sem devoção, com distrações voluntárias? Descuidei da minha formação religiosa e moral e também da formação das pessoas que moram comigo ou dependem de mim?']]},
{k:'2º',t:'2º mandamento',s:'Não tomar seu santo nome em vão',g:[[null,'Cometi sacrilégio, profanando o Santíssimo Sacramento, pessoas, lugares ou coisas consagradas a Deus? Blasfemei contra Deus? Comunguei em estado de pecado grave? Escondi de propósito algum pecado grave numa confissão? Recebi algum sacramento indignamente, sem estar devidamente preparado? Jurei o seu santo nome sem necessidade? Jurei em falso, chamando Deus como testemunha de uma mentira? Pronunciei levianamente o nome de Deus? Deixei de cumprir uma promessa? Faço de má vontade as coisas relacionadas com Deus?']]},
{k:'3º',t:'3º mandamento',s:'Guardar domingos e festas',g:[[null,'Deixei de participar da Santa Missa inteira aos domingos e dias de preceito por própria culpa? Profanei a Igreja com conversas, olhares indiscretos, namoros, por usar um traje indecente? Trabalhei ou mandei trabalhar desnecessariamente nos domingos ou dias de guarda? Deixei de santificar o domingo, sem dar tempo a Deus, à família e às obras de caridade?']]},
{k:'4º',t:'4º mandamento',s:'Honrar pai e mãe',g:[['Para os filhos','Desrespeitei os pais falando-lhes asperamente ou respondendo-lhes mal? Murmurei contra meus pais? Desobedeci? Obedeci de má vontade? Descuidei dos pais na velhice, na pobreza ou na doença (sustento, últimos sacramentos: levar os pais para recebê-los ou chamar um padre para ministrá-los)? Desejei mal a meus pais? Deixei de rezar por meus pais?'],['Família e sociedade','Tratei mal meus irmãos ou outros familiares, ou deixei de ajudá-los quando precisavam? Faltei com o respeito ou a obediência às autoridades legítimas, aos professores ou aos superiores? Descuidei dos meus deveres de cidadão, como votar com consciência e colaborar com o bem comum?'],['Para os pais','Protelei o batismo de meus filhos, a sua primeira comunhão? Descuidei-me da educação física, intelectual e principalmente religiosa dos meus filhos? Deixei de fazer o que estava ao meu alcance para que fossem à Santa Missa aos domingos e festas de guarda, à catequese? Descuidei de suas boas leituras, ou deixei de reprimir divertimentos impróprios? Dei-lhes mau exemplo? Deixei de corrigi-los? Castiguei-os, não com caridade, mas com ira?']]},
{k:'5º',t:'5º mandamento',s:'Não matar',g:[[null,'Odiei o próximo? Desejei mal ao próximo? Procurei vingar-me? Não tive caridade com os pobres, doentes e necessitados? Prejudiquei minha saúde por excesso de comida e bebida, sobretudo bebidas alcoólicas? Usei drogas? Dirigi de forma imprudente, depois de beber ou em alta velocidade, pondo em risco a minha vida e a dos outros? Agi contra a própria vida ou contra a vida do próximo, ou alimentei pensamentos nesse sentido? Abortei, colaborei ou incentivei o aborto? Tive pensamentos de praticar, colaborar ou incentivar o aborto? Usei, entreguei, recomendei a "pílula do dia seguinte"? Pedi, apoiei ou pratiquei a eutanásia, ou neguei a um doente os cuidados básicos para apressar a sua morte? Levei alguém a pecar ou fui causa de escândalo? Roguei pragas? Dei mau exemplo ou tratei mal as pessoas que estão ao meu redor? Guardo inimizade, ódio ou rancor contra alguém? Deixei que divergências políticas, profissionais ou qualquer outro tipo de diferença degenerassem em indisposição, má vontade ou ódio com relação a alguém? Feri os outros por palavras ou ações? Empreguei em alguma ocasião a violência física? Cooperei com o pecado dos outros, aconselhando, aprovando, elogiando ou me calando quando tinha o dever de falar? Deixei de fazer o bem que podia e devia fazer, por comodismo, medo ou indiferença?']]},
{k:'6º e 9º',t:'6º e 9º mandamentos',s:'Não pecar contra a castidade · Não desejar a mulher do próximo',g:[[null,'Consenti em pensamentos sensuais e em maus desejos? Olhei indiscreta e maliciosamente para coisas indecentes, pessoas mal vestidas? Tive conversas impuras? Li e olhei sites, livros ou revistas, estampas, filmes, séries, vídeos ou fotografias obscenas e imorais? Pratiquei atos impuros comigo mesmo (masturbação), com outra pessoa, do mesmo sexo ou de outro sexo? Vivo junto com alguém, ou mantenho relações sexuais, sem estar casado na Igreja? Faltei com o pudor e a modéstia em meus trajes? Paguei ou recebi dinheiro por relações sexuais, ou explorei a prostituição de alguém? Forcei alguém a atos sexuais, assediei ou cometi abuso sexual, sobretudo contra uma criança ou um adolescente?'],['Para os casados','Procurei satisfação carnal fora do matrimônio (adultério ou masturbação)? Abusei do matrimônio, evitando ter filhos sem necessidade grave ou de maneira condenada pela Igreja? Aconselhei meios para evitar filhos dessa maneira? Faltei com o amor e o respeito ao meu cônjuge, com grosserias, desprezo ou indiferença? Abandonei meu cônjuge ou rompi o casamento sem motivo grave? Recorri à fertilização in vitro, à barriga de aluguel ou a outras técnicas que separam a geração dos filhos do ato conjugal?']]},
{k:'7º e 10º',t:'7º e 10º mandamentos',s:'Não furtar · Não cobiçar as coisas alheias',g:[[null,'Roubei, furtei, aceitei objetos furtados, guardei-os? Tive vontade de roubar ou furtar? Não restituí ao dono um objeto achado ou emprestado? Deixei de pagar as dívidas sem motivo de força maior (desemprego, calamidade, necessidade maior para o sustento da vida)? Fiz dívidas que sabia que não poderia pagar? Não paguei ao funcionário o salário justo? Dei prejuízo voluntário ao próximo? Desperdicei o dinheiro em jogo ou com caprichos e futilidades? Aceitei ou pedi suborno? Cometi alguma fraude? Enganei os outros cobrando mais do que o justo por um produto, serviço etc.? Retenho ou atraso indevidamente pagamentos e salários que devo pagar? Deixei de trabalhar com honestidade e empenho, recebendo por um trabalho que não fiz ou fiz mal de propósito? Uso os bens da empresa em proveito próprio ou sem a justiça necessária? Usei, comprei ou distribuí produtos falsificados, programas, filmes, músicas ou livros piratas? Maltratei animais? Desperdicei ou destruí, sem necessidade, os bens da criação e da natureza?']]},
{k:'8º',t:'8º mandamento',s:'Não levantar falso testemunho',g:[[null,'Menti? Violei segredos? Dei falso testemunho? Supus más intenções? Abri cartas alheias? Fiz juízos temerários? Fingi doenças, pobreza, piedade para enganar os outros? Dei ouvido a conversas contra a vida alheia? Revelei, sem motivo justo, defeitos graves de outras pessoas? Falei ou pensei mal dos outros? Caluniei alguém? Espalhei boatos ou notícias falsas, nas redes sociais ou em conversas, sem verificar se eram verdadeiros? Bajulei alguém para conseguir vantagens, ou aplaudi o mal que ele fazia? Gabei-me ou exagerei as minhas qualidades para ser admirado? Deixei de reparar o mal causado pelas minhas mentiras, calúnias ou indiscrições, quando era possível?']]},
{k:'Igreja',t:'Mandamentos da Igreja',s:'',g:[[null,'Fiquei mais de um ano sem confessar meus pecados? Não fiz a comunhão pascal? Não guardei jejum e abstinência na Quarta-feira de Cinzas e na Sexta-feira Santa? Não guardei abstinência de carne nas sextas-feiras do ano? Não comutei a abstinência de carne das sextas-feiras em orações, obras de caridade ou outra forma de penitência? Deixei de ajudar a Igreja em suas necessidades, conforme as minhas possibilidades?']]},
{k:'Capitais',t:'Pecados capitais',s:'Avalie sua consciência sobre os seguintes pecados',g:[[null,['Soberba, orgulho: desprezar os demais, tratá-los com desdém; querer dominar.','Avareza: pensar somente em ganhar dinheiro e acumular fortuna, sem nada gastar com os pobres, ou para fins de piedade e caridade.','Impureza: procurar prazeres que mancham a alma e roubam a inocência.','Ira: ficar facilmente com raiva, impacientar-se. Deixar-se levar pelo ímpeto da cólera.','Gula: exceder-se na comida ou na bebida. Embriagar-se.','Inveja: não querer que outros estejam bem; entristecer-se com o bem-estar do próximo, empregar meios para impedir, diminuir ou destruir a felicidade do próximo.','Preguiça: perder tempo; não cumprir, por indolência, as obrigações do trabalho ou da religião.']]]}
  ];

  /**
   * Perguntas de matéria grave. Para haver pecado mortal, além da matéria grave são
   * necessários pleno conhecimento e deliberado consentimento (CIC 1857–1859).
   */
  C.MATERIA_GRAVE = [
    '0-0-0', '0-0-3', '0-0-13', '0-0-4', '0-0-7', '0-0-8', '0-0-10', '1-0-0', '1-0-1',
    '1-0-2', '1-0-3', '1-0-6', '2-0-0', '4-0-0', '4-0-5', '4-0-6', '4-0-8',
    '4-0-10', '4-0-11', '5-0-0', '5-0-3', '5-0-4', '5-0-5', '5-1-0', '5-1-1',
    '7-0-2', '5-0-7', '5-0-8', '5-1-5',
  ];

  /** Parágrafo do Catecismo da Igreja Católica que fundamenta cada pergunta. */
  C.CATECISMO = {
    '0-0-0': '2089', '0-0-1': '2088', '0-0-2': '2088', '0-0-3': '2117', '0-0-4': '2089', '0-0-5': '2471',
    '0-0-6': '2090', '0-0-7': '2116', '0-0-8': '2116', '0-0-9': '2111', '0-0-10': '2091', '0-0-11': '2092',
    '0-0-12': '2697', '0-0-13': '2148', '0-0-14': '2729', '0-0-15': '2088', '1-0-0': '2120', '1-0-1': '2148',
    '1-0-2': '1385', '1-0-3': '1456', '1-0-4': '1387', '1-0-5': '2154', '1-0-6': '2152', '1-0-7': '2146',
    '1-0-8': '2147', '1-0-9': '2094', '2-0-0': '2181', '2-0-2': '2185', '2-0-3': '2186', '3-0-0': '2215',
    '3-0-1': '2215', '3-0-2': '2217', '3-0-3': '2217', '3-0-4': '2218', '3-0-5': '2215', '3-0-6': '2218',
    '3-1-0': '2219', '3-1-1': '2238', '3-1-2': '2240', '3-2-0': '1250', '3-2-1': '2221', '3-2-2': '2226',
    '3-2-3': '2223', '3-2-4': '2223', '3-2-5': '2223', '3-2-6': '2223', '4-0-0': '2303', '4-0-1': '2303',
    '4-0-2': '2302', '4-0-3': '2447', '4-0-4': '2290', '4-0-5': '2291', '4-0-6': '2290', '4-0-7': '2282',
    '4-0-8': '2272', '4-0-9': '2271', '4-0-10': '2271', '4-0-11': '2277', '4-0-12': '2284', '4-0-15': '2843',
    '4-0-16': '2302', '4-0-18': '2264', '5-0-0': '2520', '5-0-1': '2520', '5-0-2': '2521', '5-0-3': '2354',
    '5-0-4': '2352', '5-0-5': '2390', '5-0-6': '2522', '5-1-0': '2380', '5-1-1': '2370', '5-1-2': '2370',
    '5-1-3': '2364', '5-1-4': '2384', '6-0-0': '2408', '6-0-1': '2536', '6-0-2': '2408', '6-0-3': '2410',
    '6-0-4': '2410', '6-0-5': '2434', '6-0-6': '2409', '6-0-7': '2413', '6-0-8': '2409', '6-0-9': '2409',
    '6-0-10': '2409', '6-0-11': '2409', '6-0-12': '2409', '6-0-13': '2409', '6-0-15': '2418', '6-0-16': '2415',
    '7-0-0': '2483', '7-0-1': '2491', '7-0-2': '2476', '7-0-3': '2478', '7-0-4': '2492', '7-0-5': '2477',
    '7-0-6': '2468', '7-0-7': '2477', '7-0-8': '2477', '7-0-9': '2477', '7-0-10': '2477', '7-0-11': '2497',
    '7-0-12': '2480', '7-0-13': '2481', '7-0-14': '2487', '8-0-0': '2042', '8-0-1': '2042', '8-0-2': '2043',
    '8-0-3': '2043', '8-0-4': '2043', '8-0-5': '2043', '9-0-0': '1866', '9-0-1': '2536', '9-0-2': '2351',
    '9-0-3': '2302', '9-0-4': '1866', '9-0-5': '2539', '9-0-6': '2094',
    '4-0-19': '1868', '4-0-20': '1853', '5-0-7': '2355', '5-0-8': '2356', '5-1-5': '2377',
  };

  /** Versão da ordem das perguntas (vai junto do exame guardado). */
  C.VERSAO_PERGUNTAS = 2;

  /** Versão 1 → 2: id antigo → id novo. */
  C.IDS_ANTERIORES = {
    '0-0-0': '0-0-0', '0-0-1': '0-0-1', '0-0-2': '0-0-2', '0-0-3': '0-0-3', '0-0-4': '0-0-4', '0-0-5': '0-0-6',
    '0-0-6': '0-0-7', '0-0-7': '0-0-8', '0-0-8': '0-0-10', '0-0-9': '0-0-11', '0-0-10': '0-0-12', '0-0-11': '0-0-13',
    '0-0-12': '0-0-14', '4-0-14': '0-0-15', '1-0-0': '1-0-0', '1-0-1': '1-0-1', '1-0-2': '1-0-2', '1-0-3': '1-0-4',
    '1-0-4': '1-0-5', '1-0-5': '1-0-7', '1-0-6': '1-0-8', '1-0-7': '1-0-9', '2-0-0': '2-0-0', '2-0-1': '2-0-1',
    '2-0-2': '2-0-2', '3-0-0': '3-0-0', '3-0-1': '3-0-1', '3-0-2': '3-0-2', '3-0-3': '3-0-3', '3-0-4': '3-0-4',
    '3-0-5': '3-0-5', '3-0-6': '3-0-6', '3-1-0': '3-2-0', '3-1-1': '3-2-1', '3-1-2': '3-2-2', '3-1-3': '3-2-3',
    '3-1-4': '3-2-4', '3-1-5': '3-2-5', '3-1-6': '3-2-6', '4-0-0': '4-0-0', '4-0-1': '4-0-1', '4-0-2': '4-0-2',
    '4-0-3': '4-0-3', '4-0-4': '4-0-4', '4-0-5': '4-0-5', '4-0-6': '4-0-7', '4-0-7': '4-0-8', '4-0-8': '4-0-9',
    '4-0-9': '4-0-10', '4-0-10': '4-0-12', '4-0-11': '4-0-13', '4-0-12': '4-0-14', '4-0-15': '4-0-15', '4-0-16': '4-0-16',
    '4-0-17': '4-0-17', '4-0-18': '4-0-18', '5-0-0': '5-0-0', '5-0-1': '5-0-1', '5-0-2': '5-0-2', '5-0-3': '5-0-3',
    '5-0-4': '5-0-4', '5-0-5': '5-0-6', '5-1-0': '5-1-0', '5-1-1': '5-1-1', '5-1-2': '5-1-2', '6-0-0': '6-0-0',
    '6-0-1': '6-0-1', '6-0-2': '6-0-2', '6-0-3': '6-0-3', '6-0-4': '6-0-4', '6-0-5': '6-0-5', '6-0-6': '6-0-6',
    '6-0-7': '6-0-7', '6-0-8': '6-0-8', '6-0-9': '6-0-9', '6-0-10': '6-0-10', '6-0-11': '6-0-11', '7-0-11': '6-0-12',
    '7-0-12': '6-0-13', '4-0-13': '6-0-15', '7-0-0': '7-0-0', '7-0-1': '7-0-1', '7-0-2': '7-0-2', '7-0-3': '7-0-3',
    '7-0-4': '7-0-4', '7-0-5': '7-0-5', '7-0-6': '7-0-6', '7-0-7': '7-0-7', '7-0-8': '7-0-8', '7-0-9': '7-0-9',
    '7-0-10': '7-0-10', '8-0-0': '8-0-0', '8-0-1': '8-0-1', '8-0-2': '8-0-2', '8-0-3': '8-0-3', '8-0-4': '8-0-4',
    '9-0-0': '9-0-0', '9-0-1': '9-0-1', '9-0-2': '9-0-2', '9-0-3': '9-0-3', '9-0-4': '9-0-4', '9-0-5': '9-0-5',
    '9-0-6': '9-0-6',
  };
})(globalThis.Confiteor = globalThis.Confiteor || {});
