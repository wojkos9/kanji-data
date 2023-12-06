import { INode, parseSync } from 'svgson'
import JSZip from "jszip";
import { readFile } from 'fs/promises';
import { intersects, invPos, kanjiBounds, logTable, makeGrid } from './utils';
import jlpt from './data/jlpt'
import { Argument, Command } from 'commander';
import { posDict, terms } from './constants';

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


function dictLookup(posNum: string) {
  const n = parseInt(posNum)
  return Object.entries(posDict).find(([k, v]) => v.includes(n))?.[0]
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

function _walk(k: Kanji, level: number, parentBounds: Bounds, opts: WalkOptions): string[] {
  let ret: string[] = []
  function add(p: string, type?: string, char?: string) {
    let desc = type ? `${type} ${p}` : p
    if (opts.includeChars) {
      desc += ` (${char})`
    }
    ret.push(desc)
  }
  if (k.radical) {
    add(k.radical.t, terms.radical, k.e)
  } else if (k.stroke) {
    add(k.stroke, terms.stroke, k.s)
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
      const bName = block ? pos ? `${pos} ${terms.block}` : terms.block : ""
      if (block) ret.push(bName+":")
      ret.push(...rest)
      if (block) ret.push(`${terms.end} ${bName}`)
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

async function kanjiDesc(f: JSZip, i: string, opts: WalkOptions) {
  const u = i.charCodeAt(0).toString(16).padStart(5, "0")
  const x = await f.file(`kanji/${u}.svg`)?.async("string")!
  const b = parseSync(x)
  const k = b.children[0].children[0]
  return walk(k, opts)
}

async function getDesc(chars: string[], opts: WalkOptions = {}): Promise<Record<string, string>> {
  const f = await zip.loadAsync(readFile("kanjivg.zip"))
  const futureEntries = chars.map(async k => [k, await kanjiDesc(f, k, opts)])
  return Object.fromEntries(await Promise.all(futureEntries))
}

async function main() {
  const program = new Command()

  program
    .addArgument(new Argument("<level>").choices(Object.keys(jlpt)))
    .arguments("<range>")
    .option("-c --chars", "include chars", false)

  const cmd = program.parse()
  const { chars: includeChars } = cmd.opts()
  const [ lvl, range ] = cmd.args;
  const level = lvl as keyof typeof jlpt
  const [ a, b ] = range.split("-").map(x => parseInt(x))

  const list = jlpt[level].kanjilist.kanji
  const kanjis = list.slice(a+1, b == null ? a+2 : isNaN(b) ? undefined : b+2)
  const chars = kanjis.map(k => k.char)
  const desc = await getDesc(chars, { includeChars })

  const lines = []
  for (const [i, k] of kanjis.entries()) {
    const mean = k.meaning.split(", ")[0]
    const read = k.on.split(", ")[0]
    lines.push([k.char, `(${mean}, ${read})`, desc[k.char]])
  }
  logTable(lines)
}

main()

// const j = '二'
// const desc = kanjiDesc(j)
// console.log(j, desc)