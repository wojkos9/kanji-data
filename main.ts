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

interface WalkOptions {
  radicalsOnly?: boolean
}

function _walk(k: INode, level: number, opts: WalkOptions): string[] {
  const e = k.attributes[KVG.E]
  const s = k.attributes[KVG.T]?.substring(0, 1)
  if (rad[e]) {
    return [`${rad[e]} (${e})`]
  } else if (level > 0 && !opts.radicalsOnly && e) {
    return [e]
  } else if (strokes.includes(s)) {
    return [`stroke ${s}`]
  } else {
    let s: string[] = []
    for (let c of k.children) {
      if (parseInt(c.attributes[KVG.PT]) > 1) {
        continue
      }
      const pos = c.attributes[KVG.P]
      const rest = _walk(c, level+1, opts)
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

function walk(e: INode, opts: WalkOptions) {
  const s = _walk(e, 0, opts)
  return s.filter(_ => _).join(" ")
}

async function kanjiDesc(f: JSZip, i: string, { radicalsOnly = true }: WalkOptions = {}) {
  const u = i.charCodeAt(0).toString(16).padStart(5, "0")
  const x = await f.file(`kanji/${u}.svg`)?.async("string")!
  console.log(u)
  const b = parseSync(x)
  const k = b.children[0].children[0]
  return walk(k, { radicalsOnly })
}

async function main() {

  const f = await zip.loadAsync(readFile("kanjivg.zip"))

  const joyo = fs.readFileSync('joyo.txt', 'utf8').split(" ")

  for (let j of joyo) {
    const desc = await kanjiDesc(f, j)
    const desc2 = await kanjiDesc(f, j, { radicalsOnly: false })
    if (desc2.length < desc.length) {
      console.log(j, desc, "SHORT", desc2)
    } else {
      console.log(j, desc)
    }
  }
}

main()

// const j = '二'
// const desc = kanjiDesc(j)
// console.log(j, desc)