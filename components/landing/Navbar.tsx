import Link from 'next/link';

export default function Navbar() {
  return (
    <div className="container flex items-center justify-between px-6 py-6 space-x-6 text-gray-900">
      <Link href="/">
        <a className="text-xl">Notabase</a>
      </Link>
      <div className="flex items-center space-x-6">
        <Link href="/login">
          <a>Sign in</a>
        </Link>
        <Link href="/signup">
          <a className="font-semibold btn">Get started</a>
        </Link>
      </div>
    </div>
  );
}
