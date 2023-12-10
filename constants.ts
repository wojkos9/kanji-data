const posDict = {
  "left": [17, 18, 44],
  "top": [13, 16, 22],
  "top-left": [11, 12, 14, 15],
  "top-right": [23, 26, 33, 36],
  "right": [29, 39],
  "bottom": [49, 79],
  "bottom-left": [48, 77, 78, 47],
  "bottom-right": [59, 89, 99, 69],
  "middle": [28],
  "middle-row": [46],
  "center": [55],
  "center-top": [25],
  "center-bottom": [58],
  "center-left": [45],
  "center-right": [56]
}

const posWords = {
  "bottom": "bottom",
  "kamae": "kamae",
  "left": "left",
  "nyo": "nyo",
  "nyoc": "nyoc",
  "right": "right",
  "tare": "tare",
  "tarec": "tarec",
  "top": "top"
}

const terms = {
  block: "block",
  end: "end",
  radical: "radical",
  stroke: "stroke"
}

export type AllPos = keyof typeof posDict | keyof typeof posWords

export { posDict, posWords, terms }