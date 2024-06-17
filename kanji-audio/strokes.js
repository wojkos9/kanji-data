const { writeFileSync } = require("fs")

const strokesNames = {
  "㇀": "T",
  "㇁": "WG",
  "㇂": "XG",
  "㇄": "SW",
  "㇅": "HZZ",
  "㇆": "HZG",
  "㇇": "HP",
  "㇈": "HZWG",
  "㇉": "SZWG",
  "㇋": "HZZP",
  "㇏": "N",
  "㇐": "H",
  "㇑": "S",
  "㇒": "P",
  "㇓": "SP",
  "㇔": "D",
  "㇕": "HZ",
  "㇖": "HG",
  "㇗": "SZ",
  "㇙": "ST",
  "㇚": "SG",
  "㇛": "PD",
  "㇜": "PZ",
  "㇞": "SZZ",
  "㇟": "SWG",
  "㇡": "HZZZG",
  "６": "six"
}
const strokesParts = {
  "B": "flat",
  "D": "dot",
  "G": "hook",
  "H": "horizontal",
  "N": "right-falling",
  "P": "left-falling",
  "Q": "circle",
  "S": "vertical",
  "T": "rising",
  "W": "curved",
  "X": "slanted",
  "Z": "bent"
}
const nouns = ["dot", "hook", "circle"]
const strokeDesc = "stroke"

function getDesc(s, withNoun = false) {
  const name = strokesNames[s]
  let desc = []
  let last = ""
  let count = 0
  function flush() {
    const dict = {
      1: "", 2: "double ", 3: "triple "
    }
    if (count > 0) {
      desc.push((dict[count] ?? `${count} `) + last)
      count = 0
    }
  }
  for (const p of name) {
    const pn = strokesParts[p]
    if (!pn) {
      return name
    }
    if (pn != last) {
      flush()
      last = pn
    }
    count++
  }
  flush()
  if (withNoun && !nouns.includes(last)) {
    desc.push(strokeDesc)
  }
  return desc.join(" ")
}

const strokes = '㇀㇁㇂㇄㇅㇆㇇㇈㇉㇋㇏㇐㇑㇒㇓㇔㇕㇖㇗㇙㇚㇛㇜㇞㇟㇡６'
const strokesDesc = {}
for (const s of strokes) {
  const desc = getDesc(s)
  strokesDesc[s] = desc
}
writeFileSync("strokes.json", JSON.stringify(strokesDesc, null, 2))