import JSZip from 'jszip';
import n2 from './data/jlpt/n2.json'
import getBounds from 'svg-path-bounds'
import { INode, parseSync } from 'svgson';
import { readFile } from 'fs/promises';

type Bounds = [number, number, number, number]

const zip = new JSZip();

function kanjiBounds(k: INode): Bounds {
  const maybePath = k.attributes["d"]
  if (maybePath) {
    return getBounds(maybePath)
  }
  let bounds: Bounds | undefined
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
  return bounds!
}

async function getSVG(i: string) {
  const f = await zip.loadAsync(readFile("kanjivg.zip"))
  const u = i.charCodeAt(0).toString(16).padStart(5, "0")
  const x = await f.file(`kanji/${u}.svg`)?.async("string")!
  const b = parseSync(x)
  return b.children[0].children[0]
}

async function main() {
  const k = n2.kanjilist.kanji[0].char

  const s = await getSVG(k)
  const b = kanjiBounds(s)
  console.log(b)
}

main()