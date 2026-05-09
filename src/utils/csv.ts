export function parseCsvText(content: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentValue = ""
  let inQuotes = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    const nextChar = content[index + 1]

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        currentValue += "\""
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentValue)
      currentValue = ""
      continue
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1
      }
      currentRow.push(currentValue)
      rows.push(currentRow)
      currentRow = []
      currentValue = ""
      continue
    }

    currentValue += char
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue)
    rows.push(currentRow)
  }

  return rows
}
