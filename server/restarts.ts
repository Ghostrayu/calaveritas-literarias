const RESTART = [
  /\bempiezo de nuevo\b/,
  /^va de nuevo\b/,
  /\bversi[oó]n (final|definitiva|redonda|corregida)\b/,
  /\bla versi[oó]n es esta\b/,
  /\bmejor (lo hago|lo escribo|reescribo)\b/,
  /\breescrib[oe]\b/,
  /\blo hago bien\b/,
  /\bno me convence\b/,
  /\bintento (una|otra) vez\b/,
  /\bme corrijo\b/,
  /\bpor el desorden\b/,
  /\bsin cuadrar\b/,
  /\berrores de rima\b/,
  /\blet me (try|redo|rewrite|start|fix)\b/,
  /\bstart(ing)? over\b/,
  /\bscratch that\b/,
  /\b(revised|corrected|final) version\b/,
]

const SEPARATOR = /^[-–—_*=~·•.\s]+$/

// Remarks about the verse itself ("Some lines need reshaping to hold the rhyme"), matched on
// accent-free text: a word about the craft next to a word about fixing it.
const CRAFT = /\b(rhym\w*|meter|metre|syllabl\w*|stanzas?|scansion|rima\w*|estrofas?|cuartetas?|silabas?|metrica|octosilab\w*)\b/
const CRAFT_FIX =
  /\b(needs?|needed|reshap\w*|rework\w*|rewrit\w*|adjust\w*|tweak\w*|fix\w*|polish\w*|revis\w*|tighten\w*|hold\w*|keep\w*|correct\w*|necesit\w*|ajust\w*|reajust\w*|corrig\w*|correg\w*|arregl\w*|cuadr\w*|sosten\w*|mantener|pulir|retoc\w*|reformul\w*)\b/
const LINES = /\b(lines?|verses?|versos?)\b/
const LINES_FIX = /\b(reshap\w*|rework\w*|rewrit\w*|adjust\w*|tweak\w*|revis\w*|reajust\w*|corrig\w*|correg\w*|arregl\w*|retoc\w*|reformul\w*)\b/

function isRemark(text: string): boolean {
  const plain = text.normalize('NFD').replace(/\p{M}/gu, '')
  return (CRAFT.test(plain) && CRAFT_FIX.test(plain)) || (LINES.test(plain) && LINES_FIX.test(plain))
}

export function isRestart(line: string): boolean {
  const text = line.trim().toLowerCase()
  if (!text) return false
  return SEPARATOR.test(text) || isRemark(text) || RESTART.some((pattern) => pattern.test(text))
}
