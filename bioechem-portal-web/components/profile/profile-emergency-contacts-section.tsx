"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  authInputClassName,
  authLabelClassName,
} from "@/components/auth/form-styles";
import { ProfileEditPanel } from "@/components/profile/profile-edit-panel";
import { ProfileFormFeedback } from "@/components/profile/profile-form-feedback";
import { ProfileFieldGrid } from "@/components/profile/profile-field-grid";
import {
  ProfileEditButton,
  ProfileSection,
} from "@/components/profile/profile-section";
import type { AuthApiError } from "@/lib/auth/types";
import { emptyEmergencyContact } from "@/lib/profile/emergency-contacts";
import type { EmergencyContact, UpdateProfileSuccessResponse } from "@/lib/profile/types";

type ProfileEmergencyContactsSectionProps = {
  initialContacts: EmergencyContact[];
};

export function ProfileEmergencyContactsSection({
  initialContacts,
}: ProfileEmergencyContactsSectionProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [contacts, setContacts] = useState<EmergencyContact[]>(
    initialContacts.length > 0 ? initialContacts : [emptyEmergencyContact()],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function resetForm() {
    setContacts(initialContacts.length > 0 ? initialContacts : [emptyEmergencyContact()]);
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

  function updateContact(index: number, field: keyof EmergencyContact, value: string) {
    setContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    );
  }

  function addContact() {
    setContacts((prev) => (prev.length < 3 ? [...prev, emptyEmergencyContact()] : prev));
  }

  function removeContact(index: number) {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const filled = contacts.filter((c) => c.name.trim() || c.phone.trim());
    if (filled.length === 0) {
      setError("At least one emergency contact is required.");
      return;
    }
    for (const c of filled) {
      if (!c.name.trim() || !c.phone.trim() || !c.relationship.trim()) {
        setError("Each contact needs a name, phone number, and relationship.");
        return;
      }
    }

    setPending(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "emergency_contacts",
          emergencyContacts: filled,
        }),
      });

      const data = (await response.json()) as UpdateProfileSuccessResponse | AuthApiError;

      if (!response.ok || !("ok" in data)) {
        setError("error" in data ? data.error.message : "Could not save contacts.");
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

  return (
    <>
      <ProfileSection
        title="Emergency contacts"
        description="People to contact in case of an emergency."
        action={<ProfileEditButton onClick={openEdit} />}
      >
        {initialContacts.length === 0 ? (
          <p className="text-sm text-bio-text-muted">No emergency contacts added yet.</p>
        ) : (
          <div className="space-y-4">
            {initialContacts.map((contact, i) => (
              <div key={i}>
                {initialContacts.length > 1 ? (
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-bio-text-muted">
                    Contact {i + 1}
                  </p>
                ) : null}
                <ProfileFieldGrid
                  fields={[
                    { label: "Name", value: contact.name },
                    { label: "Phone", value: contact.phone },
                    { label: "Relationship", value: contact.relationship, fullWidth: true },
                  ]}
                />
                {i < initialContacts.length - 1 ? (
                  <div className="mt-4 border-t border-card-border" />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </ProfileSection>

      <ProfileEditPanel
        title="emergency contacts"
        open={editing}
        pending={pending}
        onClose={closeEdit}
        onSubmit={handleSubmit}
        feedback={<ProfileFormFeedback error={error} success={null} />}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className={authLabelClassName}>Contacts *</p>
            {contacts.length < 3 ? (
              <button
                type="button"
                disabled={pending}
                onClick={addContact}
                className="flex items-center gap-1 text-sm font-medium text-bio-green hover:text-bio-green/80 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add contact
              </button>
            ) : null}
          </div>

          {contacts.map((contact, index) => (
            <div
              key={index}
              className="grid grid-cols-1 gap-3 rounded-lg border border-card-border bg-bio-mint/30 p-4 sm:grid-cols-2"
            >
              <div>
                <label htmlFor={`ec-name-${index}`} className={authLabelClassName}>
                  Name *
                </label>
                <input
                  id={`ec-name-${index}`}
                  type="text"
                  required
                  disabled={pending}
                  value={contact.name}
                  onChange={(e) => updateContact(index, "name", e.target.value)}
                  className={authInputClassName}
                />
              </div>

              <div>
                <label htmlFor={`ec-phone-${index}`} className={authLabelClassName}>
                  Phone *
                </label>
                <input
                  id={`ec-phone-${index}`}
                  type="tel"
                  required
                  disabled={pending}
                  value={contact.phone}
                  onChange={(e) => updateContact(index, "phone", e.target.value)}
                  className={authInputClassName}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor={`ec-rel-${index}`} className={authLabelClassName}>
                  Relationship *
                </label>
                <input
                  id={`ec-rel-${index}`}
                  type="text"
                  required
                  disabled={pending}
                  value={contact.relationship}
                  onChange={(e) => updateContact(index, "relationship", e.target.value)}
                  placeholder="e.g. Parent, Guardian"
                  className={authInputClassName}
                />
              </div>

              {contacts.length > 1 ? (
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => removeContact(index)}
                    className="text-sm text-red-600 hover:underline disabled:opacity-50"
                  >
                    Remove contact
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </ProfileEditPanel>
    </>
  );
}
