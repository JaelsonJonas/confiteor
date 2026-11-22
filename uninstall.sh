#!/usr/bin/env bash
# Remove o Confiteor instalado para o usuário atual.
# Os seus dados ficam na mesma pasta do app e só são apagados se você confirmar:
#   exame-atual.json  exame guardado até a confissão (padrão: apagar)
#   confissoes.json   histórico de datas das confissões (padrão: manter)
set -euo pipefail

DATA="${XDG_DATA_HOME:-$HOME/.local/share}"
APPDIR="$DATA/confiteor"

# perguntar "texto" padrão(s|n): no terminal, lê a resposta; sem terminal, usa o padrão.
perguntar() {
  local resposta=""
  if [[ -t 0 ]]; then read -r -p "$1 " resposta || true; fi
  resposta="${resposta:-$2}"
  [[ "$resposta" =~ ^[sS] ]]
}

# Arquivos do app
rm -f  "$APPDIR/confiteor.html" "$APPDIR/confiteor.py" "$APPDIR/confiteor.svg" "$APPDIR/confiteor-512.png"
rm -rf "$APPDIR/css" "$APPDIR/js"
rm -f  "$HOME/.local/bin/confiteor"
rm -f  "$DATA/applications/confiteor.desktop"
rm -f  "$DATA/icons/hicolor/scalable/apps/confiteor.svg" \
       "$DATA/icons/hicolor/512x512/apps/confiteor.png"
command -v gtk-update-icon-cache >/dev/null && gtk-update-icon-cache -q -t "$DATA/icons/hicolor" 2>/dev/null || true
command -v update-desktop-database >/dev/null && update-desktop-database "$DATA/applications" 2>/dev/null || true

# Seus dados
if [[ -f "$APPDIR/exame-atual.json" ]]; then
  if perguntar "Há um exame guardado (com as suas respostas). Apagar também? [S/n]" s; then
    rm -f "$APPDIR/exame-atual.json"
    echo "Exame guardado apagado."
  fi
fi
if [[ -f "$APPDIR/confissoes.json" ]]; then
  if perguntar "Apagar também o histórico de datas das confissões? [s/N]" n; then
    rm -f "$APPDIR/confissoes.json"
    echo "Histórico de datas apagado."
  fi
fi
rm -f "$APPDIR"/.exame-atual.json.* "$APPDIR"/.confissoes.json.* 2>/dev/null || true

if rmdir "$APPDIR" 2>/dev/null; then
  echo "Confiteor removido."
else
  echo "Confiteor removido. Seus dados foram mantidos em: $APPDIR"
fi
