"use client";

import Link from 'next/link';
import { Gavel, LogOut, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [user, setUser] = useState<{name: string, email: string, role: string} | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  return (
    <nav className="navbar">
      <div className="container">
        <Link href="/" className="logo">
          <Gavel size={28} color="var(--accent-color)" />
          AuctionLive
        </Link>
        <div className="nav-links">
          <Link href="/">Auctions</Link>
          {user ? (
            <>
              <Link href="/create" className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
                Create Auction
              </Link>
              {user.role === 'ADMIN' && (
                <Link href="/admin" className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                  Admin Panel
                </Link>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '1rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                  <User size={18} /> {user.name}
                </span>
                <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.5rem', display: 'flex' }}>
                  <LogOut size={18} />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary">Login</Link>
              <Link href="/register" className="btn-primary">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
