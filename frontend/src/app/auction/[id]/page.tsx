"use client";

import { useEffect, useState, use } from 'react';
import { io } from 'socket.io-client';
import { useRouter } from 'next/navigation';

interface User {
  name: string;
  email: string;
}

interface Bid {
  id: string;
  amount: number;
  createdAt: string;
  user: User;
}

interface Auction {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  startingPrice: number;
  currentPrice: number;
  endTime: string;
  status: string;
  bids: Bid[];
  creator: User;
}

export default function AuctionDetails({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    // Fetch initial auction data
    fetch(`http://localhost:3001/api/auctions/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setAuction(data);
        setBidAmount((data.currentPrice + 1).toString());
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    // Socket connection
    const socket = io('http://localhost:3001');
    socket.on('bidPlaced', (data: { auctionId: string, currentPrice: number, bid: Bid }) => {
      if (data.auctionId === id) {
        setAuction(prev => prev ? {
          ...prev,
          currentPrice: data.currentPrice,
          bids: [data.bid, ...prev.bids]
        } : null);
        // Automatically suggest next bid amount
        setBidAmount((data.currentPrice + 1).toString());
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  useEffect(() => {
    if (!auction) return;
    
    const updateTimer = () => {
      const end = new Date(auction.endTime).getTime();
      const now = Date.now();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft('Auction Ended');
        if (auction.status !== 'COMPLETED') {
          setAuction(prev => prev ? { ...prev, status: 'COMPLETED' } : null);
        }
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [auction]);

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('token');
    
    if (!token) {
      router.push('/login');
      return;
    }

    setIsPlacingBid(true);
    try {
      const res = await fetch(`http://localhost:3001/api/auctions/${id}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: bidAmount })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place bid');
      }
      
      // Note: Actual state update happens via Socket.io to ensure synchronization
      setBidAmount('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPlacingBid(false);
    }
  };

  if (loading) {
    return <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>Loading auction details...</div>;
  }

  if (!auction) {
    return <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>Auction not found</div>;
  }

  const isActive = auction.status === 'ACTIVE' && new Date(auction.endTime) > new Date();

  return (
    <div className="container animate-in" style={{ padding: '2rem 2rem' }}>
      <div className="auction-details-layout">
        
        {/* Left Col - Info */}
        <div>
          <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: '2rem' }}>
            {auction.imageUrl ? (
              <img src={auction.imageUrl} alt={auction.title} style={{ width: '100%', height: 'auto', maxHeight: '500px', objectFit: 'cover' }} />
            ) : (
              <div style={{ height: '300px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Image Provided</div>
            )}
            
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '2.5rem' }}>{auction.title}</h1>
                <span className={`badge ${isActive ? 'badge-active' : 'badge-ended'}`}>
                  {isActive ? 'Live' : 'Ended'}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Current Highest Bid</div>
                  <div className="price-tag animate-pulse-glow" style={{ fontSize: '2.5rem', display: 'inline-block', padding: '0.5rem', borderRadius: '8px' }}>
                    ${auction.currentPrice.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Time Remaining</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600, color: isActive ? 'var(--text-primary)' : 'var(--danger)', marginTop: '0.5rem' }}>
                    {timeLeft}
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ marginBottom: '1rem' }}>Description</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {auction.description}
                </p>
              </div>
              
              <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Listed by: <strong>{auction.creator.name}</strong> • Starting Price: ${auction.startingPrice.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col - Bidding */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Bid Box */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Place Your Bid</h3>
            
            {!isActive ? (
              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '8px', textAlign: 'center' }}>
                This auction has concluded. The final price was ${auction.currentPrice.toLocaleString()}.
              </div>
            ) : (
              <form onSubmit={handlePlaceBid}>
                {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>$</span>
                    <input 
                      type="number" 
                      className="input-field" 
                      style={{ paddingLeft: '2rem', height: '100%' }}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder="Amount"
                      min={auction.currentPrice + 0.01}
                      step="0.01"
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary" disabled={isPlacingBid} style={{ whiteSpace: 'nowrap' }}>
                    {isPlacingBid ? 'Placing...' : 'Place Bid'}
                  </button>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  Minimum bid: ${(auction.currentPrice + 0.01).toLocaleString()}
                </p>
              </form>
            )}
          </div>

          {/* Audit Log */}
          <div className="glass-panel" style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Bid History</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 400 }}>{auction.bids.length} bids</span>
            </h3>
            
            {auction.bids.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
                No bids yet. Be the first to bid!
              </div>
            ) : (
              <div className="bids-list">
                {auction.bids.map((bid, index) => (
                  <div key={bid.id} className={`bid-item ${index === 0 ? 'newest' : ''}`}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{bid.user.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(bid.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="price-tag" style={{ fontSize: '1.2rem' }}>
                      ${bid.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
