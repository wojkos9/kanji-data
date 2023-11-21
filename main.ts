// import { parse, ElementNode } from 'svg-parser'
import { xml2js } from 'xml-js'
import { INode, parseSync } from 'svgson'
import fs from 'fs'

enum KVG {
  E = "kvg:element",
  P = "kvg:position"
}

const i = '瘴'
const u = i.charCodeAt(0).toString(16).padStart(5, "0")
const x = fs.readFileSync(`kanji/${u}.svg`, 'utf8')

const b = parseSync(x)
const k = b.children[0].children[0]

function walk(e: INode, ppos?: string) {
  let s = ""
  for (const c of e.children) {
    const pos = c.attributes[KVG.P]
    const npos = ppos ? `${ppos} ${pos}` : pos
    const e = c.attributes[KVG.E]
    if (e) {

      s += `${npos} ${e}, `
    } else {
      const rest = walk(c, npos)
      s += rest
    }
  }
  return s
}
const desc = walk(k)
console.log(desc)