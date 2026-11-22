#!/usr/bin/env bash
# Remove o Confiteor instalado para o usuário atual.
set -euo pipefail

DATA="${XDG_DATA_HOME:-$HOME/.local/share}"
rm -rf  "$DATA/confiteor"
rm -f   "$HOME/.local/bin/confiteor"
rm -f   "$DATA/applications/confiteor.desktop"
rm -f   "$DATA/icons/hicolor/scalable/apps/confiteor.svg" \
        "$DATA/icons/hicolor/512x512/apps/confiteor.png"
command -v gtk-update-icon-cache >/dev/null && gtk-update-icon-cache -q -t "$DATA/icons/hicolor" 2>/dev/null || true
command -v update-desktop-database >/dev/null && update-desktop-database "$DATA/applications" 2>/dev/null || true
echo "Confiteor removido."
