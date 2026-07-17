export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="size-10 animate-spin rounded-full border-4 border-petrol-500 border-t-transparent" />
        <p className="text-xs font-medium text-charcoal-500">در حال بارگذاری…</p>
      </div>
    </div>
  );
}
