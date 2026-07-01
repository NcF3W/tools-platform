import Link from "next/link";
import { FileText, BookOpen, FlaskConical } from "lucide-react";

const navItems = [
  { href: "/pdf", label: "PDF-Tools", icon: FileText },
  { href: "/latex", label: "LaTeX-Tools", icon: BookOpen },
  { href: "/chemie", label: "Chemie-Tools", icon: FlaskConical },
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
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
