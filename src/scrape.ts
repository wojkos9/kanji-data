import radicals from '../data/radicals.json'
import strokes from '../data/strokes.json'
import { posDict, posWords, terms } from './constants'
import * as cp from 'child_process'
import * as util from 'util'

const exec = util.promisify(cp.exec)


const radWords = [...new Set(Object.values(radicals).map(({ t }) => t.trim()))]
const strokeWords = Object.values(strokes)

export const allPos = [...new Set([...Object.keys(posDict), ...Object.keys(posWords)])]

const blocks = allPos.map(p => `${p} ${terms.block}`)
const endBlocks = blocks.map(b => `${terms.end} ${b}`)

export const allWords = [
  ...radWords,
  ...strokeWords,
  ...allPos,
  ...blocks,
  ...endBlocks,
  terms.radical,
  terms.stroke
]

async function genAudio(w: string, path = "voice") {
  const cmd = `echo "${w}" | text2wave > "${path}/${w}.wav"`
  console.log(cmd)
  return exec(cmd)
}

// for (const w of allWords.slice(0, lvl)) {
//   console.log(w)
//   genAudio(w)
// }

async function stuff(words: string[], lvl = 3) {
  for (let i = 0; i < words.length; i += lvl) {
    const j = Math.min(words.length, i + lvl);
    const batch = words.slice(i, j)
    console.log(batch)
    await Promise.all(batch.map(async w => await genAudio(w)))
  }
}

// stuff([terms.end])
