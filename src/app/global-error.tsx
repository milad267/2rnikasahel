"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#05101d", color: "#fff" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0 }}>خطای غیرمنتظره</h1>
          <p style={{ maxWidth: "420px", fontSize: "14px", lineHeight: 1.9, color: "#9fb2c5", marginTop: "12px" }}>
            متأسفانه مشکلی در بارگذاری برنامه رخ داد. لطفاً دوباره تلاش کنید.
          </p>
          {error?.digest && (
            <p style={{ fontFamily: "monospace", fontSize: "11px", color: "#5f7183", marginTop: "8px" }}>
              کد خطا: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            style={{
              marginTop: "24px",
              padding: "10px 20px",
              borderRadius: "12px",
              border: "none",
              background: "#0e7c86",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            تلاش دوباره
          </button>
        </div>
      </body>
    </html>
  );
}
