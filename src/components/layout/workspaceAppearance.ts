export function contrastingText(background: string | null | undefined) {
  const hex = background?.match(/^#([0-9a-f]{6})$/i)?.[1]
  if (!hex) return "#fff"
  const channels = hex.match(/../g)!.map(pair => parseInt(pair, 16) / 255)
  const [red, green, blue] = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue > 0.179 ? "#000" : "#fff"
}
