// import { parse, ElementNode } from 'svg-parser'
import { xml2js } from 'xml-js'
import { INode, parseSync } from 'svgson'
import fs from 'fs'

const rad = JSON.parse(fs.readFileSync('r2.json', 'utf8'))

enum KVG {
  E = "kvg:element",
  P = "kvg:position",
  PT = "kvg:part"
}

const i = '穏'
const u = i.charCodeAt(0).toString(16).padStart(5, "0")
const x = fs.readFileSync(`kanji/${u}.svg`, 'utf8')
console.log(u)

const b = parseSync(x)
const k = b.children[0].children[0]



function _walk(e: INode) {
  let s: string[] = []
  for (const c of e.children) {
    if (parseInt(c.attributes[KVG.PT]) > 1) {
      continue
    }
    const pos = c.attributes[KVG.P]
    const e = c.attributes[KVG.E]
    if (e) {
      const rd = rad[e]
      s.push(pos, rd ?? e)
    } else {
      const rest = _walk(c)
      s.push(pos, "block", ...rest, "end")
    }
  }
  return s
}
function walk(e: INode) {
  const s = _walk(e)
  return s.filter(_ => _).join(" ")
}
const desc = walk(k)
console.log(desc)