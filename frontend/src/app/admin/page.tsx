"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';

interface Auction {
  id: string;
  title: string;
  startingPrice: number;
  currentPrice: number;
  status: string;
  endTime: string;
}

export default function AdminDashboard() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    fetch('http://localhost:3001/api/auctions')
      .then(res => res.json())
      .then(data => {
        setAuctions(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to fetch auctions');
        setLoading(false);
      });

    const socket = io('http://localhost:3001');
    socket.on('auctionDeleted', (id: string) => {
      setAuctions(prev => prev.filter(a => a.id !== id));
    });

    return () => {
      socket.disconnect();
    };
  }, [router]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this auction?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/auctions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      // Socket will handle UI update
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>Loading...</div>;

  return (
    <div className="container animate-in" style={{ padding: '4rem 2rem' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Admin Dashboard</h1>
      
      {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '1rem' }}>Title</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem' }}>Current Price</th>
              <th style={{ padding: '1rem' }}>End Time</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {auctions.map(auction => {
              const isActive = new Date(auction.endTime) > new Date() && auction.status === 'ACTIVE';
              return (
                <tr key={auction.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>{auction.title}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${isActive ? 'badge-active' : 'badge-ended'}`}>
                      {isActive ? 'Active' : 'Ended'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>${auction.currentPrice.toLocaleString()}</td>
                  <td style={{ padding: '1rem' }}>{new Date(auction.endTime).toLocaleString()}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button 
                      onClick={() => handleDelete(auction.id)}
                      className="btn-secondary" 
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {auctions.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No auctions found.
          </div>
        )}
      </div>
    </div>
  );
}
