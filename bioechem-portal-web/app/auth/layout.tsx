export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="bio-pattern flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
      {children}
    </main>
  );
}
