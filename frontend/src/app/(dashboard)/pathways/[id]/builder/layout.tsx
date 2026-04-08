export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  // Remove default dashboard padding so the canvas is full-bleed
  return <div className="h-[calc(100vh-64px)] overflow-hidden">{children}</div>;
}
