import { INode, parseSync } from 'svgson'
import JSZip from "jszip";
import { readFile } from 'fs/promises';
import { intersects, invPos, kanjiBounds, logTable, makeGrid } from './utils';
import jlpt from './data/jlpt'
import { Argument, Command } from 'commander';
import { AllPos, posDict, posWords, terms } from './constants';
import player from 'play-sound'

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
  return Object.entries(posDict).find(([k, v]) => v.includes(n))?.[0] as (AllPos | undefined)
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
  get pos() { return this.a[KVG.P] as AllPos }
  get part() { return parseInt(this.a[KVG.PT]) }
  get radical() { return radicals[this.e] }
  get stroke() { return strokes[this.s] }
  private _children: Kanji[] | undefined
  get children() { return this._children ?? (this._children = this.k.children.map(c => new Kanji(c))) }
  bounds() { return kanjiBounds(this.k) }
}

function _walk(k: Kanji, level: number, parentBounds: Bounds, opts: WalkOptions): Token[] {
  let tok: Token[] = []

  if (k.radical) {
    tok.push(new Radical(k.radical, k.e))
  } else if (k.stroke) {
    tok.push(new Stroke(k.stroke, k.s))
  } else {
    const bounds = k.bounds()
    let lastPos: string | undefined
    for (const ch of k.children) {
      if (ch.part > 1) {
        continue
      }
      let pos: AllPos | undefined = ch.pos
      if (!pos) {
        const gridPos = getGrid(ch.bounds(), bounds)
        if (gridPos) {
          pos = dictLookup(gridPos)
        }
      }
      const rest = _walk(ch, level + 1, bounds, opts)
      const isBlock = rest.length > 1
      if (!pos && lastPos) {
        pos = invPos(lastPos as Pos)
      }
      if (!isBlock && pos) {
        tok.push(new Position(pos))
      }
      lastPos = pos
      const blockStart = new BlockStart(pos)
      if (isBlock) tok.push(blockStart)
      tok.push(...rest)
      if (isBlock) tok.push(new BlockEnd(blockStart))
    }
  }
  return tok
}

function walk(e: INode, opts: WalkOptions): KanjiDesc {
  const b = kanjiBounds(e)
  const tok = _walk(new Kanji(e), 0, b, opts)
  let endCnt = 0
  for (let i = tok.length - 1; i >= 0; i--) {
    if (tok[i] instanceof BlockEnd) {
      endCnt++
    } else {
      break
    }
  }
  if (endCnt > 0) {
    tok.splice(tok.length - endCnt)
  }

  return {
    str: tok2str(tok),
    tok
  }
}

interface KanjiDesc {
  str: string
  tok: Token[]
}

async function kanjiDesc(f: JSZip, i: string, opts: WalkOptions): Promise<KanjiDesc> {
  const u = i.charCodeAt(0).toString(16).padStart(5, "0")
  const x = await f.file(`kanji/${u}.svg`)?.async("string")!
  const b = parseSync(x)
  const k = b.children[0].children[0]
  return walk(k, opts)
}

async function getDesc(chars: string[], opts: WalkOptions = {}): Promise<Record<string, KanjiDesc>> {
  const f = await zip.loadAsync(readFile("kanjivg.zip"))
  const futureEntries = chars.map(async k => [k, await kanjiDesc(f, k, opts)])
  return Object.fromEntries(await Promise.all(futureEntries))
}

import { concatAudio } from './cc';
import { Token, Radical, Stroke, Position, BlockStart, BlockEnd, tok2str } from './token';

async function getAudio(tok: Token[]) {
  const files = tok.reduce((a: string[], b) => [...a, ...b.toAudio()], []).map(a => `voice/${a}.wav`)
  concatAudio(files, "res.wav")
  player({ player: 'play' }).play('res.wav')
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

  // const lines = []
  // for (const [i, k] of kanjis.entries()) {
  //   const mean = k.meaning.split(", ")[0]
  //   const read = k.on.split(", ")[0]
  //   lines.push([k.char, `(${mean}, ${read})`, desc[k.char]])
  // }
  // logTable(lines)
  const { tok } = desc[chars[0]]
  console.log(chars[0], tok2str(tok, true))
  getAudio(tok)
}

main()

// const j = '二'
// const desc = kanjiDesc(j)
// console.log(j, desc)