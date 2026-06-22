"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authInputClassName, authLabelClassName } from "@/components/auth/form-styles";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming","District of Columbia",
];

type School = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_partner: boolean;
  is_active: boolean;
} | null;

export function AdminSchoolForm({ school }: { school: School }) {
  const router = useRouter();
  const isNew = !school;

  const [name, setName] = useState(school?.name ?? "");
  const [description, setDescription] = useState(school?.description ?? "");
  const [city, setCity] = useState(school?.city ?? "");
  const [state, setState] = useState(school?.state ?? "");
  const [country, setCountry] = useState(school?.country ?? "United States");
  const [website, setWebsite] = useState(school?.website ?? "");
  const [contactEmail, setContactEmail] = useState(school?.contact_email ?? "");
  const [contactPhone, setContactPhone] = useState(school?.contact_phone ?? "");
  const [isPartner, setIsPartner] = useState(school?.is_partner ?? true);
  const [isActive, setIsActive] = useState(school?.is_active ?? true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUS = country.trim().toLowerCase() === "united states" || country.trim().toLowerCase() === "us" || country.trim().toLowerCase() === "usa";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    setError(null);
    setPending(true);

    try {
      const url = isNew ? "/api/admin/schools" : `/api/admin/schools/${school!.id}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, city, state, country, website, contactEmail, contactPhone, isPartner, isActive }),
      });
      const json = await res.json() as { data?: { id: string }; error?: string };
      if (!res.ok) { setError(json.error ?? "Failed to save."); return; }
      // New school → list; edit → back to overview
      router.push(isNew ? "/admin/schools" : `/admin/schools/${school!.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleDeactivate() {
    if (!school || !confirm(`Deactivate "${school.name}"? This hides it from signups.`)) return;
    setPending(true);
    try {
      await fetch(`/api/admin/schools/${school.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      router.push(`/admin/schools/${school.id}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={authLabelClassName}>School name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            placeholder="e.g. Lincoln High School"
            className={authInputClassName}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={authLabelClassName}>
            Description <span className="font-normal text-bio-text-muted">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={pending}
            rows={2}
            className="mt-1 w-full resize-y rounded-lg border border-card-border bg-bio-white px-3 py-2.5 text-sm text-bio-text focus:border-bio-green focus:outline-none focus:ring-2 focus:ring-bio-green/25"
          />
        </div>

        <div>
          <label className={authLabelClassName}>City</label>
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)} disabled={pending} className={authInputClassName} />
        </div>
        <div>
          <label className={authLabelClassName}>Country</label>
          <input
            type="text"
            value={country}
            onChange={(e) => { setCountry(e.target.value); setState(""); }}
            disabled={pending}
            className={authInputClassName}
          />
        </div>
        <div>
          <label className={authLabelClassName}>State / Province</label>
          {isUS ? (
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              disabled={pending}
              className={authInputClassName}
            >
              <option value="">— Select state —</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              disabled={pending}
              placeholder="State / Province / Region"
              className={authInputClassName}
            />
          )}
        </div>
        <div>
          <label className={authLabelClassName}>Website</label>
          <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} disabled={pending} placeholder="https://" className={authInputClassName} />
        </div>
        <div>
          <label className={authLabelClassName}>Contact email</label>
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} disabled={pending} className={authInputClassName} />
        </div>
        <div>
          <label className={authLabelClassName}>Contact phone</label>
          <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} disabled={pending} className={authInputClassName} />
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-bio-text">
          <input
            type="checkbox"
            checked={isPartner}
            onChange={(e) => setIsPartner(e.target.checked)}
            disabled={pending}
            className="h-4 w-4 accent-bio-green"
          />
          Partner school (appears in signup)
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-bio-text">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={pending}
            className="h-4 w-4 accent-bio-green"
          />
          Active
        </label>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-card-border pt-4">
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-50"
          >
            {pending ? "Saving…" : isNew ? "Create school" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            disabled={pending}
            className="rounded-lg border border-card-border px-4 py-2 text-sm text-bio-text-muted hover:text-bio-text disabled:opacity-50"
          >
            Cancel
          </button>
        </div>

        {!isNew && school?.is_active ? (
          <button
            type="button"
            onClick={() => void handleDeactivate()}
            disabled={pending}
            className="text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
          >
            Deactivate school
          </button>
        ) : null}
      </div>
    </form>
  );
}
