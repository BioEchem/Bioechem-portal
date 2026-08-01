"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  authInputClassName,
  authLabelClassName,
} from "@/components/auth/form-styles";
import { ProfileEditPanel } from "@/components/profile/profile-edit-panel";
import { ProfileFieldGrid } from "@/components/profile/profile-field-grid";
import { ProfileFormFeedback } from "@/components/profile/profile-form-feedback";
import {
  ProfileEditButton,
  ProfileSection,
} from "@/components/profile/profile-section";
import type { AuthApiError } from "@/lib/auth/types";
import {
  ADDRESS_FIELD_LABELS,
  formatAddressSingleLine,
  hasRequiredAddress,
  normalizeAddressInput,
  type ProfileAddress,
} from "@/lib/profile/address";
import { GENDER_OPTIONS } from "@/lib/profile/gender";
import type { UpdateProfileSuccessResponse } from "@/lib/profile/types";

type ProfilePersonalSectionProps = {
  role: string;
  initialFirstName: string;
  initialLastName: string;
  initialMiddleName: string;
  initialAge: number | null;
  initialAddress: ProfileAddress;
  initialPhone: string;
  initialGender: string;
};

function getGenderLabel(value: string): string {
  return GENDER_OPTIONS.find((option) => option.value === value)?.label ?? "—";
}

