#!/bin/bash
# ==========================================================================
# Gera DOMUS.app (aplicativo nativo do macOS) + DOMUS.dmg (imagem de Mac),
# a partir do logo do projeto e do launcher scripts/DOMUS.command.
#
# Uso:  bash scripts/build-macos-app.sh
# Saída: dist/DOMUS.app  e  dist/DOMUS.dmg
# Requer apenas ferramentas nativas do macOS (sips, iconutil, hdiutil).
#
# O app é um wrapper: ao abrir, executa o launcher, que sobe o hub local
# (API + Web em produção) e abre o DOMUS em janela de app. 100% no PC.
# ==========================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
APP="$DIST/DOMUS.app"
DMG="$DIST/DOMUS.dmg"
SRC_ICON="$ROOT/apps/web/public/icon-512.png"
LAUNCHER="$ROOT/scripts/DOMUS.command"
ICONSET="$DIST/DOMUS.iconset"

rm -rf "$APP" "$DMG" "$ICONSET"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources" "$ICONSET"

echo "→ ícone (.icns) a partir de $SRC_ICON"
for s in 16 32 128 256 512; do
  sips -z "$s" "$s"             "$SRC_ICON" --out "$ICONSET/icon_${s}x${s}.png"    >/dev/null
  sips -z "$((s*2))" "$((s*2))" "$SRC_ICON" --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/DOMUS.icns"
rm -rf "$ICONSET"

echo "→ Info.plist"
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>DOMUS</string>
  <key>CFBundleDisplayName</key><string>DOMUS</string>
  <key>CFBundleIdentifier</key><string>com.tcc.domus</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>DOMUS</string>
  <key>CFBundleIconFile</key><string>DOMUS</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

echo "→ executável (chama o launcher do projeto)"
cat > "$APP/Contents/MacOS/DOMUS" <<EXE
#!/bin/bash
exec "$LAUNCHER"
EXE
chmod +x "$APP/Contents/MacOS/DOMUS"

# App local, sem assinatura — remove quarentena p/ o Gatekeeper não bloquear.
xattr -cr "$APP" 2>/dev/null || true

echo "→ DOMUS.dmg (imagem de Mac)"
hdiutil create -volname "DOMUS" -srcfolder "$APP" -ov -format UDZO "$DMG" >/dev/null

echo ""
echo "OK:"
echo "  app : $APP"
echo "  dmg : $DMG"
echo ""
echo "Instalar: arraste DOMUS.app para /Applications (ou abra o .dmg)."
