// ============================================
// HealOS — Auth Pages Layout
// ============================================
// This layout wraps all auth pages
// (login, register, forgot-password, etc.)
// Minimal layout — no navbar/sidebar

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      {children}
    </div>
  );
}
