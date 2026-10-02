import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: Props) {
  return (
    <nav className="flex items-center gap-1.5 text-sm mb-6 flex-wrap">
      <a href="/" className="text-slate-500 hover:text-white transition-colors">
        <Home className="w-3.5 h-3.5" />
      </a>
      {items.map((item, idx) => (
        <span key={idx} className="flex items-center gap-1.5">
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          {item.href ? (
            <a href={item.href} className="text-slate-400 hover:text-white transition-colors">
              {item.label}
            </a>
          ) : (
            <span className="text-slate-200 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
