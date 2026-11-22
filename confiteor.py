#!/usr/bin/env python3
"""Confiteor — janela nativa (WebKitGTK) para o exame de consciência.

Privacidade:
  * sessão WebKit efêmera: nada de cookies, cache, localStorage ou IndexedDB em disco;
  * só carrega o arquivo local; qualquer navegação para fora é bloqueada;
  * sem logs.
Ao fechar a janela, tudo o que foi marcado some da memória.

Única exceção, opcional e desligada por padrão: se a pessoa marcar
"Lembrar esta data neste computador", a DATA da última confissão (dd/mm/aaaa,
nada mais) é guardada em ~/.config/confiteor/ultima-confissao. A página não tem
acesso ao disco: ela só pode pedir a este script para salvar ou apagar essa data,
e qualquer outro conteúdo é recusado.
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


# ---------- Data da última confissão (único dado que pode ser salvo) ----------

def arquivo_data() -> Path:
    base = os.environ.get("XDG_CONFIG_HOME") or os.path.join(os.path.expanduser("~"), ".config")
    return Path(base) / APP_ID / "ultima-confissao"


def data_valida(texto, hoje=None) -> bool:
    """Aceita só uma data real dd/mm/aaaa, de 1900 até hoje."""
    if not isinstance(texto, str) or not re.fullmatch(r"\d{2}/\d{2}/\d{4}", texto):
        return False
    try:
        data = datetime.datetime.strptime(texto, "%d/%m/%Y").date()
    except ValueError:
        return False
    return 1900 <= data.year and data <= (hoje or datetime.date.today())


def ler_data(caminho=None):
    caminho = caminho or arquivo_data()
    try:
        texto = caminho.read_text(encoding="utf-8").strip()
    except OSError:
        return None
    return texto if data_valida(texto) else None


def salvar_data(texto, caminho=None) -> bool:
    if not data_valida(texto):
        return False
    caminho = caminho or arquivo_data()
    caminho.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    # Escrita atômica, legível só pelo usuário.
    fd, tmp = tempfile.mkstemp(dir=caminho.parent, prefix=".ultima-")
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(texto + "\n")
        os.replace(tmp, caminho)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise
    return True


def apagar_data(caminho=None) -> None:
    caminho = caminho or arquivo_data()
    caminho.unlink(missing_ok=True)
    try:
        caminho.parent.rmdir()  # remove a pasta se ficou vazia
    except OSError:
        pass


def tratar_mensagem(mensagem, caminho=None) -> bool:
    """Mensagem da página: {"acao": "salvar", "data": "dd/mm/aaaa"} ou {"acao": "apagar"}."""
    try:
        dados = json.loads(mensagem)
    except (TypeError, ValueError):
        return False
    if not isinstance(dados, dict):
        return False
    if dados.get("acao") == "salvar":
        return salvar_data(dados.get("data"), caminho)
    if dados.get("acao") == "apagar":
        apagar_data(caminho)
        return True
    return False


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

    # Ponte mínima com a página: informa a data salva (se houver) e recebe
    # pedidos de salvar/apagar essa data. Nada além disso.
    conteudo = view.get_user_content_manager()
    conteudo.add_script(WebKit2.UserScript.new(
        "globalThis.ConfiteorHost = Object.freeze({ dataSalva: %s });" % json.dumps(ler_data()),
        WebKit2.UserContentInjectedFrames.TOP_FRAME,
        WebKit2.UserScriptInjectionTime.START,
        None, None,
    ))
    conteudo.register_script_message_handler(APP_ID)
    conteudo.connect(f"script-message-received::{APP_ID}",
                     lambda _m, resultado: tratar_mensagem(resultado.get_js_value().to_string()))

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

    win = Gtk.Window(title="Confiteor")
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
