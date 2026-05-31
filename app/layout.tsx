// Root layout — minimal pass-through.
// The [locale] layout renders <html> and <body> with the correct lang attribute.
// This file exists only because Next.js requires a root layout.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
