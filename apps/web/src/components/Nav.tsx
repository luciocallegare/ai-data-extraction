'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  const linkClass = (href: string) =>
    `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
      pathname === href ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`;

  const handleLogout = async () => {
    await api.logout();
    router.push('/login');
  };

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/new" className="text-lg font-semibold text-gray-900">
          Extractor
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/new" className={linkClass('/new')}>
            New
          </Link>
          <Link href="/history" className={linkClass('/history')}>
            History
          </Link>
          <button
            onClick={handleLogout}
            className="ml-2 rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
