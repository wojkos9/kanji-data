import { parseSync } from "svgson";
import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";
import * as fs from "fs/promises";

const zip = new JSZip();

(async () => {
  const f = await zip.loadAsync(fs.readFile("kanjivg.zip"))
  console.log(await f.file("kanji/27491.svg")?.async("string"))
})()