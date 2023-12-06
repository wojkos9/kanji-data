import radicals from './data/radicals.json'
import strokes from './data/strokes.json'
import { posDict, posWords, terms } from './constants'

const radWords = [...new Set(Object.values(radicals).map(({ t }) => t.trim()))]
const strokeWords = Object.values(strokes)

console.log(strokeWords)