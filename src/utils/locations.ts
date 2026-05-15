import type { CompanyLocationResponse } from "../api/companyLocationsApi"

export function getDefaultLocationId(locations: CompanyLocationResponse[]) {
  const defaultLocation = locations.find((location) => location.primaryLocation) ?? locations[0]
  return defaultLocation?.id ? String(defaultLocation.id) : ""
}
