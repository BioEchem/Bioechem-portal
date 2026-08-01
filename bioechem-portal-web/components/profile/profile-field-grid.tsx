export type ProfileField = {
  label: string;
  value: string | null | undefined;
  fullWidth?: boolean;
};

export function ProfileFieldGrid({ fields }: { fields: ProfileField[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div
          key={field.label}
          className={field.fullWidth ? "sm:col-span-2" : undefined}
        >
          <dt className="text-sm text-bio-text-muted">{field.label}</dt>
          <dd className="mt-0.5 text-sm font-medium text-bio-text">
            {field.value?.trim() ? field.value : "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
