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

export function isRestart(line: string): boolean {
  const text = line.trim().toLowerCase()
  return RESTART.some((pattern) => pattern.test(text))
}
