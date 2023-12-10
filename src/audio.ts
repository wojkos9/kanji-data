import * as fs from 'fs'
import { Token } from './token'
import { concatAudio } from './concat';


// https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=dict-chrome-ex&ttsspeed=0.5&q=specified
async function getAudio(text: string, lang: string = "en") {
  const resp = await fetch(`https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=dict-chrome-ex&ttsspeed=0.5&q=${text}`)
  const data = Buffer.from(await resp.arrayBuffer())
  fs.writeFileSync("out.mp3", data)
  return data
}

export function getOfflineAudio(tok: Token[]) {
  const files = tok.reduce((a: string[], b) => [...a, ...b.toAudio()], []).map(a => `voice/${a}.wav`)
  const outName = "out.wav"
  concatAudio(files, outName)
  return outName
}