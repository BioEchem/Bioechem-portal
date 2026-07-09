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

/** Convert a profile_addresses row (from PostgREST join) to a ProfileAddress. */
export function addressRowToAddress(
  row: {
    street?: string | null;
    apt?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    zip?: string | null;
  } | null,
): ProfileAddress {
  if (!row) return { street: null, apt: null, city: null, state: null, country: null, zip: null };
  return {
    street: row.street ?? null,
    apt: row.apt ?? null,
    city: row.city ?? null,
    state: row.state ?? null,
    country: row.country ?? null,
    zip: row.zip ?? null,
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
