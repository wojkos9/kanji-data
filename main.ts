// import { parse, ElementNode } from 'svg-parser'
import { xml2js } from 'xml-js'
import { INode, parseSync } from 'svgson'
import JSZip from "jszip";
import * as fs from 'fs'
import { readFile } from 'fs/promises';
import getBounds from 'svg-path-bounds';
import { invPos, joinBounds, makeGrid } from './utils';
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
        bounds = joinBounds(bounds, nb)
      }
    }
  }
  return bounds!.map(b => Math.floor(b))
}

function pointInt(pt: number[], bb: Bounds) {
  const [l, t, r, b] = bb
  const [x, y] = pt
  const res = l <= x && x <= r && t <= y && y <= b
  return res
}

function points(bb: Bounds) {
  const [l, t, r, b] = bb
  return [[l, t], [l, b], [r, t], [r, b]]
}

function intersects(bb1: Bounds, bb2: Bounds): boolean {
  const [l1, t1, r1, b1] = bb1
  const [l2, t2, r2, b2] = bb2
  return l1 <= r2 && r1 >= l2 && t1 <= b2 && b1 >= t2
  // return points(bb1).some(pt => pointInt(pt, bb2)) || points(bb2).some(pt => pointInt(pt, bb1))
}

const dict = {
  "left": [17, 18, 44],
  "top": [13, 16, 22],
  "top-left": [11, 12, 14, 15],
  "top-right": [23, 26, 33, 36],
  "right": [29, 39],
  "bottom": [49, 79],
  "bottom-left": [48, 77, 78, 47],
  "bottom-right": [59, 89, 99, 69],
  "middle": [28],
  "middle-row": [46],
  "center": [55],
  "center-top": [25],
  "center-bottom": [58],
  "center-left": [45],
  "center-right": [56]
}

function dictLookup(posNum: string) {
  const n = parseInt(posNum)
  return Object.entries(dict).find(([k, v]) => v.includes(n))?.[0]
}

function getGrid(b: Bounds, pb: Bounds) {
  const grid = makeGrid(pb, 3)
  const r = grid.map((g, i) => intersects(b, g) ? (i+1).toString() : null).filter(_ => _)
  const rl = r.length
  switch (rl) {
    case 0:
    case 9:
      return null
    default:
      return r[0]! + r[rl-1]
  }
}

class Kanji {
  constructor(private k: INode) {}
  get a() { return this.k.attributes }
  get e() { return this.a[KVG.E] }
  get s() { return this.a[KVG.T]?.substring(0, 1) }
  get pos() { return this.a[KVG.P] }
  get part() { return parseInt(this.a[KVG.PT]) }
  get radical() { return radicals[this.e] }
  get stroke() { return strokes[this.s] }
  private _children: Kanji[] | undefined
  get children() { return this._children ?? (this._children = this.k.children.map(c => new Kanji(c))) }
  bounds() { return kanjiBounds(this.k) }
}

const ltr = "abcdefgh"

function _walk(k: Kanji, level: number, parentBounds: Bounds, opts: WalkOptions): string[] {
  // const k = new Kanji(i)
  let ret: string[] = []
  function add(p: string, type?: string, char?: string) {
    let desc = type ? `${p} ${type}` : p
    if (opts.includeChars) {
      desc += ` (${char})`
    }
    ret.push(desc)
  }
  if (k.radical) {
    add(k.radical.t, undefined, k.e)
  } else if (k.stroke) {
    add(k.stroke, "stroke", k.s)
  } else {
    const bounds = k.bounds()
    let lastPos: string | null = null
    for (const ch of k.children) {
      if (ch.part > 1) {
        continue
      }
      let pos = ch.pos || getGrid(ch.bounds(), bounds)
      pos = pos && dictLookup(pos) || pos
      const rest = _walk(ch, level + 1, bounds, opts)
      const block = rest.length > 1
      if (!pos && lastPos) {
        pos = invPos(lastPos as Pos)
      }
      if (!block && pos) {
        ret.push(pos+":")
      }
      lastPos = pos
      
      const bName = block ? pos ? `${pos}-block` : 'block' : ""
      if (block) ret.push(bName+":")
      ret.push(...rest)
      if (block) ret.push(`end-${bName}`)
    }
  }
  return ret
}

function walk(e: INode, opts: WalkOptions) {
  const b = kanjiBounds(e)
  const s = _walk(new Kanji(e), 0, b, opts)
  const desc = s.filter(_ => _).join(" ")
  return desc
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
  const start = 1250
  for (let j of joyo.slice(start, start+10)) {
    const desc = await kanjiDesc(f, j)
    console.log(j, desc+"\n")
  }
}

main()

// const j = '二'
// const desc = kanjiDesc(j)
// console.log(j, desc)