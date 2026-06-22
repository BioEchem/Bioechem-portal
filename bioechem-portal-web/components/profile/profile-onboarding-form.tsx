"use client";

import { Camera, FileText, Paperclip, Plus, UserCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import {
  authErrorMessageClassName,
  authInputClassName,
  authLabelClassName,
  authSubmitButtonClassName,
} from "@/components/auth/form-styles";
import type { AuthApiError } from "@/lib/auth/types";
import { roleAllowsCohortOnSignup, roleRequiresPartnerSchool } from "@/lib/auth/roles";
import {
  ADDRESS_FIELD_LABELS,
  hasRequiredAddress,
  normalizeAddressInput,
  type ProfileAddress,
} from "@/lib/profile/address";
import { DEGREE_OPTIONS, emptyEducationEntry } from "@/lib/profile/education";
import { emptyEmergencyContact } from "@/lib/profile/emergency-contacts";
import { GENDER_OPTIONS } from "@/lib/profile/gender";
import { GRADE_OPTIONS } from "@/lib/profile/grade";
import type {
  CohortOption,
  EducationEntry,
  EmergencyContact,
  SchoolOption,
  UpdateProfileSuccessResponse,
  WorkEntry,
} from "@/lib/profile/types";
import { emptyWorkEntry, MONTH_OPTIONS, WORK_TYPE_OPTIONS } from "@/lib/profile/work";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/client";

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [
  { value: "", label: "Year" },
  ...Array.from({ length: currentYear - 1939 + 5 }, (_, i) => {
    const y = String(currentYear + 4 - i);
    return { value: y, label: y };
  }),
];

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MAX_RESUME_BYTES = 10 * 1024 * 1024;

type ProfileOnboardingFormProps = {
  userId: string;
  role: string;
  initialFirstName: string;
  initialLastName: string;
  initialMiddleName: string;
  initialAge: number | null;
  initialAddress: ProfileAddress;
  initialPhone: string;
  initialGender: string;
  initialAvatarUrl: string | null;
  initialBio: string;
  initialSchoolId: string | null;
  initialOtherSchoolName: string | null;
  initialCohortId: string | null;
  initialState: string;
  initialSchoolCountry: string;
  initialGrade: string;
  initialEducation: EducationEntry[];
  initialWorkHistory: WorkEntry[];
  initialResumeUrl: string | null;
  initialEmergencyContacts: EmergencyContact[];
  schools: SchoolOption[];
  cohorts: CohortOption[];
};

const optionalSpan = (
  <span className="font-normal text-bio-text-muted">(optional)</span>
);

const boxClassName =
  "space-y-4 rounded-lg border border-card-border bg-bio-mint/10 p-4";
const boxHeadingClassName = "text-sm font-semibold text-bio-text";
const textareaClassName =
  "mt-1 w-full rounded-lg border border-card-border bg-bio-white px-3 py-2.5 text-sm text-bio-text placeholder:text-bio-text-muted/70 focus:border-bio-green focus:outline-none focus:ring-2 focus:ring-bio-green/25 resize-y min-h-[100px]";

export function ProfileOnboardingForm({
  userId,
  role,
  initialFirstName,
  initialLastName,
  initialMiddleName,
  initialAge,
  initialAddress,
  initialPhone,
  initialGender,
  initialAvatarUrl,
  initialBio,
  initialSchoolId,
  initialOtherSchoolName,
  initialCohortId,
  initialState,
  initialSchoolCountry,
  initialGrade,
  initialEducation,
  initialWorkHistory,
  initialResumeUrl,
  initialEmergencyContacts,
  schools,
  cohorts,
}: ProfileOnboardingFormProps) {
  const router = useRouter();
  const isParticipant = role === "participant";
  const showSchoolSection = isParticipant && roleRequiresPartnerSchool(role);
  const showClass = roleAllowsCohortOnSignup(role);
  const usesOtherSchool = Boolean(initialOtherSchoolName?.trim());

  // Personal
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [middleName, setMiddleName] = useState(initialMiddleName);
  const [age, setAge] = useState(initialAge != null ? String(initialAge) : "");
  const [gender, setGender] = useState(initialGender);
  const [phone, setPhone] = useState(initialPhone);
  const [bio, setBio] = useState(initialBio);

  // Address
  const [addressStreet, setAddressStreet] = useState(initialAddress.street ?? "");
  const [addressApt, setAddressApt] = useState(initialAddress.apt ?? "");
  const [addressCity, setAddressCity] = useState(initialAddress.city ?? "");
  const [addressState, setAddressState] = useState(initialAddress.state ?? "");
  const [addressCountry, setAddressCountry] = useState(initialAddress.country ?? "");
  const [addressZip, setAddressZip] = useState(initialAddress.zip ?? "");

  // School (participant)
  const [schoolId, setSchoolId] = useState(initialSchoolId ?? "");
  const [otherSchoolName, setOtherSchoolName] = useState(initialOtherSchoolName ?? "");
  const [cohortId, setCohortId] = useState(initialCohortId ?? "");
  const [state, setState] = useState(initialState);
  const [schoolCountry, setSchoolCountry] = useState(initialSchoolCountry);
  const [grade, setGrade] = useState(initialGrade);

  // Background (all roles)
  const [educationEntries, setEducationEntries] = useState<EducationEntry[]>(initialEducation);
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>(initialWorkHistory);

  // Emergency contacts (participant)
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(
    initialEmergencyContacts.length > 0
      ? initialEmergencyContacts
      : [emptyEmergencyContact()],
  );

  // Avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Resume
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [existingResumeUrl] = useState<string | null>(initialResumeUrl);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const cohortOptions = useMemo(
    () => cohorts.filter((c) => c.schoolId === schoolId),
    [cohorts, schoolId],
  );

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Profile photo must be under 5 MB.");
      event.target.value = "";
      return;
    }
    setError(null);
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleResumeChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_RESUME_BYTES) {
      setError("Resume must be under 10 MB.");
      event.target.value = "";
      return;
    }
    setError(null);
    setResumeFile(file);
  }

  function updateContact(index: number, field: keyof EmergencyContact, value: string) {
    setEmergencyContacts((current) =>
      current.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact,
      ),
    );
  }

  function updateEducation(index: number, updates: Partial<EducationEntry>) {
    setEducationEntries((current) =>
      current.map((entry, i) => (i === index ? { ...entry, ...updates } : entry)),
    );
  }

  function removeEducation(index: number) {
    setEducationEntries((current) => current.filter((_, i) => i !== index));
  }

  function updateWork(index: number, updates: Partial<WorkEntry>) {
    setWorkEntries((current) =>
      current.map((entry, i) => (i === index ? { ...entry, ...updates } : entry)),
    );
  }

  function removeWork(index: number) {
    setWorkEntries((current) => current.filter((_, i) => i !== index));
  }

  async function patchProfile(body: Record<string, unknown>) {
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as UpdateProfileSuccessResponse | AuthApiError;
    if (!response.ok || !("ok" in data)) {
      throw new Error("error" in data ? data.error.message : "Could not save profile.");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedAge = age.trim() === "" ? null : Number.parseInt(age.trim(), 10);
    const address = normalizeAddressInput({
      street: addressStreet,
      apt: addressApt,
      city: addressCity,
      state: addressState,
      country: addressCountry,
      zip: addressZip,
    });

    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    if (!phone.trim()) {
      setError("Phone number is required.");
      return;
    }
    if (!hasRequiredAddress(address)) {
      setError("Street address, city, state, country, and ZIP code are required.");
      return;
    }
    if (isParticipant && (parsedAge == null || Number.isNaN(parsedAge))) {
      setError("Age is required for participants.");
      return;
    }
    if (showSchoolSection && !state.trim()) {
      setError("School state is required.");
      return;
    }
    if (showSchoolSection) {
      for (const contact of emergencyContacts) {
        if (!contact.name.trim() || !contact.phone.trim() || !contact.relationship.trim()) {
          setError("Each emergency contact needs a name, phone, and relationship.");
          return;
        }
      }
    }

    setPending(true);

    try {
      const supabaseBrowser = createClient();

      // Upload avatar (optional, never blocks save)
      let uploadedAvatarUrl: string | undefined;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() ?? "jpg";
        const { error: uploadErr } = await supabaseBrowser.storage
          .from("avatars")
          .upload(`${userId}/avatar.${ext}`, avatarFile, { upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabaseBrowser.storage
            .from("avatars")
            .getPublicUrl(`${userId}/avatar.${ext}`);
          uploadedAvatarUrl = urlData.publicUrl;
        }
      }

      // Upload resume (optional, never blocks save)
      let uploadedResumeUrl: string | undefined;
      if (resumeFile) {
        const ext = resumeFile.name.split(".").pop() ?? "pdf";
        const path = `${userId}/${Date.now()}_resume.${ext}`;
        const { error: uploadErr } = await supabaseBrowser.storage
          .from("resumes")
          .upload(path, resumeFile);
        if (!uploadErr) {
          const { data: urlData } = supabaseBrowser.storage
            .from("resumes")
            .getPublicUrl(path);
          uploadedResumeUrl = urlData.publicUrl;
          // Record in resume history (fire and forget — doesn't block save)
          void fetch("/api/profile/resume", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: uploadedResumeUrl, filename: resumeFile.name }),
          });
        }
      }

      // 1. Personal section
      await patchProfile({
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
        phone: phone.trim(),
        gender: gender || null,
        bio: bio.trim() || null,
        ...(uploadedAvatarUrl !== undefined ? { avatarUrl: uploadedAvatarUrl } : {}),
      });

      // 2. School section (participant)
      if (showSchoolSection) {
        await patchProfile(
          usesOtherSchool
            ? {
                section: "school",
                otherSchoolName: otherSchoolName.trim() || null,
                state: state.trim(),
                schoolCountry: schoolCountry.trim() || null,
                grade: grade || null,
              }
            : {
                section: "school",
                schoolId: schoolId || null,
                cohortId: showClass && cohortId ? cohortId : null,
                state: state.trim(),
                schoolCountry: schoolCountry.trim() || null,
                grade: grade || null,
              },
        );

        // 2b. Emergency contacts (participant — separate section)
        await patchProfile({
          section: "emergency_contacts",
          emergencyContacts,
        });
      }

      // 3. Background section (all roles)
      await patchProfile({
        section: "background",
        education: educationEntries,
        workHistory: workEntries,
        ...(uploadedResumeUrl !== undefined ? { resumeUrl: uploadedResumeUrl } : {}),
      });

      router.push(AUTH_ROUTES.dashboard);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save profile.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-10" onSubmit={handleSubmit} noValidate>
      {/* ── Profile photo ── */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-card-border bg-bio-mint/20">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Profile photo preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-bio-text-muted">
                <UserCircle className="h-16 w-16" strokeWidth={1.25} />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={pending}
            aria-label="Upload profile photo"
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-card-border bg-bio-white shadow-sm hover:bg-bio-mint/10 disabled:opacity-50"
          >
            <Camera className="h-4 w-4 text-bio-text-muted" />
          </button>
        </div>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <p className="text-center text-xs text-bio-text-muted">
          Profile photo <span className="font-medium text-bio-green">optional</span> — you
          can also update this later in account settings.
        </p>
      </div>

      {/* ── Personal details ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-bio-green">Personal details</h2>
          <p className="mt-1 text-sm text-bio-text-muted">
            Contact information required to access the portal.
          </p>
        </div>

        {/* Personal information box */}
        <div className={boxClassName}>
          <p className={boxHeadingClassName}>Personal information</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="ob-first-name" className={authLabelClassName}>
                First name *
              </label>
              <input
                id="ob-first-name"
                type="text"
                autoComplete="given-name"
                required
                disabled={pending}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={authInputClassName}
              />
            </div>

            <div>
              <label htmlFor="ob-last-name" className={authLabelClassName}>
                Last name *
              </label>
              <input
                id="ob-last-name"
                type="text"
                autoComplete="family-name"
                required
                disabled={pending}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={authInputClassName}
              />
            </div>

            <div>
              <label htmlFor="ob-middle-name" className={authLabelClassName}>
                Middle name {optionalSpan}
              </label>
              <input
                id="ob-middle-name"
                type="text"
                autoComplete="additional-name"
                disabled={pending}
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className={authInputClassName}
              />
            </div>

            {isParticipant ? (
              <div>
                <label htmlFor="ob-age" className={authLabelClassName}>
                  Age *
                </label>
                <input
                  id="ob-age"
                  type="number"
                  min={1}
                  required
                  disabled={pending}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className={authInputClassName}
                />
              </div>
            ) : null}

            <div>
              <label htmlFor="ob-gender" className={authLabelClassName}>
                Gender
              </label>
              <select
                id="ob-gender"
                disabled={pending}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={authInputClassName}
              >
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value || "unset"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ob-phone" className={authLabelClassName}>
                Phone number *
              </label>
              <input
                id="ob-phone"
                type="tel"
                autoComplete="tel"
                required
                disabled={pending}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={authInputClassName}
              />
            </div>
          </div>

          <div>
            <label htmlFor="ob-bio" className={authLabelClassName}>
              Short bio {optionalSpan}
            </label>
            <textarea
              id="ob-bio"
              disabled={pending}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us a bit about yourself…"
              className={textareaClassName}
            />
          </div>
        </div>

        {/* Home address box */}
        <div className={boxClassName}>
          <p className={boxHeadingClassName}>Home address</p>

          {/* Street + Apt on the same line */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[3fr_1fr]">
            <div>
              <label htmlFor="ob-street" className={authLabelClassName}>
                {ADDRESS_FIELD_LABELS.street} *
              </label>
              <input
                id="ob-street"
                type="text"
                autoComplete="address-line1"
                required
                disabled={pending}
                value={addressStreet}
                onChange={(e) => setAddressStreet(e.target.value)}
                className={authInputClassName}
              />
            </div>

            <div>
              <label htmlFor="ob-apt" className={authLabelClassName}>
                {ADDRESS_FIELD_LABELS.apt} {optionalSpan}
              </label>
              <input
                id="ob-apt"
                type="text"
                autoComplete="address-line2"
                disabled={pending}
                value={addressApt}
                onChange={(e) => setAddressApt(e.target.value)}
                className={authInputClassName}
              />
            </div>
          </div>

          {/* City / State / ZIP */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr]">
            <div>
              <label htmlFor="ob-city" className={authLabelClassName}>
                {ADDRESS_FIELD_LABELS.city} *
              </label>
              <input
                id="ob-city"
                type="text"
                autoComplete="address-level2"
                required
                disabled={pending}
                value={addressCity}
                onChange={(e) => setAddressCity(e.target.value)}
                className={authInputClassName}
              />
            </div>

            <div>
              <label htmlFor="ob-addr-state" className={authLabelClassName}>
                {ADDRESS_FIELD_LABELS.state} *
              </label>
              <input
                id="ob-addr-state"
                type="text"
                autoComplete="address-level1"
                required
                disabled={pending}
                value={addressState}
                onChange={(e) => setAddressState(e.target.value)}
                className={authInputClassName}
              />
            </div>

            <div>
              <label htmlFor="ob-zip" className={authLabelClassName}>
                {ADDRESS_FIELD_LABELS.zip} *
              </label>
              <input
                id="ob-zip"
                type="text"
                autoComplete="postal-code"
                required
                disabled={pending}
                value={addressZip}
                onChange={(e) => setAddressZip(e.target.value)}
                className={authInputClassName}
              />
            </div>
          </div>

          {/* Country */}
          <div className="sm:max-w-xs">
            <label htmlFor="ob-country" className={authLabelClassName}>
              {ADDRESS_FIELD_LABELS.country} *
            </label>
            <input
              id="ob-country"
              type="text"
              autoComplete="country-name"
              required
              disabled={pending}
              value={addressCountry}
              onChange={(e) => setAddressCountry(e.target.value)}
              className={authInputClassName}
            />
          </div>
        </div>
      </section>

      {/* ── School information (participant only) ── */}
      {showSchoolSection ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-bio-green">School information</h2>
            <p className="mt-1 text-sm text-bio-text-muted">
              Your current school and enrolment details.
            </p>
          </div>

          <div className={boxClassName}>
            <p className={boxHeadingClassName}>School details</p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {usesOtherSchool ? (
                <div className="sm:col-span-2 lg:col-span-3">
                  <label htmlFor="ob-other-school" className={authLabelClassName}>
                    School name
                  </label>
                  <input
                    id="ob-other-school"
                    type="text"
                    disabled={pending}
                    value={otherSchoolName}
                    onChange={(e) => setOtherSchoolName(e.target.value)}
                    className={authInputClassName}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="ob-school" className={authLabelClassName}>
                      School
                    </label>
                    <select
                      id="ob-school"
                      disabled={pending}
                      value={schoolId}
                      onChange={(e) => {
                        setSchoolId(e.target.value);
                        setCohortId("");
                      }}
                      className={authInputClassName}
                    >
                      <option value="">Select a school</option>
                      {schools.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {showClass ? (
                    <div>
                      <label htmlFor="ob-cohort" className={authLabelClassName}>
                        Class / cohort *
                      </label>
                      <select
                        id="ob-cohort"
                        required
                        disabled={pending || !schoolId}
                        value={cohortId}
                        onChange={(e) => setCohortId(e.target.value)}
                        className={authInputClassName}
                      >
                        <option value="">Select a class</option>
                        {cohortOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </>
              )}

              <div>
                <label htmlFor="ob-grade" className={authLabelClassName}>
                  Grade level {optionalSpan}
                </label>
                <select
                  id="ob-grade"
                  disabled={pending}
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className={authInputClassName}
                >
                  {GRADE_OPTIONS.map((opt) => (
                    <option key={opt.value || "none"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="ob-school-state" className={authLabelClassName}>
                  School state *
                </label>
                <input
                  id="ob-school-state"
                  type="text"
                  required
                  disabled={pending}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className={authInputClassName}
                />
              </div>

              <div>
                <label htmlFor="ob-school-country" className={authLabelClassName}>
                  School country {optionalSpan}
                </label>
                <input
                  id="ob-school-country"
                  type="text"
                  autoComplete="country-name"
                  disabled={pending}
                  value={schoolCountry}
                  onChange={(e) => setSchoolCountry(e.target.value)}
                  className={authInputClassName}
                />
              </div>
            </div>
          </div>

          {/* Emergency contacts box */}
          <div className={boxClassName}>
            <p className={boxHeadingClassName}>Emergency contacts *</p>
            <div className="space-y-3">
              {emergencyContacts.map((contact, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-card-border bg-bio-white p-3 sm:grid-cols-2"
                >
                  <div>
                    <label
                      htmlFor={`ob-contact-name-${index}`}
                      className={authLabelClassName}
                    >
                      Name
                    </label>
                    <input
                      id={`ob-contact-name-${index}`}
                      type="text"
                      required
                      disabled={pending}
                      value={contact.name}
                      onChange={(e) => updateContact(index, "name", e.target.value)}
                      className={authInputClassName}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`ob-contact-phone-${index}`}
                      className={authLabelClassName}
                    >
                      Phone
                    </label>
                    <input
                      id={`ob-contact-phone-${index}`}
                      type="tel"
                      required
                      disabled={pending}
                      value={contact.phone}
                      onChange={(e) => updateContact(index, "phone", e.target.value)}
                      className={authInputClassName}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor={`ob-contact-rel-${index}`}
                      className={authLabelClassName}
                    >
                      Relationship
                    </label>
                    <input
                      id={`ob-contact-rel-${index}`}
                      type="text"
                      required
                      disabled={pending}
                      value={contact.relationship}
                      onChange={(e) => updateContact(index, "relationship", e.target.value)}
                      placeholder="e.g. Parent, Guardian"
                      className={authInputClassName}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Background (all roles) ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-bio-green">Background</h2>
          <p className="mt-1 text-sm text-bio-text-muted">
            All fields are optional — add as much or as little as you like.
          </p>
        </div>

        {/* Education */}
        <div className={boxClassName}>
          <div className="flex items-center justify-between">
            <p className={boxHeadingClassName}>Education</p>
            <button
              type="button"
              onClick={() => setEducationEntries((prev) => [...prev, emptyEducationEntry()])}
              disabled={pending}
              className="flex items-center gap-1 text-sm font-medium text-bio-green hover:text-bio-green/80 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add education
            </button>
          </div>

          {educationEntries.length === 0 ? (
            <p className="text-sm text-bio-text-muted">
              No education added yet. Click <span className="font-medium">+ Add education</span> to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {educationEntries.map((entry, index) => (
                <div
                  key={index}
                  className="space-y-3 rounded-lg border border-card-border bg-bio-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-bio-text-muted">
                      Education {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeEducation(index)}
                      disabled={pending}
                      aria-label="Remove education entry"
                      className="text-bio-text-muted hover:text-red-500 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <label htmlFor={`ob-edu-inst-${index}`} className={authLabelClassName}>
                      School / Institution *
                    </label>
                    <input
                      id={`ob-edu-inst-${index}`}
                      type="text"
                      disabled={pending}
                      value={entry.institution}
                      onChange={(e) => updateEducation(index, { institution: e.target.value })}
                      placeholder="e.g. University of California, Berkeley"
                      className={authInputClassName}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`ob-edu-degree-${index}`} className={authLabelClassName}>
                        Degree {optionalSpan}
                      </label>
                      <select
                        id={`ob-edu-degree-${index}`}
                        disabled={pending}
                        value={entry.degree ?? ""}
                        onChange={(e) => updateEducation(index, { degree: e.target.value || null })}
                        className={authInputClassName}
                      >
                        {DEGREE_OPTIONS.map((opt) => (
                          <option key={opt.value || "none"} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`ob-edu-field-${index}`} className={authLabelClassName}>
                        Field of study {optionalSpan}
                      </label>
                      <input
                        id={`ob-edu-field-${index}`}
                        type="text"
                        disabled={pending}
                        value={entry.fieldOfStudy ?? ""}
                        onChange={(e) =>
                          updateEducation(index, { fieldOfStudy: e.target.value || null })
                        }
                        placeholder="e.g. Biology, Chemistry"
                        className={authInputClassName}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`ob-edu-start-${index}`} className={authLabelClassName}>
                        Start year {optionalSpan}
                      </label>
                      <select
                        id={`ob-edu-start-${index}`}
                        disabled={pending}
                        value={entry.startYear ?? ""}
                        onChange={(e) =>
                          updateEducation(index, { startYear: e.target.value || null })
                        }
                        className={authInputClassName}
                      >
                        {YEAR_OPTIONS.map((opt) => (
                          <option key={opt.value || "none"} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`ob-edu-end-${index}`} className={authLabelClassName}>
                        End year {optionalSpan}
                      </label>
                      <select
                        id={`ob-edu-end-${index}`}
                        disabled={pending || entry.isCurrent}
                        value={entry.isCurrent ? "" : (entry.endYear ?? "")}
                        onChange={(e) =>
                          updateEducation(index, { endYear: e.target.value || null })
                        }
                        className={authInputClassName}
                      >
                        {YEAR_OPTIONS.map((opt) => (
                          <option key={opt.value || "none"} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-sm text-bio-text">
                    <input
                      type="checkbox"
                      checked={entry.isCurrent}
                      onChange={(e) =>
                        updateEducation(index, {
                          isCurrent: e.target.checked,
                          ...(e.target.checked ? { endYear: null } : {}),
                        })
                      }
                      disabled={pending}
                      className="h-4 w-4 accent-bio-green"
                    />
                    I currently attend here
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Work history */}
        <div className={boxClassName}>
          <div className="flex items-center justify-between">
            <p className={boxHeadingClassName}>Work history</p>
            <button
              type="button"
              onClick={() => setWorkEntries((prev) => [...prev, emptyWorkEntry()])}
              disabled={pending}
              className="flex items-center gap-1 text-sm font-medium text-bio-green hover:text-bio-green/80 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add position
            </button>
          </div>

          {workEntries.length === 0 ? (
            <p className="text-sm text-bio-text-muted">
              No work history added yet. Click <span className="font-medium">+ Add position</span> to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {workEntries.map((entry, index) => (
                <div
                  key={index}
                  className="space-y-3 rounded-lg border border-card-border bg-bio-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-bio-text-muted">
                      Position {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeWork(index)}
                      disabled={pending}
                      aria-label="Remove work entry"
                      className="text-bio-text-muted hover:text-red-500 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <label htmlFor={`ob-work-co-${index}`} className={authLabelClassName}>
                      Company / Organization *
                    </label>
                    <input
                      id={`ob-work-co-${index}`}
                      type="text"
                      disabled={pending}
                      value={entry.company}
                      onChange={(e) => updateWork(index, { company: e.target.value })}
                      placeholder="e.g. BioEChem Labs"
                      className={authInputClassName}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`ob-work-title-${index}`} className={authLabelClassName}>
                        Job title / Role {optionalSpan}
                      </label>
                      <input
                        id={`ob-work-title-${index}`}
                        type="text"
                        disabled={pending}
                        value={entry.title ?? ""}
                        onChange={(e) => updateWork(index, { title: e.target.value || null })}
                        placeholder="e.g. Research Intern"
                        className={authInputClassName}
                      />
                    </div>
                    <div>
                      <label htmlFor={`ob-work-type-${index}`} className={authLabelClassName}>
                        Type {optionalSpan}
                      </label>
                      <select
                        id={`ob-work-type-${index}`}
                        disabled={pending}
                        value={entry.type ?? ""}
                        onChange={(e) => updateWork(index, { type: e.target.value || null })}
                        className={authInputClassName}
                      >
                        <option value="">Select type</option>
                        {WORK_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={authLabelClassName}>Start date {optionalSpan}</label>
                      <div className="flex gap-2">
                        <select
                          disabled={pending}
                          value={entry.startMonth ?? ""}
                          onChange={(e) =>
                            updateWork(index, { startMonth: e.target.value || null })
                          }
                          className={authInputClassName}
                          aria-label="Start month"
                        >
                          {MONTH_OPTIONS.map((opt) => (
                            <option key={opt.value || "none"} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <select
                          disabled={pending}
                          value={entry.startYear ?? ""}
                          onChange={(e) =>
                            updateWork(index, { startYear: e.target.value || null })
                          }
                          className={authInputClassName}
                          aria-label="Start year"
                        >
                          {YEAR_OPTIONS.map((opt) => (
                            <option key={opt.value || "none"} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={authLabelClassName}>End date {optionalSpan}</label>
                      <div className="flex gap-2">
                        <select
                          disabled={pending || entry.isCurrent}
                          value={entry.isCurrent ? "" : (entry.endMonth ?? "")}
                          onChange={(e) =>
                            updateWork(index, { endMonth: e.target.value || null })
                          }
                          className={authInputClassName}
                          aria-label="End month"
                        >
                          {MONTH_OPTIONS.map((opt) => (
                            <option key={opt.value || "none"} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <select
                          disabled={pending || entry.isCurrent}
                          value={entry.isCurrent ? "" : (entry.endYear ?? "")}
                          onChange={(e) =>
                            updateWork(index, { endYear: e.target.value || null })
                          }
                          className={authInputClassName}
                          aria-label="End year"
                        >
                          {YEAR_OPTIONS.map((opt) => (
                            <option key={opt.value || "none"} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-sm text-bio-text">
                    <input
                      type="checkbox"
                      checked={entry.isCurrent}
                      onChange={(e) =>
                        updateWork(index, {
                          isCurrent: e.target.checked,
                          ...(e.target.checked ? { endMonth: null, endYear: null } : {}),
                        })
                      }
                      disabled={pending}
                      className="h-4 w-4 accent-bio-green"
                    />
                    I currently work here
                  </label>

                  <div>
                    <label htmlFor={`ob-work-desc-${index}`} className={authLabelClassName}>
                      Description {optionalSpan}
                    </label>
                    <textarea
                      id={`ob-work-desc-${index}`}
                      disabled={pending}
                      value={entry.description ?? ""}
                      onChange={(e) =>
                        updateWork(index, { description: e.target.value || null })
                      }
                      placeholder="Brief description of your role and responsibilities…"
                      className={textareaClassName}
                      style={{ minHeight: "80px" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Resume (participant only) ── */}
      {isParticipant ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-bio-green">Resume</h2>
            <p className="mt-1 text-sm text-bio-text-muted">
              Upload your resume or CV. You can add or replace it later in your account
              settings.
            </p>
          </div>

          <div className={boxClassName}>
            <p className={boxHeadingClassName}>
              Resume / CV {optionalSpan}
            </p>

            {existingResumeUrl && !resumeFile ? (
              <div className="flex items-center gap-2 rounded-lg border border-card-border bg-bio-white px-3 py-2.5 text-sm text-bio-text">
                <FileText className="h-4 w-4 shrink-0 text-bio-green" />
                <span className="flex-1 truncate">Resume on file</span>
                <a
                  href={existingResumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-bio-green underline hover:no-underline"
                >
                  View
                </a>
              </div>
            ) : null}

            {resumeFile ? (
              <div className="flex items-center gap-2 rounded-lg border border-bio-green/30 bg-bio-mint/20 px-3 py-2.5 text-sm text-bio-text">
                <FileText className="h-4 w-4 shrink-0 text-bio-green" />
                <span className="flex-1 truncate">{resumeFile.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setResumeFile(null);
                    if (resumeInputRef.current) resumeInputRef.current.value = "";
                  }}
                  className="text-bio-text-muted hover:text-bio-text"
                  aria-label="Remove selected resume"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => resumeInputRef.current?.click()}
              disabled={pending}
              className="flex items-center gap-2 rounded-lg border border-dashed border-card-border bg-bio-white px-4 py-3 text-sm text-bio-text-muted hover:border-bio-green/50 hover:text-bio-green disabled:opacity-50"
            >
              <Paperclip className="h-4 w-4" />
              {resumeFile
                ? "Replace resume"
                : existingResumeUrl
                  ? "Upload a new resume"
                  : "Choose file (PDF or DOC, max 10 MB)"}
            </button>
            <input
              ref={resumeInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={handleResumeChange}
            />
          </div>
        </section>
      ) : null}

      {error ? (
        <p className={authErrorMessageClassName} role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className={authSubmitButtonClassName} disabled={pending}>
        {pending ? "Saving…" : "Save and continue to dashboard"}
      </button>
    </form>
  );
}
