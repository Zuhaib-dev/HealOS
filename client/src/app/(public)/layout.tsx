// ============================================
// HealOS — Public Pages Layout
// ============================================
// This layout wraps all public-facing pages
// (landing, about, doctors, services, etc.)
// Will include the public Navbar and Footer

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* <PublicNavbar /> */}
      {children}
      {/* <PublicFooter /> */}
    </>
  );
}
