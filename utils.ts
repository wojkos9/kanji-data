import { INode } from "svgson"
import getBounds from 'svg-path-bounds';

function makeGrid(bb: Bounds, n: number) {
  const [l, t, r, b] = bb
  function subgrid(l: number, r: number) {
    const sx = Math.floor((r - l) / n)
    const sg = []
    for (let i = 0; i < n; i++) {
      const x1 = l + sx * i
      const x2 = i == n - 1 ? r : x1 + sx
      sg.push([x1, x2])
    }
    return sg
  }
  const grid = []
  const [gx, gy] = [subgrid(l, r), subgrid(t, b)]
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const [g1, g2] = [gx[j], gy[i]]
      grid.push([g1[0], g2[0], g1[1], g2[1]])
    }
  }
  return grid
}

function joinBounds(bb1: Bounds, bb2: Bounds) {
  const bounds = []
  for (let i = 0; i < 4; i++) {
    bounds[i] = (i < 2 ? Math.min : Math.max)(bb1[i], bb2[i])
  }
  return bounds
}

function invPos(pos: Pos): Pos {
  switch(pos) {
    case "left":
      return "right"
    case "top":
      return "bottom"
    case "right":
      return "left"
    case "bottom":
      return "top"
  }
}

function relPos(bb1: Bounds, bb2: Bounds, invChecked = false): Pos | undefined {
  const [l1, t1, r1, b1] = bb1
  const [l2, t2, r2, b2] = bb2
  const [l, t, r, b] = joinBounds(bb1, bb2)
  const [w, h] = [r - l, b - t]
  if (l1 < l2 && r1 - l2 < 0.1 * w) {
    return "left"
  } else if (t1 < t2 && b1 - t2 < 0.1 * h) {
    return "top"
  } else if (!invChecked) {
    const pos2 = relPos(bb2, bb1, true)
    if (pos2) return invPos(pos2)
  }
}

function kanaLength(t: string) {
  return t.match(/[ア-ン]/gu)?.length ?? 0
}

function logTable(data: string[][]) {
  const lens: number[] = []
  for (let i = 0; i < data[0].length; i++) {
    lens.push(Math.max(...data.map(t => t[i].length + kanaLength(t[i]) )))
  }
  for (const t of data) {
    const padded = t.map((c, i) => i == t.length - 1 ? c : c.padStart(lens[i] - kanaLength(c), " "))
    console.log(...padded)
  }
}

function kanjiBounds(k: INode): number[] {
  const maybePath = k.attributes["d"]
  let bounds: number[] | undefined
  if (maybePath) {
    bounds = getBounds(maybePath)
  } else {
    for (const c of k.children) {
      const nb = kanjiBounds(c)
      if (!nb) continue
      if (!bounds) {
        bounds = nb
      } else {
        bounds = joinBounds(bounds, nb)
      }
    }
  }
  return bounds!.map(b => Math.floor(b))
}

function intersects(bb1: Bounds, bb2: Bounds): boolean {
  const [l1, t1, r1, b1] = bb1
  const [l2, t2, r2, b2] = bb2
  return l1 <= r2 && r1 >= l2 && t1 <= b2 && b1 >= t2
}

export { makeGrid, joinBounds, invPos, logTable, kanjiBounds, intersects }