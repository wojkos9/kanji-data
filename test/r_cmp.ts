import { readFileSync } from "fs";

function read(fn: string): any {
  return JSON.parse(readFileSync(fn, "utf8"))
}

function arrFunc(a: any[], b: any[], f: (a: any[], b: any[], e: any) => boolean) {
  const arr = []
  for (const e of Array.from(new Set([...a, ...b]))) {
    if (f(a, b, e)) {
      arr.push(e)
    }
  }
  return arr
}

function inter(a: any[], b: any[]) {
  return arrFunc(a, b, (a: any[], b: any[], e: any) => a.includes(e) && b.includes(e))
}

function sub(a: any[], b: any[]) {
  return arrFunc(a, b, (a: any[], b: any[], e: any) => a.includes(e) && !b.includes(e))
}


const r = Object.keys(read("r.json"))
const r2 = Object.keys(read("r2.json"))
const r3 = Object.keys(read("r3.json"))
const rad = Object.keys(read("radicals.json"))
const vg = read("vg_rads2.json")
const rvg = vg["tradit"].split("")

const rv = inter(r, rvg)
const r2v = inter(r2, rvg)
const r3v = inter(r3, rvg)

// console.log(r2v, r2v.length, rvg.length)
// console.log(sub(rvg, r2v).join(" "))
console.log(sub(rvg, rad), rvg.length, rad.length)