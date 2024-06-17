import { AllPos, terms } from "./constants"

export abstract class Token {
  abstract toString(verbose?: boolean): string
  abstract toAudio(): string[]
}
export class Radical extends Token {
  constructor(private radical: RadicalDesc, private element: string) {super()}
  toString = (v: boolean) => `${terms.radical} ${this.radical.t}` + (v ? ` (${this.element})` : "")
  toAudio = () => [terms.radical, this.radical.t]
}

export class Stroke extends Token {
  constructor(private name: string, private element: string) {super()}
  toString = (v: boolean) => `${terms.stroke} ${this.name}` + (v ? ` (${this.element})` : "")
  toAudio = () => [terms.stroke, this.name]
}

export class Position extends Token {
  constructor(private type: AllPos) {super()}
  toString() { return `${this.type}:` }
  toAudio = () => [this.type]
}

export class BlockStart extends Token {
  constructor(private type?: AllPos) {super()}
  get name() { return `${this.type} ${terms.block}` }
  toString = () => `${this.name}:`
  toAudio = () => [this.name]
}

export class BlockEnd extends Token {
  constructor(private start: BlockStart) {super()}
  toString() { return `${terms.end} ${this.start.name},` }
  toAudio = () => [`${terms.end} ${this.start.name}`]
}

export function tok2str(tok: Token[], verbose: boolean = false) {
  return tok.reduce((a, b, i) => a + " " + b.toString(verbose) + (
    (b instanceof Radical || b instanceof Stroke) && i != tok.length - 1
      ? ","
      : ""
  ), "")
}