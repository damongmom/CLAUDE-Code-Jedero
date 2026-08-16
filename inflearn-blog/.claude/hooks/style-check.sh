#!/bin/bash
input=$(cat)
file=$(jq -r '.tool_input.file_path' <<< "$input")

# 마크다운 파일만 검사한다
[[ "$file" == *.md ]] || exit 0
[[ -f "$file" ]] || exit 0

problems=""
grep -q '—' "$file" && problems+="em dash 사용. "
grep -q '·'  "$file" && problems+="가운뎃점 사용. "

if [[ -n "$problems" ]]; then
  echo "문체 규칙 위반: $problems 고쳐서 다시 저장해라." >&2
  exit 2
fi
exit 0
