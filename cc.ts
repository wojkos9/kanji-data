import ffmpeg from 'fluent-ffmpeg'

export function concatAudio(audios: string[], output: string) {
  const concat = ffmpeg()
  audios.forEach(c => concat.input(c))
  concat
    .mergeToFile(output, './tmp')
}



