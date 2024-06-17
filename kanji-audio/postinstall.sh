#!/bin/sh
if ! [ -f kanjivg.zip ]; then
  curl "https://github.com/KanjiVG/kanjivg/releases/download/r20230110/kanjivg-20230110-main.zip" -Lo kanjivg.zip
fi