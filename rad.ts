import { readFileSync, writeFileSync } from "fs";
import { globSync } from "glob";
import { INode, parseSync } from "svgson";

enum KVG {
  E = "kvg:element",
  R = "kvg:radical",
  O = "kvg:original"
}

const fns = globSync("kanji/*.svg")

interface RadTable {
  [k: string]: Set<string>
}

const rads: RadTable = {}
const special = '⺨'.split(' ')
let curr: string | null = null

function walk(i: INode) {
  const a = i.attributes
  const rt = a[KVG.R]
  if (rt) {
    if (rads[rt] == null) {
      rads[rt] = new Set()
    }
    const r = a[KVG.O] || a[KVG.E]
    rads[rt].add(r)
    if (special.includes(r)) {
      console.log(special.indexOf(r), curr)
    }
  }
  for (const c of i.children) {
    walk(c)
  }
}

for (let fn of fns) {
  const f = readFileSync(fn, "utf8")
  const xml = parseSync(f).children[0].children[0]
  curr = fn
  walk(xml)
}

const radsJson: any = {}
for (const rn in rads) {
  radsJson[rn] = Array.from(rads[rn]).sort().join("")
}

writeFileSync("vg_rads2.json", JSON.stringify(radsJson, null, 2))

// const allRads = Object.values(rads).reduce<Set<string>>((set, nset) => new Set([...set, ...nset]), new Set())
// console.log(Array.from(allRads).sort().join(""))