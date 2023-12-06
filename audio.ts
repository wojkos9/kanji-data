import * as fs from 'fs'


// https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=dict-chrome-ex&ttsspeed=0.5&q=specified
export async function getAudio(text: string, lang: string = "en") {
  const resp = await fetch(`https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=dict-chrome-ex&ttsspeed=0.5&q=${text}`)
  const data = Buffer.from(await resp.arrayBuffer())
  fs.writeFileSync("out.mp3", data)
  return data
}

getAudio("test", "ja")