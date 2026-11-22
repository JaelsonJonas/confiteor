#!/usr/bin/env python3
"""Confiteor — janela nativa (WebKitGTK) para o exame de consciência.

Privacidade:
  * sessão WebKit efêmera: nada de cookies, cache, localStorage ou IndexedDB em disco;
  * só carrega o arquivo local; qualquer navegação para fora é bloqueada;
  * sem logs: o script não escreve nada em disco.
Ao fechar a janela, tudo o que foi marcado some da memória.
"""
import os
import sys

import gi

try:
    gi.require_version("Gtk", "3.0")
    gi.require_version("WebKit2", "4.1")
except ValueError:
    gi.require_version("Gtk", "3.0")
    gi.require_version("WebKit2", "4.0")
from gi.repository import GLib, Gtk, WebKit2  # noqa: E402

APP_ID = "confiteor"
HERE = os.path.dirname(os.path.realpath(__file__))
HTML = os.path.join(HERE, "confiteor.html")
ICON = os.path.join(HERE, "confiteor.svg")
ICON_PNG = os.path.join(HERE, "confiteor-512.png")


def main() -> int:
    if not os.path.isfile(HTML):
        print(f"confiteor: arquivo não encontrado: {HTML}", file=sys.stderr)
        return 1

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
    s.set_javascript_can_access_clipboard(True)  # botão "copiar lista"
    s.set_allow_file_access_from_file_urls(False)
    s.set_allow_universal_access_from_file_urls(False)

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
