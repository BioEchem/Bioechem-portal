type ProfileFormFeedbackProps = {
  error: string | null;
  success: string | null;
};

export function ProfileFormFeedback({ error, success }: ProfileFormFeedbackProps) {
  return (
    <>
      {error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          role="status"
        >
          {success}
        </p>
      ) : null}
    </>
  );
}