export function ProfilePersonalSection({
  role,
  initialFirstName,
  initialLastName,
  initialMiddleName,
  initialAge,
  initialAddress,
  initialPhone,
  initialGender,
}: ProfilePersonalSectionProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [middleName, setMiddleName] = useState(initialMiddleName);
  const [age, setAge] = useState(initialAge != null ? String(initialAge) : "");
  const [addressStreet, setAddressStreet] = useState(initialAddress.street ?? "");
  const [addressApt, setAddressApt] = useState(initialAddress.apt ?? "");
  const [addressCity, setAddressCity] = useState(initialAddress.city ?? "");
  const [addressState, setAddressState] = useState(initialAddress.state ?? "");
  const [addressCountry, setAddressCountry] = useState(initialAddress.country ?? "");
  const [addressZip, setAddressZip] = useState(initialAddress.zip ?? "");
  const [phone, setPhone] = useState(initialPhone);
  const [gender, setGender] = useState(initialGender);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isParticipant = role === "participant";
  const formattedAddress = formatAddressSingleLine(initialAddress);

  function resetForm() {
    setFirstName(initialFirstName);
    setLastName(initialLastName);
    setMiddleName(initialMiddleName);
    setAge(initialAge != null ? String(initialAge) : "");
    setAddressStreet(initialAddress.street ?? "");
    setAddressApt(initialAddress.apt ?? "");
    setAddressCity(initialAddress.city ?? "");
    setAddressState(initialAddress.state ?? "");
    setAddressCountry(initialAddress.country ?? "");
    setAddressZip(initialAddress.zip ?? "");
    setPhone(initialPhone);
    setGender(initialGender);
    setError(null);
  }

  function openEdit() {
    resetForm();
    setEditing(true);
  }

  function closeEdit() {
    if (pending) return;
    resetForm();
    setEditing(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedAge =
      age.trim() === "" ? null : Number.parseInt(age.trim(), 10);
    const address = normalizeAddressInput({
      street: addressStreet,
      apt: addressApt,
      city: addressCity,
      state: addressState,
      country: addressCountry,
      zip: addressZip,
    });

    if (isParticipant && (parsedAge == null || Number.isNaN(parsedAge))) {
      setError("Age is required for participants.");
      return;
    }

    if (isParticipant && !hasRequiredAddress(address)) {
      setError("Street, city, state, country, and ZIP code are required.");
      return;
    }

    if (isParticipant && !phone.trim()) {
      setError("Phone number is required for participants.");
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "personal",
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          middleName: middleName.trim() || null,
          age: isParticipant ? parsedAge : null,
          addressStreet: address.street,
          addressApt: address.apt,
          addressCity: address.city,
          addressState: address.state,
          addressCountry: address.country,
          addressZip: address.zip,
          phone: phone.trim() || null,
          gender: gender || null,
        }),
      });

      const data = (await response.json()) as
        | UpdateProfileSuccessResponse
        | AuthApiError;

      if (!response.ok || !("ok" in data)) {
        setError("error" in data ? data.error.message : "Could not save profile.");
        return;
      }

      setEditing(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const viewFields = [
    { label: "First name", value: initialFirstName },
    { label: "Last name", value: initialLastName },
    ...(initialMiddleName.trim()
      ? [{ label: "Middle name", value: initialMiddleName }]
      : []),
    ...(isParticipant ? [{ label: "Age", value: initialAge != null ? String(initialAge) : null }] : []),
    { label: "Gender", value: getGenderLabel(initialGender) },
    { label: "Address", value: formattedAddress, fullWidth: true },
    { label: "Phone number", value: initialPhone, fullWidth: true },
  ];

  return (
    <>
      <ProfileSection
        title="Personal details"
        description="Your name, contact information, and other personal details."
        action={<ProfileEditButton onClick={openEdit} />}
      >
        <ProfileFieldGrid fields={viewFields} />
      </ProfileSection>

      <ProfileEditPanel
        title="personal details"
        open={editing}
        pending={pending}
        onClose={closeEdit}
        onSubmit={handleSubmit}
        feedback={<ProfileFormFeedback error={error} success={null} />}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-first-name" className={authLabelClassName}>
              First name
            </label>
            <input
              id="profile-first-name"
              type="text"
              autoComplete="given-name"
              required
              disabled={pending}
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className={authInputClassName}
            />
          </div>

          <div>
            <label htmlFor="profile-last-name" className={authLabelClassName}>
              Last name
            </label>
            <input
              id="profile-last-name"
              type="text"
              autoComplete="family-name"
              required
              disabled={pending}
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className={authInputClassName}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="profile-middle-name" className={authLabelClassName}>
              Middle name{" "}
              <span className="font-normal text-bio-text-muted">(optional)</span>
            </label>
            <input
              id="profile-middle-name"
              type="text"
              autoComplete="additional-name"
              disabled={pending}
              value={middleName}
              onChange={(event) => setMiddleName(event.target.value)}
              className={authInputClassName}
            />
          </div>

          {isParticipant ? (
            <div>
              <label htmlFor="profile-age" className={authLabelClassName}>
                Age
              </label>
              <input
                id="profile-age"
                type="number"
                min={1}
                required
                disabled={pending}
                value={age}
                onChange={(event) => setAge(event.target.value)}
                className={authInputClassName}
              />
            </div>
          ) : null}

          <div className={isParticipant ? "" : "sm:col-span-2"}>
            <label htmlFor="profile-gender" className={authLabelClassName}>
              Gender
            </label>
            <select
              id="profile-gender"
              disabled={pending}
              value={gender}
              onChange={(event) => setGender(event.target.value)}
              className={authInputClassName}
            >
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value || "unset"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="profile-address-street" className={authLabelClassName}>
              {ADDRESS_FIELD_LABELS.street}
              {isParticipant ? " *" : ""}
            </label>
            <input
              id="profile-address-street"
              type="text"
              autoComplete="address-line1"
              required={isParticipant}
              disabled={pending}
              value={addressStreet}
              onChange={(event) => setAddressStreet(event.target.value)}
              className={authInputClassName}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="profile-address-apt" className={authLabelClassName}>
              {ADDRESS_FIELD_LABELS.apt}{" "}
              <span className="font-normal text-bio-text-muted">(optional)</span>
            </label>
            <input
              id="profile-address-apt"
              type="text"
              autoComplete="address-line2"
              disabled={pending}
              value={addressApt}
              onChange={(event) => setAddressApt(event.target.value)}
              className={authInputClassName}
            />
          </div>

          <div>
            <label htmlFor="profile-address-city" className={authLabelClassName}>
              {ADDRESS_FIELD_LABELS.city}
              {isParticipant ? " *" : ""}
            </label>
            <input
              id="profile-address-city"
              type="text"
              autoComplete="address-level2"
              required={isParticipant}
              disabled={pending}
              value={addressCity}
              onChange={(event) => setAddressCity(event.target.value)}
              className={authInputClassName}
            />
          </div>

          <div>
            <label htmlFor="profile-address-state" className={authLabelClassName}>
              {ADDRESS_FIELD_LABELS.state}
              {isParticipant ? " *" : ""}
            </label>
            <input
              id="profile-address-state"
              type="text"
              autoComplete="address-level1"
              required={isParticipant}
              disabled={pending}
              value={addressState}
              onChange={(event) => setAddressState(event.target.value)}
              className={authInputClassName}
            />
          </div>

          <div>
            <label htmlFor="profile-address-country" className={authLabelClassName}>
              {ADDRESS_FIELD_LABELS.country}
              {isParticipant ? " *" : ""}
            </label>
            <input
              id="profile-address-country"
              type="text"
              autoComplete="country-name"
              required={isParticipant}
              disabled={pending}
              value={addressCountry}
              onChange={(event) => setAddressCountry(event.target.value)}
              className={authInputClassName}
            />
          </div>

          <div>
            <label htmlFor="profile-address-zip" className={authLabelClassName}>
              {ADDRESS_FIELD_LABELS.zip}
              {isParticipant ? " *" : ""}
            </label>
            <input
              id="profile-address-zip"
              type="text"
              autoComplete="postal-code"
              required={isParticipant}
              disabled={pending}
              value={addressZip}
              onChange={(event) => setAddressZip(event.target.value)}
              className={authInputClassName}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="profile-phone" className={authLabelClassName}>
              Phone number{isParticipant ? " *" : ""}
            </label>
            <input
              id="profile-phone"
              type="tel"
              autoComplete="tel"
              required={isParticipant}
              disabled={pending}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={authInputClassName}
            />
          </div>
        </div>
      </ProfileEditPanel>
    </>
  );
}
