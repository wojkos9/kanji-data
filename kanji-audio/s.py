import json
import re
with open("rad2.txt", "r") as f:
  d = dict()
  for l in f.readlines():
    a, b = l.rstrip().split("\t")
    a = a.rstrip()
    m = re.search(r"(.)\s*\((.*)\)", a)
    if m:
      a0 = m.group(1)
      a1 = [x.strip() for x in m.group(2).split(",")]
      a = [a0, *a1]
    else:
      a = [a]
    b1 = re.search(r"[あ-を]+", b).group(0)
    for ai in a:
      d[ai] = b1

  s = json.dump(d, open("rad_wiki.json", "w"), ensure_ascii=False)