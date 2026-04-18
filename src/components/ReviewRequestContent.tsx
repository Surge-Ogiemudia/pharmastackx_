import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { useCart, CartItem } from '@/contexts/CartContext';
import DotCanvas from './DotCanvas';
import './ReviewRequest.css';

// --- INTERFACES ---

interface Pharmacy {
  _id: string;
  name: string;
  address?: string;
  distance?: string; 
  rating?: number;
  orderCount?: number;
}

interface QuoteItem {
  name: string;
  price?: number;
  pharmacyQuantity?: number;
  isAvailable?: boolean;
  productId: string;
  unit?: string;
}

interface Quote {
  _id: string;
  pharmacy?: Pharmacy;
  externalContact?: { name: string; phone: string };
  source?: 'app' | 'whatsapp';
  items: QuoteItem[];
  notes?: string;
  status: 'offered' | 'accepted' | 'rejected';
  quotedAt: string;
}

interface OriginalItem {
  name: string;
  form?: string;
  strength?: string;
  quantity: number;
  image?: string | null;
}

interface Request {
  _id: string;
  createdAt: string;
  status: 'pending' | 'quoted' | 'awaiting-confirmation' | 'confirmed' | 'dispatched' | 'rejected' | 'cancelled';
  items: OriginalItem[];
  quotes: Quote[];
}

// --- HELPERS ---

type SortByType = 'efficiency' | 'price' | 'distance' | 'date';

