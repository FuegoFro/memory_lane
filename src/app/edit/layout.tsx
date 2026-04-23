export default function EditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      {children}
    </div>
  );
}
