type NamedProduct = { id: number; name: string; sku: string; barcode?: string | null; active: boolean }

function searchKey(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

export function suggestProducts<T extends NamedProduct>(products: T[], query: string, limit = 8): T[] {
  const key = searchKey(query)
  if (!key) return []
  const rank = (product: T) => searchKey(product.sku) === key || searchKey(product.barcode ?? "") === key
    ? 0 : searchKey(product.name).startsWith(key) ? 1 : 2
  return products.filter(product => product.active && [product.name, product.sku, product.barcode ?? ""]
    .some(value => searchKey(value).includes(key)))
    .sort((a, b) => rank(a) - rank(b)
      || a.name.localeCompare(b.name) || a.sku.localeCompare(b.sku) || a.id - b.id)
    .slice(0, limit)
}
