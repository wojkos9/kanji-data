// import { parse, ElementNode } from 'svg-parser'
import { xml2js } from 'xml-js'
import { INode, parseSync } from 'svgson'
import JSZip from "jszip";
import * as fs from 'fs'
import { readFile } from 'fs/promises';
import getBounds from 'svg-path-bounds';
import { joinBounds, makeGrid } from './utils';
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
  return l <= x && x <= r && t <= y && y <= b
}

function points(bb: Bounds) {
  const [l, t, r, b] = bb
  return [[l, t], [l, b], [r, t], [r, b]]
}

function intersects(bb1: Bounds, bb2: Bounds) {
  const pts = points(bb1)
  return pts.every(pt => pointInt(pt, bb2))
}

const ltr = "abcdefghi".split("")

function getGrid(b: Bounds, pb: Bounds) {
  const grid = makeGrid(pb, 3)
  const r = grid.map((g, i) => intersects(b, g) ? ltr[i] : null).filter(_ => _).join("")
  console.log(b, pb, r)
  return r
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

function _walk(k: Kanji, level: number, parentBounds: Bounds, opts: WalkOptions): string[] {
  // const k = new Kanji(i)
  let ret: string[] = []
  function add(p: string, type?: string) {
    ret.push(type ? `${p} ${type}` : p)
  }
  if (k.radical){
    add(k.radical.t)
  } else if (k.stroke) {
    add(k.stroke, "stroke")
  } else {
    const bounds = k.bounds()
    for (const ch of k.children) {
      let pos = getGrid(ch.bounds(), bounds)
      const rest = _walk(ch, level + 1, bounds, opts)
      const block = rest.length > 1
      ret.push(pos)
      if (block) ret.push("block")
      ret.push(...rest)
      if (block) ret.push("end-block")
    }
  }
  return ret
}

function walk(e: INode, opts: WalkOptions) {
  const b = kanjiBounds(e)
  const s = _walk(new Kanji(e), 0, b, opts)
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
  const start = 1900
  for (let j of joyo.slice(start, start+10)) {
    const desc = await kanjiDesc(f, j)
    console.log(j, desc)
  }
}

main()

// const j = '二'
// const desc = kanjiDesc(j)
// console.log(j, desc)