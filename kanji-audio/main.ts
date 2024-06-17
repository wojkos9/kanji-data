import { Command, Argument } from "commander";
import jlpt from "./data/jlpt";
import { tok2str } from "./src/token";
import { getDesc } from "./src/walk";
import { getOfflineAudio } from "./src/audio";
import player from 'play-sound'


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
  console.log(chars[0], tok2str(tok, includeChars))
  const audioFile = getOfflineAudio(tok)
  player({ player: 'play' }).play(audioFile)
}

main()