const QuoteCard: React.FC<{ 
  quote: Quote; 
  onRequestDecision: (quoteId: string, items: any[]) => void; 
  isActionDisabled: boolean; 
  isFetchingDistance: boolean;
  isBest?: boolean;
}> = ({ quote, onRequestDecision, isActionDisabled, isFetchingDistance, isBest }) => {

    const validItems = useMemo(() => 
        quote.items.filter(item => 
            item.isAvailable &&
            typeof item.price === 'number' &&
            typeof item.pharmacyQuantity === 'number' &&
            item.pharmacyQuantity > 0
        ), [quote.items]);

    const totalPrice = useMemo(() => 
        validItems.reduce((acc, item) => acc + (item.price! * item.pharmacyQuantity!), 0), 
        [validItems]
    );
    
    const timeAgo = useMemo(() => {
        const diff = Date.now() - new Date(quote.quotedAt).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `Replied ${mins} min ago`;
        const hrs = Math.floor(mins / 60);
        return `Replied ${hrs} hrs ago`;
    }, [quote.quotedAt]);

    return (
        <div className={`rr-response-card reveal-scale visible ${isBest ? 'best' : ''}`}>
            {isBest && (
                <div className="rr-best-label">
                    <div className="rr-best-label-text">Best offer · Price & Distance</div>
                </div>
            )}
            <div className="rr-card-top">
                <div className="rr-card-top-row">
                    <div className="rr-pharmacist-info">
                        <div className="rr-pharmacist-name">
                            {quote.pharmacy?.name || quote.externalContact?.name || 'Pharmacist'}
                            {quote.source === 'whatsapp' && (
                                <span style={{ fontSize: '9px', background: '#F0FDF4', color: '#166534', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: 700, verticalAlign: 'middle' }}>
                                    via WhatsApp
                                </span>
                            )}
                        </div>
                        <div className="rr-pharmacist-pharmacy">{quote.pharmacy?.address || (quote.source === 'whatsapp' ? 'Verified External Partner' : 'Address not available')}</div>
                        <div className="rr-pharmacist-rating">
                            <span className="rr-rating-star">⭐</span>
                            <span className="rr-rating-num">{quote.pharmacy?.rating || '4.5'}</span>
                            <span className="rr-rating-count">({quote.pharmacy?.orderCount || '12'} orders)</span>
                        </div>
                    </div>
                    <div className="rr-verified-badge">
                        <div className="rr-verified-dot"></div>
                        <div className="rr-verified-text">Verified</div>
                    </div>
                </div>
                <div className="rr-card-price-row">
                    <div className="rr-price-wrap">
                        <div className="rr-price-label">Total price</div>
                        <div className={`rr-price-amount ${isBest ? '' : 'normal'}`}>₦{totalPrice.toLocaleString()}</div>
                        <div className="rr-price-per">
                            {validItems.map((item, idx) => (
                                <span key={idx}>
                                    ₦{item.price?.toLocaleString()}/{item.unit || 'unit'}
                                    {idx < validItems.length - 1 ? ' · ' : ''}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="rr-distance-wrap">
                        <div className="rr-distance-label">Distance</div>
                        <div className="rr-distance-amount">
                            {isFetchingDistance ? '...' : (quote.pharmacy?.distance || 'N/A')}
                        </div>
                    </div>
                </div>
            </div>
            <div className="rr-card-bottom">
                <div className="rr-card-tags">
                    <div className="rr-card-tag green">Available Now</div>
                    <div className="rr-card-tag green">{validItems.length} items found</div>
                    <div className="rr-card-tag">{timeAgo}</div>
                </div>
                {quote.notes && <div className="rr-card-notes">"{quote.notes}"</div>}
                
                <button 
                    className={`rr-select-btn ${isBest ? '' : 'outline'}`}
                    disabled={isActionDisabled || validItems.length === 0}
                    onClick={() => onRequestDecision(quote._id, validItems)}
                >
                    {quote.status === 'accepted' ? 'Accepted' : 'Select this pharmacist'}
                </button>
            </div>
        </div>
    );
};

const ReviewRequestContent: React.FC<{ requestId: string; setView: (view: string) => void; }> = ({ requestId, setView }) => {
  const { initializeCart } = useCart();

  const [request, setRequest] = useState<Request | null>(null);
  const [distances, setDistances] = useState<{ [pharmacyId: string]: string }>({});
  const [isFetchingDistances, setIsFetchingDistances] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distanceError, setDistanceError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<SortByType>('efficiency');

  const fetchDistances = useCallback(async (latitude: number, longitude: number) => {
    setIsFetchingDistances(true);
    setDistanceError(null);
    try {
        const response = await fetch(`/api/distance?requestId=${requestId}&lat=${latitude}&lon=${longitude}`);
        const data = await response.json();
        if (response.ok) {
            setDistances(data);
        } else {
            throw new Error(data.message || 'Failed to fetch pharmacy distances.');
        }
    } catch (err) {
        setDistanceError(err instanceof Error ? err.message : 'Could not load pharmacy distances.');
    } finally {
        setIsFetchingDistances(false);
    }
  }, [requestId]);

  const requestUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
        setDistanceError("Geolocation is not supported by this browser.");
        setIsFetchingDistances(false);
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (position) => {
            fetchDistances(position.coords.latitude, position.coords.longitude);
        },
        () => {
            setDistanceError("User location not taken.");
            setIsFetchingDistances(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [fetchDistances]);

  useEffect(() => {
    const fetchRequestAndDistances = async () => {
      try {
        const response = await fetch(`/api/requests/${requestId}`);
        if (!response.ok) throw new Error('Failed to fetch your request details.');
        const data = await response.json();
        setRequest(data);

        if (data.status === 'quoted' && data.quotes.length > 0) {
            requestUserLocation();
        } else {
            setIsFetchingDistances(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setIsFetchingDistances(false);
      } finally {
        setLoading(false);
      }
    };
    
    if (requestId) {
      fetchRequestAndDistances();
      const interval = setInterval(fetchRequestAndDistances, 5000);
      return () => clearInterval(interval);
    }
  }, [requestId, requestUserLocation]);

  const handleAcceptQuote = async (quoteId: string, itemsToAdd: any[]) => {
      setIsSubmitting(true);
      setError(null);
      try {
          const response = await fetch(`/api/requests/${requestId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'accept-quote', quoteId }),
          });
          if (!response.ok) throw new Error((await response.json()).message || 'Failed to accept the quote.');

          const cartItems: CartItem[] = itemsToAdd.map(item => ({
              id: `${item.productId || item.name}-${quoteId}`,
              name: item.name,
              price: item.price,
              quantity: item.pharmacyQuantity,
              image: request?.items.find(i => i.name === item.name)?.image || '',
              activeIngredients: request?.items.find(i => i.name === item.name)?.strength || '',
              pharmacy: sortedQuotes.find(q => q._id === quoteId)?.pharmacy?.name || sortedQuotes.find(q => q._id === quoteId)?.externalContact?.name || 'Pharmacy',
              drugClass: 'From Quote',
              isQuoteItem: true,
              quoteId: quoteId
          }));

          initializeCart(cartItems, requestId, quoteId);
          setView('confirmOrder');
      } catch (err) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred');
          setIsSubmitting(false);
      }
  };
  
  const enrichedQuotes = useMemo(() => {
    if (!request?.quotes) return [];
    return request.quotes.map(quote => ({
      ...quote,
      pharmacy: quote.pharmacy ? {
        ...quote.pharmacy,
        distance: distances[quote.pharmacy._id] || (distanceError ? (quote.pharmacy.distance || distanceError) : undefined)
      } : undefined
    }));
  }, [request?.quotes, distances, distanceError]);

  const sortedQuotes = useMemo(() => {
    const parseDistance = (distanceStr: string | undefined): number => {
        if (!distanceStr || ["Pharmacist location not recorded.", "Distance calculation failed.", "User location not taken."].includes(distanceStr)) {
            return Infinity;
        }
        const match = distanceStr.match(/(\d+(\.\d+)?)/);
        return match ? parseFloat(match[1]) : Infinity;
    };

    const calculateTotalPrice = (items: QuoteItem[]): number => {
        return items
            .filter(item => item.isAvailable && typeof item.price === 'number' && typeof item.pharmacyQuantity === 'number' && item.pharmacyQuantity > 0)
            .reduce((acc, item) => acc + (item.price! * item.pharmacyQuantity!), 0);
    };

    return [...enrichedQuotes].sort((a, b) => {
        switch (sortBy) {
            case 'price': return calculateTotalPrice(a.items) - calculateTotalPrice(b.items);
            case 'distance': return parseDistance(a.pharmacy?.distance) - parseDistance(b.pharmacy?.distance);
            case 'date': return b.quotedAt.localeCompare(a.quotedAt);
            case 'efficiency':
            default:
                const distA = parseDistance(a.pharmacy?.distance);
                const distB = parseDistance(b.pharmacy?.distance);
                if (distA !== distB) return distA - distB;
                return calculateTotalPrice(a.items) - calculateTotalPrice(b.items);
        }
    });
  }, [enrichedQuotes, sortBy]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  if (!request) return <div className="review-request-container" style={{padding: '2rem'}}><Alert severity="warning">Could not load your request details.</Alert></div>;

  const requestSummary = request.items.map(item => `${item.name} (${item.quantity})`).join(' · ');

  return (
    <>
      <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none' }}>
        <DotCanvas />
      </Box>
      <div className="review-request-container" style={{ position: 'relative', zIndex: 1 }}>

        {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
        
        <div className="rr-header">
            <div className="rr-header-top reveal visible">
                <button className="rr-back-btn" onClick={() => setView('home')}>
                    <div className="rr-back-circle">←</div>
                    <div className="rr-back-text">My requests</div>
                </button>
                <div className="rr-response-count">
                    <div className="rr-response-count-dot"></div>
                    <div className="rr-response-count-text">{request.quotes.length} responses</div>
                </div>
            </div>
            <div className="rr-request-pill reveal d1 visible">
                <div className="rr-request-pill-dot"></div>
                <div className="rr-request-pill-text"><span>Request:</span> {requestSummary}</div>
            </div>
        </div>

        {/* SORT TABS */}
        <div className="rr-sort-tabs reveal d1 visible">
            <div className={`rr-sort-tab ${sortBy === 'efficiency' ? 'active' : ''}`} onClick={() => setSortBy('efficiency')}>Best Match</div>
            <div className={`rr-sort-tab ${sortBy === 'price' ? 'active' : ''}`} onClick={() => setSortBy('price')}>Cheapest</div>
            <div className={`rr-sort-tab ${sortBy === 'distance' ? 'active' : ''}`} onClick={() => setSortBy('distance')}>Nearest</div>
            <div className={`rr-sort-tab ${sortBy === 'date' ? 'active' : ''}`} onClick={() => setSortBy('date')}>Newest</div>
        </div>

        {/* RESPONSE CARDS */}
        <div className="rr-responses-list">
            {request.status === 'pending' && (
                <div className="rr-no-more visible">
                    <div className="rr-no-more-text">Waiting for pharmacies to respond...</div>
                    <CircularProgress size={20} sx={{mt: 2}} />
                </div>
            )}

            {sortedQuotes.map((quote, idx) => (
                <QuoteCard 
                    key={quote._id}
                    quote={quote}
                    onRequestDecision={handleAcceptQuote}
                    isActionDisabled={isSubmitting || request.status !== 'quoted'}
                    isFetchingDistance={isFetchingDistances}
                    isBest={idx === 0 && sortBy === 'efficiency'}
                />
            ))}

            {request.status === 'quoted' && sortedQuotes.length === 0 && (
                <div className="rr-no-more visible">
                    <div className="rr-no-more-text">No responses found match your filters.</div>
                </div>
            )}

            <div className="rr-no-more reveal d5 visible">
                <div className="rr-no-more-text">
                    {request.status === 'quoted' ? 'No more responses yet · ' : ''}
                    <span onClick={() => setView('orderMedicines')}>Start another search</span>
                </div>
            </div>
        </div>
      </div>
    </>
  );
};

export default ReviewRequestContent;
