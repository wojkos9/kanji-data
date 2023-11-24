// import { parse, ElementNode } from 'svg-parser'
import { xml2js } from 'xml-js'
import { INode, parseSync } from 'svgson'
import JSZip from "jszip";
import * as fs from 'fs'
import { readFile } from 'fs/promises';

const zip = new JSZip();


const rad = JSON.parse(fs.readFileSync('r3.json', 'utf8'))

const strokes = '㇀㇁㇂㇄㇅㇆㇇㇈㇉㇋㇏㇐㇑㇒㇓㇔㇕㇖㇗㇙㇚㇛㇜㇞㇟㇡６'

enum KVG {
  E = "kvg:element",
  P = "kvg:position",
  PT = "kvg:part",
  T = "kvg:type"
}

function _walk(k: INode): string[] {
  const e = k.attributes[KVG.E] ?? k.attributes[KVG.T]?.substring(0, 1)
  if (rad[e]) {
    return [`${rad[e]} (${e})`]
  } else if (strokes.includes(e)) {
    return [`stroke ${e}`]
  } else {
    let s: string[] = []
    for (let c of k.children) {
      if (parseInt(c.attributes[KVG.PT]) > 1) {
        continue
      }
      const pos = c.attributes[KVG.P]
      const rest = _walk(c)
      s.push(pos)
      if (rest.length > 1) {
        s.push("block", ...rest, "end")
      } else {
        s.push(rest[0])
      }
    }
    return s
  }
}

function walk(e: INode) {
  const s = _walk(e)
  return s.filter(_ => _).join(" ")
}

async function kanjiDesc(f: JSZip, i: string) {
  const u = i.charCodeAt(0).toString(16).padStart(5, "0")
  const x = await f.file(`kanji/${u}.svg`)?.async("string")!

  const b = parseSync(x)
  const k = b.children[0].children[0]
  return walk(k)
}

async function main() {

  const f = await zip.loadAsync(readFile("kanjivg.zip"))

  const joyo = fs.readFileSync('joyo.txt', 'utf8').split(" ")

  for (let j of joyo) {
    const desc = await kanjiDesc(f, j)
    console.log(j, desc)
  }
}

main()

// const j = '二'
// const desc = kanjiDesc(j)
// console.log(j, desc)