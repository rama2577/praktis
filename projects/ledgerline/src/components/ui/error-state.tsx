/** Error state dengan tombol coba lagi. */
export function ErrorState({
  message = "Terjadi kesalahan saat memuat data.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-xl border border-red-500/30 bg-red-500/5 px-6 py-8 text-center"
    >
      <span aria-hidden className="text-2xl">
        ⚠️
      </span>
      <p className="mt-2 text-sm text-red-600">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}
