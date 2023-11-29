import * as fs from 'fs'

const table = fs.readFileSync(`${__dirname}/../data/radicals_table.txt`, 'utf8')
const variants = fs.readFileSync(`${__dirname}/../data/radicals_variants.txt`, 'utf8')
const radk = fs.readFileSync(`${__dirname}/../data/radk.txt`, 'utf8').split("")

let groups = variants.split(",").map(v => v.replace("•", "").trim().split("/"))

const radicals: {[k: string]: string} = {}

for (const row of table.split("\n")) {
  const e = row.split("\t")

  const char = e[1].charAt(0)
  const chars2 = /\((.*)\)/.exec(e[1])?.[1].split(",").map(c => c.trim())

  const chars = chars2 ? [char, ...chars2] : [char]

  const read = /([あ-ん]+), ([^ ),]*)/.exec(e[3])![1]
  const gs = groups.filter(g => chars.some(c => g.includes(c))).sort((a, b) => b.length - a.length)
  // if (gs.length > 1) {
  //   console.log(gs)
  // }
  const g = gs[0]
  groups = groups.filter(ng => !gs.includes(ng))
  const vars = gs.filter(g => g.length == gs[0].length).flat()

  const allVars = [...new Set([...vars, ...chars])]
  console.log(allVars)
  // const vars = g || [char]

  for (const v of allVars) {
    radicals[v] = read
  }
}

fs.writeFileSync('radicals.json', JSON.stringify(radicals, null, 2))
// console.log(groups)