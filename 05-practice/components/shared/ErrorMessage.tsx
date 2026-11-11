export default function ErrorMessage({ message, onClose }: { message: string | null; onClose?: () => void }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      <span>{message}</span>
      {onClose && (
        <button type="button" onClick={onClose} className="shrink-0 text-rose-400 hover:text-rose-600" aria-label="오류 닫기">
          ✕
        </button>
      )}
    </div>
  );
}
