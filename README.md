# Confiteor

Um **exame de consciência católico** para Linux, em formato de formulário passo a passo: uma pergunta por tela, com exemplos didáticos, e no final um texto pronto para levar à confissão.

Funciona **100% offline** e **não salva nada**: ao fechar a janela, todas as respostas se apagam.

<p align="center">
  <img src="docs/1-boas-vindas.png" width="240" alt="Tela de boas-vindas">
  <img src="docs/2-mandamento.png" width="240" alt="Abertura do 1º mandamento">
  <img src="docs/3-pergunta.png" width="240" alt="Pergunta com exemplos">
</p>

## O que ele faz

- **Começa por três perguntas**: estado de vida, filhos e última confissão. Assim o exame mostra só o que vale para você, e o texto final já começa com o tempo desde a última confissão, calculado a partir da data.
- **Segue os 10 mandamentos, os mandamentos da Igreja e os pecados capitais**, num total de 103 perguntas, todas escritas como uma falta: marcar **Pequei** quer dizer "sim, cometi isso".
- **Tem exemplos em cada pergunta** ("Ver exemplos"), com observações que ajudam a evitar escrúpulos, como explicar que distrações involuntárias não são pecado.
- **Ao marcar Pequei**, você pode anotar quantas vezes, uma observação e se esqueceu de confessar isso na última confissão.
- **O resumo final** traz:
  - um **texto para a confissão** editável, ordenado dos pontos mais graves para os mais leves;
  - uma lista por mandamento;
  - o **ato de contrição**, em duas versões.
- **Atalhos de teclado**: `P`/`N` respondem, `E` abre os exemplos, `Enter` continua, `←` volta e `Esc` fecha os menus.
- **Tema claro e escuro**, que segue o sistema.

## Privacidade

O Confiteor foi feito para que **nada do seu exame fique registrado**:

- não grava arquivos, não usa `localStorage`, cookies nem cache em disco (a sessão do WebKit é efêmera);
- não acessa a internet, e qualquer navegação para fora do app é bloqueada;
- tudo fica na memória e some ao fechar a janela;
- o botão "Copiar texto" só copia para a área de transferência quando você clica nele.

## Instalação

### 1. Dependências

O app usa Python 3 e WebKitGTK, que já vêm instalados em muitas distribuições com GNOME. Se faltar algo:

```bash
# Ubuntu / Debian / Mint / Pop!_OS
sudo apt install python3-gi gir1.2-webkit2-4.1

# Fedora
sudo dnf install python3-gobject webkit2gtk4.1

# Arch / Manjaro
sudo pacman -S python-gobject webkit2gtk-4.1
```

Se o WebKitGTK não estiver disponível, o comando `confiteor` abre o app no Chromium, Chrome ou Brave em modo aplicativo, com um perfil temporário que é apagado ao fechar. Em último caso, abre no navegador padrão.

### 2. Instalar

```bash
git clone https://github.com/JaelsonJonas/confiteor.git
cd confiteor
./install.sh
```

A instalação é **só para o seu usuário** e não precisa de `sudo`. Ela cria:

| Caminho | Conteúdo |
|---|---|
| `~/.local/share/confiteor/` | o app (`confiteor.html`, `confiteor.py`, ícones) |
| `~/.local/bin/confiteor` | o comando de terminal |
| `~/.local/share/applications/confiteor.desktop` | o atalho no menu de aplicativos |
| `~/.local/share/icons/hicolor/…/confiteor.*` | o ícone (SVG e PNG 512) |

## Como usar

- **Pelo menu**: aperte a tecla Super e procure por **Confiteor**.
- **Pelo terminal**: `confiteor`
- **Sem instalar**: abra o arquivo `confiteor.html` em qualquer navegador. Funciona offline, em qualquer sistema operacional.

## Atualizar ou remover

```bash
cd confiteor
git pull && ./install.sh   # atualizar
./uninstall.sh             # remover
```

## Estrutura do projeto

```
confiteor.html          # estrutura da página (abre direto no navegador, sem servidor)
css/app.css             # visual: cores, telas, temas claro e escuro
js/dados/perguntas.js   # as 103 perguntas, por seção
js/dados/exemplos.js    # exemplos e observações de cada pergunta
js/dados/oracoes.js     # atos de contrição
js/logica.js            # regras sem interface: texto da confissão, tempo desde a data, telas
js/app.js               # interface: telas, navegação, teclado, copiar
tests/                  # testes automatizados (node --test)
confiteor.py            # janela nativa (GTK + WebKitGTK) com sessão efêmera
install.sh, uninstall.sh
```

Não há etapa de build nem dependências: são scripts comuns carregados em ordem pelo `confiteor.html`.

### Como contribuir

- **Corrigir uma pergunta ou um exemplo**: edite `js/dados/perguntas.js` ou `js/dados/exemplos.js`. O id de cada pergunta é `seção-grupo-pergunta` (ex.: `0-0-5`) e liga a pergunta aos exemplos.
- **Mudar a ordem ou as frases do texto da confissão**: edite `js/logica.js` (`MATERIA_GRAVE`, `FRASES_CAPITAIS`, `JUNCOES`).
- **Rodar os testes** (precisa só do Node.js 20 ou mais recente):

  ```bash
  node --test tests/
  ```

  Os testes conferem os dados (por exemplo, se toda pergunta tem exemplos) e as regras (ordem do texto, data relativa, perguntas que dependem do perfil). Eles também rodam automaticamente no GitHub a cada push e pull request.

## Aviso

O Confiteor é uma ajuda para a preparação pessoal e **não substitui a orientação de um sacerdote**. Os exemplos e as observações têm fins didáticos. Em caso de dúvida sobre a gravidade de um pecado ou sobre a forma de se confessar, converse com um padre.

## Licença

[MIT](LICENSE)
