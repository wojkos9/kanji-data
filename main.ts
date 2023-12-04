import { INode, parseSync } from 'svgson'
import JSZip from "jszip";
import * as fs from 'fs'
import { readFile } from 'fs/promises';
import getBounds from 'svg-path-bounds';
import { invPos, joinBounds, makeGrid } from './utils';
const strokes: Record<string, string> = require('./data/strokes.json')
const radicals: Record<string, RadicalDesc> = require('./data/radicals.json')
import jlpt from './data/jlpt'
import { Argument, Command } from 'commander';

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

function intersects(bb1: Bounds, bb2: Bounds): boolean {
  const [l1, t1, r1, b1] = bb1
  const [l2, t2, r2, b2] = bb2
  return l1 <= r2 && r1 >= l2 && t1 <= b2 && b1 >= t2
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
    let desc = type ? `${type} ${p}` : p
    if (opts.includeChars) {
      desc += ` (${char})`
    }
    ret.push(desc)
  }
  if (k.radical) {
    add(k.radical.t, "radical", k.e)
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

      const tBlock = "block"
      const bName = block ? pos ? `${pos} ${tBlock}` : tBlock : ""
      if (block) ret.push(bName+":")
      ret.push(...rest)
      if (block) ret.push(`end ${bName}`)
    }
  }
  return ret
}

function walk(e: INode, opts: WalkOptions) {
  const b = kanjiBounds(e)
  const s = _walk(new Kanji(e), 0, b, opts)
  let descs = s.filter(_ => _).map(x => x.endsWith(":") ? x : x+",")
  let endCnt = 0
  for (let i = descs.length - 1; i >= 0; i--) {
    if (descs[i].startsWith("end")) {
      endCnt++
    } else {
      break
    }
  }
  if (endCnt > 0) {
    descs = descs.slice(0, descs.length - endCnt)
  }
  let desc = descs.join(" ")
  if (desc[desc.length - 1] == ",") {
    desc = desc.substring(0, desc.length - 1)
  }
  return desc
}

async function kanjiDesc(f: JSZip, i: string, { radicalsOnly = true }: WalkOptions = {}) {
  const u = i.charCodeAt(0).toString(16).padStart(5, "0")
  const x = await f.file(`kanji/${u}.svg`)?.async("string")!
  const b = parseSync(x)
  const k = b.children[0].children[0]
  return walk(k, { radicalsOnly, includeChars: false })
}

async function getDesc(chars: string[]): Promise<Record<string, string>> {
  const f = await zip.loadAsync(readFile("kanjivg.zip"))
  const futureEntries = chars.map(async k => [k, await kanjiDesc(f, k)])
  return Object.fromEntries(await Promise.all(futureEntries))
}

async function main() {
  const program = new Command()

  program
    .addArgument(new Argument("<level>").choices(Object.keys(jlpt)))
    .arguments("<range>")

  const cmd = program.parse()
  const [ vlv, range ] = cmd.args;
  const level = vlv as keyof typeof jlpt
  const [ a, b ] = range.split("-").map(x => parseInt(x))
  const list = jlpt[level].kanjilist.kanji
  const kanjis = list.slice(a+1, b == null ? a+2 : isNaN(b) ? undefined : b+2)
  const chars = kanjis.map(k => k.char)
  const desc = await getDesc(chars)
  for (const [i, k] of kanjis.entries()) {
    console.log(k.char, desc[k.char])
  }
}

main()

// const j = '二'
// const desc = kanjiDesc(j)
// console.log(j, desc)