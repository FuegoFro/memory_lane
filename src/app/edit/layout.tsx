'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/edit" className="text-xl font-bold text-white">
            Memory Lane Editor
          </Link>

          <div className="flex gap-4">
            <Link
              href="/"
              className="text-gray-300 hover:text-white"
              target="_blank"
            >
              View Slideshow
            </Link>

            <button
              onClick={handleLogout}
              className="text-gray-300 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {children}
    </div>
  );
}
