"use client";

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Link from 'next/link';

interface Bid {
  id: string;
  amount: number;
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
}

export default function Home() {
  const [auctions, setAuctions] = useState<Auction[]>([]);

  useEffect(() => {
    fetch('http://localhost:3001/api/auctions')
      .then(res => res.json())
      .then(data => setAuctions(data))
      .catch(console.error);

    const socket = io('http://localhost:3001');

    socket.on('auctionCreated', (newAuction: Auction) => {
      setAuctions(prev => [newAuction, ...prev]);
    });

    socket.on('bidPlaced', (data: { auctionId: string, currentPrice: number, bid: Bid }) => {
      setAuctions(prev => prev.map(auction => 
        auction.id === data.auctionId 
          ? { ...auction, currentPrice: data.currentPrice, bids: [data.bid, ...auction.bids] }
          : auction
      ));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <main className="container animate-in" style={{ padding: '4rem 2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', background: 'linear-gradient(to right, #fff, var(--accent-color))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Live Auctions
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
          Discover and bid on exclusive items in real-time. Don't miss out on the action.
        </p>
      </div>

      <div className="grid-3">
        {auctions.map(auction => {
          const isActive = new Date(auction.endTime) > new Date() && auction.status === 'ACTIVE';
          return (
            <Link href={`/auction/${auction.id}`} key={auction.id} className="glass-panel auction-card">
              {auction.imageUrl ? (
                <img src={auction.imageUrl} alt={auction.title} className="auction-image" />
              ) : (
                <div className="auction-image" style={{ background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  No Image
                </div>
              )}
              <div className="auction-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h3 className="auction-title">{auction.title}</h3>
                  <span className={`badge ${isActive ? 'badge-active' : 'badge-ended'}`}>
                    {isActive ? 'Live' : 'Ended'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {auction.description}
                </p>
                
                <div className="auction-meta">
                  <div>
                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Bid</div>
                    <div className="price-tag">${auction.currentPrice.toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ends In</div>
                    <div style={{ fontWeight: 600, color: isActive ? 'var(--text-primary)' : 'var(--danger)' }}>
                      {isActive ? new Date(auction.endTime).toLocaleDateString() : 'Expired'}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
      {auctions.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '4rem' }}>
          No auctions available right now. Check back later or create one!
        </div>
      )}
    </main>
  );
}
