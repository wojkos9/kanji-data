// import { parse, ElementNode } from 'svg-parser'
import { xml2js } from 'xml-js'
import { INode, parseSync } from 'svgson'
import JSZip from "jszip";
import * as fs from 'fs'
import { readFile } from 'fs/promises';
import getBounds from 'svg-path-bounds';
const strokes: Record<string, string> = require('./data/strokes.json')
const radicals: Record<string, RadicalDesc> = require('./data/radicals.json')

const zip = new JSZip();

enum KVG {
  E = "kvg:element",
  P = "kvg:position",
  PT = "kvg:part",
  T = "kvg:type",
  PATH = "d"
}

interface WalkOptions {
  radicalsOnly?: boolean
  includeChars?: boolean
}

function kanjiBounds(k: INode): number[] {
  const maybePath = k.attributes["d"]
  let bounds: number[] | undefined
  if (maybePath) {
    bounds = getBounds(maybePath)
  } else {
    for (const c of k.children) {
      const nb = kanjiBounds(c)
      if (!nb) continue
      if (!bounds) {
        bounds = nb
      } else {
        for (let i = 0; i < 4; i++) {
          bounds[i] = (i < 2 ? Math.min : Math.max)(bounds[i], nb[i])
        }
      }
    }
  }
  return bounds!.map(b => Math.floor(b))
}

function _walk(k: INode, level: number, opts: WalkOptions): string[] {
  const e = k.attributes[KVG.E]
  const s = k.attributes[KVG.T]?.substring(0, 1)
  let ret: string[] = []
  if (radicals[e]) {
    let part = radicals[e].t
    if (opts.includeChars) {
      part += ` (${e})`
    }
    ret.push(part+",")
  } else if (level > 0 && !opts.radicalsOnly && e) {
    ret.push(e)
  } else if (strokes[s]) {
    let part = strokes[s]+" stroke"
    if (opts.includeChars) {
      part += ` (${s})`
    }
    ret.push(part+",")
  } else {
    for (let c of k.children) {
      if (parseInt(c.attributes[KVG.PT]) > 1) {
        continue
      }
      const pos = c.attributes[KVG.P]
      const rest = _walk(c, level+1, opts)

      if (rest.length > 1) {
        if (pos) {
          ret.push(pos)
        } else {
          const b = kanjiBounds(c)
          ret.push(b.toString())
        }
        ret.push(`block:`, ...rest, `end-block,`)
      } else {
        if (pos) {
          ret.push(pos+":")
        }
        ret.push(rest[0])
      }
    }
  }
  return ret
}

function walk(e: INode, opts: WalkOptions) {
  const s = _walk(e, 0, opts)
  const desc = s.filter(_ => _).join(" ")
  return desc.substring(0, desc.length - 1)
}

async function kanjiDesc(f: JSZip, i: string, { radicalsOnly = true }: WalkOptions = {}) {
  const u = i.charCodeAt(0).toString(16).padStart(5, "0")
  const x = await f.file(`kanji/${u}.svg`)?.async("string")!
  const b = parseSync(x)
  const k = b.children[0].children[0]
  return walk(k, { radicalsOnly, includeChars: true })
}

async function main() {

  const f = await zip.loadAsync(readFile("kanjivg.zip"))

  const joyo = fs.readFileSync('./data/joyo.txt', 'utf8').split(" ")
  const start = 900
  for (let j of joyo.slice(start, start+10)) {
    const desc = await kanjiDesc(f, j)
    console.log(j, desc)
  }
}

main()

// const j = '二'
// const desc = kanjiDesc(j)
// console.log(j, desc)