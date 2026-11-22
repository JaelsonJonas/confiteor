#!/usr/bin/env python3
"""Confiteor — janela nativa (WebKitGTK) para o exame de consciência.

Privacidade:
  * sessão WebKit efêmera: nada de cookies, cache, localStorage ou IndexedDB em disco;
  * só carrega o arquivo local; qualquer navegação para fora é bloqueada; nada vai para a internet;
  * sem logs.

O que pode ser gravado, sempre por ação da pessoa e sempre com permissão 600:
  * o PDF, onde a pessoa escolher na janela "Salvar como";
  * ~/.local/share/confiteor/exame-atual.json: o exame em andamento, salvo ao gerar o PDF,
    para não se perder até a confissão. É apagado no botão "Pecados confessados";
  * ~/.local/share/confiteor/confissoes.json: SOMENTE a lista de datas das confissões.

A página não tem acesso ao disco: ela envia pedidos (gerarPdf, confessado) por um
message handler do WebKit, e este script valida cada um antes de agir.
"""
import datetime
import json
import os
import re
import sys
import tempfile
from pathlib import Path

APP_ID = "confiteor"
HERE = os.path.dirname(os.path.realpath(__file__))
HTML = os.path.join(HERE, "confiteor.html")
ICON = os.path.join(HERE, "confiteor.svg")
ICON_PNG = os.path.join(HERE, "confiteor-512.png")

LIMITE_EXAME = 1_000_000      # bytes; um exame real tem poucos KB
LIMITE_HTML_PDF = 2_000_000


# ---------- Arquivos locais (sem GTK: testáveis com unittest) ----------

def pasta_dados() -> Path:
    base = os.environ.get("XDG_DATA_HOME") or os.path.join(os.path.expanduser("~"), ".local", "share")
    return Path(base) / APP_ID


def _gravar_privado(caminho: Path, texto: str) -> None:
    """Escrita atômica, legível só pelo usuário (600)."""
    caminho.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=caminho.parent, prefix=f".{caminho.name}.")
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(texto)
        os.replace(tmp, caminho)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise


