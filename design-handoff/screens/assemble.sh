#!/bin/bash
# usage: assemble.sh <name> <title>  — .tmp-<name>.body.html + _app.css → <name>.html
set -euo pipefail
cd "$(dirname "$0")"
name="$1"; title="$2"
{
  printf '<!doctype html>\n<html lang="ja">\n<head>\n<meta charset="UTF-8" />\n'
  printf '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />\n'
  printf '<title>%s | スイムランク モックアップ</title>\n<style>\n' "$title"
  cat _app.css
  printf '</style>\n</head>\n<body>\n'
  cat ".tmp-$name.body.html"
  printf '\n</body>\n</html>\n'
} > "$name.html"
rm ".tmp-$name.body.html"
echo "built $name.html ($(wc -c < "$name.html") bytes)"
