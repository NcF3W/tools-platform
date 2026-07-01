import Link from "next/link";

const navItems = [
  { href: "/pdf", label: "PDF-Tools" },
  { href: "/latex", label: "LaTeX-Tools" },
  { href: "/chemie", label: "Chemie-Tools" },
];

export default function Header() {
  return (
    <header className="border-b">
      <nav className="max-w-5xl mx-auto flex items-center gap-6 p-4">
        <Link href="/" className="font-bold text-lg">
          Tools
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