def data_iso_valida(texto, hoje=None) -> bool:
    """Aceita só uma data real AAAA-MM-DD, de 1900 até hoje."""
    if not isinstance(texto, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", texto):
        return False
    try:
        data = datetime.date.fromisoformat(texto)
    except ValueError:
        return False
    return data.year >= 1900 and data <= (hoje or datetime.date.today())


def ler_confissoes(pasta=None) -> list:
    """Datas das confissões registradas (AAAA-MM-DD), em ordem, sem repetição."""
    try:
        dados = json.loads(((pasta or pasta_dados()) / "confissoes.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    if not isinstance(dados, list):
        return []
    return sorted({d for d in dados if data_iso_valida(d)})


def registrar_confissao(data_iso, pasta=None) -> list:
    """Acrescenta uma data ao histórico. O arquivo guarda só a lista de datas."""
    if not data_iso_valida(data_iso):
        raise ValueError("data inválida")
    datas = sorted(set(ler_confissoes(pasta)) | {data_iso})
    _gravar_privado((pasta or pasta_dados()) / "confissoes.json", json.dumps(datas) + "\n")
    return datas


def ler_exame(pasta=None):
    caminho = (pasta or pasta_dados()) / "exame-atual.json"
    try:
        if caminho.stat().st_size > LIMITE_EXAME:
            return None
        dados = json.loads(caminho.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return dados if isinstance(dados, dict) else None


def salvar_exame(dados, pasta=None) -> bool:
    if not isinstance(dados, dict):
        return False
    texto = json.dumps(dados, ensure_ascii=False)
    if len(texto.encode("utf-8")) > LIMITE_EXAME:
        return False
    _gravar_privado((pasta or pasta_dados()) / "exame-atual.json", texto + "\n")
    return True


def apagar_exame(pasta=None) -> None:
    ((pasta or pasta_dados()) / "exame-atual.json").unlink(missing_ok=True)


def apagar_pdf(caminho) -> bool:
    """Apaga o PDF exportado pelo app (o caminho vem do exame salvo, nunca da página)."""
    if not isinstance(caminho, str) or not caminho:
        return False
    alvo = Path(caminho)
    if alvo.suffix.lower() != ".pdf" or not alvo.is_file():
        return False
    alvo.unlink()
    return True


def nome_pdf_seguro(nome) -> str:
    if isinstance(nome, str) and re.fullmatch(r"[\w.-]{1,80}\.pdf", nome):
        return nome
    return f"exame-de-consciencia-{datetime.date.today().isoformat()}.pdf"


def pdf_conhecido(escolhido=None, pasta=None):
    """PDF que o app conhece: o escolhido em "Ver PDF" (só na memória) ou o gerado (exame salvo)."""
    for caminho in (escolhido, (ler_exame(pasta) or {}).get("pdf")):
        if isinstance(caminho, str) and caminho.lower().endswith(".pdf") and os.path.isfile(caminho):
            return caminho
    return None


def confessado(apagar_o_pdf, hoje=None, pasta=None, pdf_escolhido=None) -> dict:
    """Botão "Pecados confessados": apaga o exame salvo (e o PDF, se pedido) e registra só a data."""
    pdf = pdf_conhecido(pdf_escolhido, pasta)
    apagar_exame(pasta)
    pdf_apagado = bool(apagar_o_pdf) and apagar_pdf(pdf)
    datas = registrar_confissao((hoje or datetime.date.today()).isoformat(), pasta)
    return {"ok": True, "confissoes": datas, "pdfApagado": pdf_apagado}


# ---------- Janela ----------

def _carregar_gi():
    import gi
    try:
        gi.require_version("Gtk", "3.0")
        gi.require_version("WebKit2", "4.1")
    except ValueError:
        gi.require_version("Gtk", "3.0")
        gi.require_version("WebKit2", "4.0")
    from gi.repository import GLib, Gtk, WebKit2
    return GLib, Gtk, WebKit2


def main() -> int:
    if not os.path.isfile(HTML):
        print(f"confiteor: arquivo não encontrado: {HTML}", file=sys.stderr)
        return 1

    GLib, Gtk, WebKit2 = _carregar_gi()
    GLib.set_prgname(APP_ID)        # app_id no Wayland / WM_CLASS no X11
    GLib.set_application_name("Confiteor")

    # Contexto efêmero: todos os dados do site ficam só na memória.
    ctx = WebKit2.WebContext.new_ephemeral()
    ctx.set_cache_model(WebKit2.CacheModel.DOCUMENT_VIEWER)
    ctx.set_spell_checking_enabled(False)

    view = WebKit2.WebView.new_with_context(ctx)
    s = view.get_settings()
    s.set_enable_developer_extras(False)
    s.set_enable_page_cache(False)
    s.set_enable_html5_local_storage(False)
    s.set_enable_html5_database(False)
    s.set_javascript_can_open_windows_automatically(False)
    s.set_javascript_can_access_clipboard(True)  # botão "copiar"
    s.set_allow_file_access_from_file_urls(False)
    s.set_allow_universal_access_from_file_urls(False)

    win = Gtk.Window(title="Confiteor")
    vivos = set()  # mantém vivos os objetos de impressão até terminarem

    def responder(id_pedido, resultado):
        view.evaluate_javascript(
            "globalThis.Confiteor && Confiteor.hostResposta(%d, %s);" % (id_pedido, json.dumps(resultado)),
            -1, None, None, None, None, None)

    def escolher_destino(nome):
        # Gancho para testes automatizados: pula a janela "Salvar como".
        destino = os.environ.get("CONFITEOR_PDF_DESTINO")
        if destino:
            return destino
        dlg = Gtk.FileChooserNative.new("Salvar exame em PDF", win, Gtk.FileChooserAction.SAVE, "_Salvar", "_Cancelar")
        dlg.set_current_name(nome)
        dlg.set_do_overwrite_confirmation(True)
        documentos = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOCUMENTS)
        if documentos and os.path.isdir(documentos):
            dlg.set_current_folder(documentos)
        filtro = Gtk.FileFilter()
        filtro.set_name("PDF")
        filtro.add_pattern("*.pdf")
        dlg.add_filter(filtro)
        caminho = dlg.get_filename() if dlg.run() == Gtk.ResponseType.ACCEPT else None
        dlg.destroy()
        if caminho and not caminho.lower().endswith(".pdf"):
            caminho += ".pdf"
        return caminho

    def imprimir_pdf(html, destino, ao_terminar):
        """Renderiza o HTML numa visão separada (sem JavaScript, sem rede) e imprime para PDF A4."""
        pdf_view = WebKit2.WebView.new_with_context(WebKit2.WebContext.new_ephemeral())
        config_view = pdf_view.get_settings()
        config_view.set_enable_javascript(False)
        # Janela fora da tela não tem OpenGL: renderização por software só nesta visão.
        config_view.set_hardware_acceleration_policy(WebKit2.HardwareAccelerationPolicy.NEVER)
        def politica(_v, decisao, tipo):
            # Só o próprio documento (about:blank); qualquer outra navegação é bloqueada.
            if tipo == WebKit2.PolicyDecisionType.RESPONSE:
                return False
            if decisao.get_navigation_action().get_request().get_uri() == "about:blank":
                return False
            decisao.ignore()
            return True

        pdf_view.connect("decide-policy", politica)
        janela = Gtk.OffscreenWindow()
        janela.add(pdf_view)
        janela.show_all()
        estado = {"janela": janela, "view": pdf_view}
        vivos.add(id(estado))

        def fim(ok, erro=None):
            vivos.discard(id(estado))
            janela.destroy()
            ao_terminar(ok, erro)

        def carregou(v, evento):
            if evento != WebKit2.LoadEvent.FINISHED:
                return
            op = WebKit2.PrintOperation.new(v)
            config = Gtk.PrintSettings()
            config.set_printer("Print to File")
            config.set(Gtk.PRINT_SETTINGS_OUTPUT_FILE_FORMAT, "pdf")
            config.set(Gtk.PRINT_SETTINGS_OUTPUT_URI, GLib.filename_to_uri(destino, None))
            pagina = Gtk.PageSetup()
            pagina.set_paper_size(Gtk.PaperSize.new(Gtk.PAPER_NAME_A4))
            for lado in ("top", "bottom", "left", "right"):
                getattr(pagina, f"set_{lado}_margin")(20, Gtk.Unit.MM)
            op.set_print_settings(config)
            op.set_page_setup(pagina)
            estado["op"] = op
            op.connect("finished", lambda *_: fim(True))
            op.connect("failed", lambda _o, e: fim(False, str(e)))
            op.print_()

        pdf_view.connect("load-changed", carregou)
        pdf_view.load_html(html, None)

    def gerar_pdf(id_pedido, pedido):
        html, exame = pedido.get("html"), pedido.get("exame")
        if not isinstance(html, str) or len(html) > LIMITE_HTML_PDF or not isinstance(exame, dict):
            return responder(id_pedido, {"ok": False, "erro": "pedido inválido"})
        destino = escolher_destino(nome_pdf_seguro(pedido.get("nome")))
        if not destino:
            return responder(id_pedido, {"ok": False, "cancelado": True})

        def terminou(ok, erro):
            if not ok:
                return responder(id_pedido, {"ok": False, "erro": erro or "falha ao gerar o PDF"})
            os.chmod(destino, 0o600)
            memoria["pdf"] = None  # o PDF recém-gerado passa a ser o do exame salvo
            salvar_exame({**exame, "pdf": destino})
            responder(id_pedido, {"ok": True, "caminho": destino})

        imprimir_pdf(html, destino, terminou)

    memoria = {"pdf": None}  # PDF escolhido em "Ver PDF": lembrado só até a confissão (nunca gravado)

    def escolher_pdf_existente():
        # Gancho para testes automatizados: pula a janela de escolha.
        caminho = os.environ.get("CONFITEOR_PDF_ABRIR")
        if caminho:
            return caminho
        dlg = Gtk.FileChooserNative.new("Escolha o PDF do exame", win, Gtk.FileChooserAction.OPEN, "_Abrir", "_Cancelar")
        downloads = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOWNLOAD)
        if downloads and os.path.isdir(downloads):
            dlg.set_current_folder(downloads)
        filtro = Gtk.FileFilter()
        filtro.set_name("PDF")
        filtro.add_pattern("*.pdf")
        filtro.add_mime_type("application/pdf")
        dlg.add_filter(filtro)
        caminho = dlg.get_filename() if dlg.run() == Gtk.ResponseType.ACCEPT else None
        dlg.destroy()
        return caminho

    def abrir_visualizador(caminho):
        """Janela própria com o visualizador de PDF do WebKit, sem rede e sem downloads."""
        contexto = WebKit2.WebContext.new_ephemeral()
        contexto.connect("download-started", lambda _c, download: download.cancel())
        pdf_view = WebKit2.WebView.new_with_context(contexto)
        config = pdf_view.get_settings()
        config.set_enable_developer_extras(False)
        config.set_javascript_can_open_windows_automatically(False)
        uri_pdf = GLib.filename_to_uri(caminho, None)

        def politica(_v, decisao, tipo):
            if tipo == WebKit2.PolicyDecisionType.RESPONSE:
                return False
            if decisao.get_navigation_action().get_request().get_uri().split("#", 1)[0] == uri_pdf:
                return False
            decisao.ignore()
            return True

        pdf_view.connect("decide-policy", politica)
        pdf_view.connect("context-menu", lambda *a: True)

        janela = Gtk.Window(title="Exame em PDF")
        janela.set_transient_for(win)
        janela.set_default_size(620, 820)
        topo = Gtk.HeaderBar(title="Exame em PDF", subtitle=os.path.basename(caminho), show_close_button=True)
        botao = Gtk.Button(label="Pecados confessados")
        botao.get_style_context().add_class("suggested-action")

        def confessar(_b):
            janela.destroy()
            view.evaluate_javascript("globalThis.Confiteor && Confiteor.marcarConfessado();",
                                     -1, None, None, None, None, None)

        botao.connect("clicked", confessar)
        topo.pack_end(botao)
        janela.set_titlebar(topo)
        janela.add(pdf_view)
        pdf_view.load_uri(uri_pdf)
        janela.show_all()

    def ver_pdf(id_pedido, pedido):
        caminho = None if pedido.get("escolher") is True else pdf_conhecido(memoria["pdf"])
        if not caminho:
            escolhido = escolher_pdf_existente()
            if not escolhido:
                return responder(id_pedido, {"ok": False, "cancelado": True})
            if not escolhido.lower().endswith(".pdf") or not os.path.isfile(escolhido):
                return responder(id_pedido, {"ok": False, "erro": "escolha um arquivo PDF"})
            memoria["pdf"] = caminho = escolhido
        abrir_visualizador(caminho)
        responder(id_pedido, {"ok": True, "caminho": caminho})

    def mensagem(_gerenciador, resultado):
        try:
            pedido = json.loads(resultado.get_js_value().to_string())
            id_pedido = int(pedido["id"])
        except (ValueError, TypeError, KeyError):
            return
        try:
            if pedido.get("acao") == "gerarPdf":
                gerar_pdf(id_pedido, pedido)
            elif pedido.get("acao") == "confessado":
                responder(id_pedido, confessado(pedido.get("apagarPdf") is True, pdf_escolhido=memoria["pdf"]))
                memoria["pdf"] = None
            elif pedido.get("acao") == "verPdf":
                ver_pdf(id_pedido, pedido)
            elif pedido.get("acao") == "apagarExame":   # botão "Apagar tudo"
                apagar_exame()
                responder(id_pedido, {"ok": True})
            else:
                responder(id_pedido, {"ok": False, "erro": "ação desconhecida"})
        except Exception as erro:  # nunca derruba a janela; a página mostra o erro
            responder(id_pedido, {"ok": False, "erro": str(erro)})

    # Ponte com a página: dados iniciais + canal de pedidos.
    conteudo = view.get_user_content_manager()
    inicial = {"confissoes": ler_confissoes(), "exame": ler_exame()}
    conteudo.add_script(WebKit2.UserScript.new(
        "globalThis.ConfiteorHost = Object.freeze(%s);" % json.dumps(inicial, ensure_ascii=False),
        WebKit2.UserContentInjectedFrames.TOP_FRAME,
        WebKit2.UserScriptInjectionTime.START,
        None, None,
    ))
    conteudo.register_script_message_handler(APP_ID)
    conteudo.connect(f"script-message-received::{APP_ID}", mensagem)

    page_uri = GLib.filename_to_uri(HTML, None)

    def on_decide(_view, decision, dtype):
        if dtype in (WebKit2.PolicyDecisionType.NAVIGATION_ACTION,
                     WebKit2.PolicyDecisionType.NEW_WINDOW_ACTION):
            uri = decision.get_navigation_action().get_request().get_uri()
            if uri.split("#", 1)[0] != page_uri:
                decision.ignore()
                return True
        return False

    view.connect("decide-policy", on_decide)
    # Sem menu de contexto (evita "Abrir link", "Inspecionar", "Salvar página" etc.).
    view.connect("context-menu", lambda *a: True)

    win.set_default_size(480, 820)
    win.set_icon_name(APP_ID)
    for icon in (ICON, ICON_PNG):
        if os.path.isfile(icon):
            try:
                win.set_icon_from_file(icon)
                break
            except GLib.Error:
                continue
    win.add(view)
    win.connect("destroy", Gtk.main_quit)

    view.load_uri(page_uri)
    win.show_all()
    Gtk.main()
    return 0


if __name__ == "__main__":
    sys.exit(main())
