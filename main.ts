// import { parse, ElementNode } from 'svg-parser'
import { xml2js } from 'xml-js'
import { INode, parseSync } from 'svgson'
import * as fs from 'fs'

const rad = JSON.parse(fs.readFileSync('r3.json', 'utf8'))

const strokes = '㇀㇁㇂㇄㇅㇆㇇㇈㇉㇋㇏㇐㇑㇒㇓㇔㇕㇖㇗㇙㇚㇛㇜㇞㇟㇡６'

enum KVG {
  E = "kvg:element",
  P = "kvg:position",
  PT = "kvg:part",
  T = "kvg:type"
}

let skip = 1

function _walk(e: INode) {
  const te = e.attributes[KVG.E]
  const r = rad[te]
  if (r) {
    return [r]
  }
  let s: string[] = []
  for (const c of e.children) {
    if (parseInt(c.attributes[KVG.PT]) > 1) {
      continue
    }
    const e = c.attributes[KVG.E] ?? c.attributes[KVG.T]?.substring(0, 1)
    const pos = c.attributes[KVG.P]
    let found = true
    if (e) {
      let rd = rad[e]
      if (rd == null) {
        if (e && strokes.includes(e)) {
          rd = `stroke ${e}`
        } else {
          found  = false
        }

      }
      s.push(pos, rd ?? e)
    }
    if (!found) {
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

function kanjiDesc(i: string) {
  const u = i.charCodeAt(0).toString(16).padStart(5, "0")
  const x = fs.readFileSync(`kanji/${u}.svg`, 'utf8')
  console.log(u)

  const b = parseSync(x)
  const k = b.children[0].children[0]
  return walk(k)
}

const joyo = fs.readFileSync('joyo.txt', 'utf8').split(" ")

for (let j of joyo) {
  const desc = kanjiDesc(j)
  console.log(j, desc)
}

// const j = '二'
// const desc = kanjiDesc(j)
// console.log(j, desc)