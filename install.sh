#!/usr/bin/env bash
# Instala o Confiteor só para o usuário atual (sem sudo).
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA="${XDG_DATA_HOME:-$HOME/.local/share}"
APPDIR="$DATA/confiteor"
BIN="$HOME/.local/bin"
DESKTOP_DIR="$DATA/applications"

ICONS="$DATA/icons/hicolor"

for f in confiteor.html confiteor.py confiteor.svg confiteor-512.png css/app.css \
         js/app.js js/logica.js js/dados/perguntas.js js/dados/exemplos.js js/dados/oracoes.js; do
  [[ -f "$SRC/$f" ]] || { echo "Arquivo ausente: $SRC/$f" >&2; exit 1; }
done

mkdir -p "$APPDIR" "$BIN" "$DESKTOP_DIR" "$ICONS/scalable/apps" "$ICONS/512x512/apps"
install -m 644 "$SRC/confiteor.html"    "$APPDIR/confiteor.html"
install -m 755 "$SRC/confiteor.py"      "$APPDIR/confiteor.py"
install -m 644 "$SRC/confiteor.svg"     "$APPDIR/confiteor.svg"
install -m 644 "$SRC/confiteor-512.png" "$APPDIR/confiteor-512.png"
# css/ e js/ são copiadas inteiras; a cópia anterior é removida para não sobrar arquivo antigo.
# Os seus dados (exame-atual.json, confissoes.json) ficam na mesma pasta e não são tocados.
rm -rf "$APPDIR/css" "$APPDIR/js"
cp -r "$SRC/css" "$SRC/js" "$APPDIR/"
# Tema de ícones do usuário: SVG preferido, PNG 512 como alternativa
install -m 644 "$SRC/confiteor.svg"     "$ICONS/scalable/apps/confiteor.svg"
install -m 644 "$SRC/confiteor-512.png" "$ICONS/512x512/apps/confiteor.png"

# Comando de terminal: WebKitGTK > navegador Chromium em modo app > xdg-open
cat > "$BIN/confiteor" <<'EOF'
#!/usr/bin/env bash
APPDIR="${XDG_DATA_HOME:-$HOME/.local/share}/confiteor"
HTML="$APPDIR/confiteor.html"

# a) janela nativa WebKitGTK
if python3 -c 'import gi; gi.require_version("Gtk","3.0"); gi.require_version("WebKit2","4.1")' 2>/dev/null \
   || python3 -c 'import gi; gi.require_version("Gtk","3.0"); gi.require_version("WebKit2","4.0")' 2>/dev/null; then
  exec python3 "$APPDIR/confiteor.py" "$@"
fi

# b) navegador baseado em Chromium em modo --app, com perfil temporário apagado ao sair
for b in chromium chromium-browser google-chrome google-chrome-stable brave-browser brave; do
  if command -v "$b" >/dev/null 2>&1; then
    PROFILE="$(mktemp -d "${XDG_RUNTIME_DIR:-/tmp}/confiteor.XXXXXX")"
    trap 'rm -rf "$PROFILE"' EXIT
    "$b" --user-data-dir="$PROFILE" --no-first-run --no-default-browser-check \
         --disable-sync --disable-extensions --window-size=480,820 \
         --app="file://$HTML" >/dev/null 2>&1
    exit $?
  fi
done

# c) último recurso
exec xdg-open "$HTML"
EOF
chmod 755 "$BIN/confiteor"

cat > "$DESKTOP_DIR/confiteor.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Confiteor
Comment=Exame de consciência
Exec=$BIN/confiteor
Icon=confiteor
Terminal=false
Categories=Utility;
StartupWMClass=confiteor
StartupNotify=true
EOF
chmod 644 "$DESKTOP_DIR/confiteor.desktop"

command -v update-desktop-database >/dev/null && update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
touch "$ICONS"
command -v gtk-update-icon-cache >/dev/null && gtk-update-icon-cache -q -t "$ICONS" 2>/dev/null || true

echo "Confiteor instalado."
echo "  Menu:     procure por \"Confiteor\" nos aplicativos"
echo "  Terminal: confiteor"
case ":$PATH:" in *":$BIN:"*) ;; *) echo "  Aviso: $BIN não está no PATH; use $BIN/confiteor";; esac
