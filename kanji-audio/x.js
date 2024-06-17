const fs = require('fs')

const r = x => JSON.parse(fs.readFileSync(x))

a = r('r.json')
b = r('r2.json')

for (let k in b) {
  a[k] = b[k]
}
fs.writeFileSync('r3.json', JSON.stringify(a, null, 2))