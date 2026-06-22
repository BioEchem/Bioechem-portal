/** Structured mailing address on profiles. */

export type ProfileAddress = {
  street: string | null;
  apt: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip: string | null;
};

export type ProfileAddressInput = {
  street?: string | null;
  apt?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip?: string | null;
};

export function normalizeAddressInput(input: ProfileAddressInput): ProfileAddress {
  return {
    street: input.street?.trim() || null,
    apt: input.apt?.trim() || null,
    city: input.city?.trim() || null,
    state: input.state?.trim() || null,
    country: input.country?.trim() || null,
    zip: input.zip?.trim() || null,
  };
}

export function hasRequiredAddress(address: ProfileAddress): boolean {
  return Boolean(
    address.street && address.city && address.state && address.country && address.zip,
  );
}

export function formatAddressLines(address: ProfileAddress): string[] {
  const lines: string[] = [];
  const streetLine = [address.street, address.apt].filter(Boolean).join(", ");
  if (streetLine) lines.push(streetLine);

  const cityLine = [address.city, address.state, address.zip].filter(Boolean).join(", ");
  if (cityLine) lines.push(cityLine);

  if (address.country) lines.push(address.country);

  return lines;
}

export function formatAddressSingleLine(address: ProfileAddress): string | null {
  const lines = formatAddressLines(address);
  return lines.length > 0 ? lines.join(" · ") : null;
}

export function profileRowToAddress(row: {
  address_street?: string | null;
  address_apt?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_country?: string | null;
  address_zip?: string | null;
}): ProfileAddress {
  return {
    street: row.address_street ?? null,
    apt: row.address_apt ?? null,
    city: row.address_city ?? null,
    state: row.address_state ?? null,
    country: row.address_country ?? null,
    zip: row.address_zip ?? null,
  };
}

export const ADDRESS_FIELD_LABELS = {
  street: "Street address",
  apt: "Apt / unit",
  city: "City",
  state: "State",
  country: "Country",
  zip: "ZIP code",
} as const;
