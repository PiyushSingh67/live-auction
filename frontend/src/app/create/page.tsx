"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateAuction() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/auctions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title, 
          description, 
          imageUrl, 
          startingPrice, 
          endTime 
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create auction');
      }
      
      router.push(`/auction/${data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-in" style={{ padding: '4rem 2rem', maxWidth: '800px' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Create New Auction</h1>
      
      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Item Title</label>
            <input 
              type="text" 
              className="input-field" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Vintage Rolex Submariner"
              required 
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Description</label>
            <textarea 
              className="input-field" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the item..."
              rows={4}
              required 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Image URL (Optional)</label>
            <input 
              type="url" 
              className="input-field" 
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Starting Price ($)</label>
              <input 
                type="number" 
                className="input-field" 
                value={startingPrice}
                onChange={(e) => setStartingPrice(e.target.value)}
                placeholder="100.00"
                step="0.01"
                min="0.01"
                required 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>End Time</label>
              <input 
                type="datetime-local" 
                className="input-field" 
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required 
              />
            </div>
          </div>
          
          <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '1rem', fontSize: '1.1rem' }} disabled={loading}>
            {loading ? 'Creating...' : 'Launch Auction'}
          </button>
        </form>
      </div>
    </div>
  );
}
