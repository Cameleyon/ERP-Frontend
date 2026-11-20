type NamedProduct = { id: number; name: string; sku: string; active: boolean }

function searchKey(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

export function suggestProducts<T extends NamedProduct>(products: T[], query: string, limit = 8): T[] {
  const key = searchKey(query)
  if (!key) return []
  return products.filter(product => product.active && searchKey(product.name).includes(key))
    .sort((a, b) => Number(!searchKey(a.name).startsWith(key)) - Number(!searchKey(b.name).startsWith(key))
      || a.name.localeCompare(b.name) || a.sku.localeCompare(b.sku) || a.id - b.id)
    .slice(0, limit)
}
