'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

interface Booking {
  id: number;
  booking_ref: string;
  qr_code: string;
  status: string;
  redeem_status: string;
  redeemed_at?: string;
  final_amount: number;
  user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  screening?: {
    start_time: string;
    film?: { title: string; year: number; rating: string };
    hall?: { name: string };
  };
  tickets?: Array<{ seat?: { row: string; number: number } }>;
}

export default function ScanPage() {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<{ valid: boolean; booking?: Booking; error?: string } | null>(null);
  const [redeemResult, setRedeemResult] = useState<{ success: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleQRCode(decodedText);
          scanner.stop().catch(() => {});
          setScanning(false);
        },
        () => {}
      );
      setScanning(true);
    } catch (err) {
      console.error('Scanner error:', err);
      alert('Could not start camera. Please use manual entry.');
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      setScanning(false);
    }
  };

  const handleQRCode = async (qrCode: string) => {
    setLoading(true);
    setResult(null);
    setRedeemResult(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/tickets/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ qr_code: qrCode }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ valid: false, error: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!result?.booking?.qr_code) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/tickets/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ qr_code: result.booking.qr_code }),
      });

      const data = await res.json();
      if (data.redeemed) {
        setRedeemResult({ success: true, message: 'Ticket redeemed successfully!' });
        setResult({ valid: true, booking: data.booking });
      } else {
        setRedeemResult({ success: false, message: data.error || 'Failed to redeem' });
      }
    } catch (err) {
      setRedeemResult({ success: false, message: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-SG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getSeats = (tickets?: Booking['tickets']) => {
    if (!tickets) return '-';
    return tickets.map(t => t.seat ? `${t.seat.row}${t.seat.number}` : '').filter(Boolean).join(', ');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🎫 Ticket Scanner</h1>

      {/* Scanner Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div id="qr-reader" className={`mb-4 ${scanning ? '' : 'hidden'}`} style={{ width: '100%' }} />
        
        {!scanning ? (
          <button
            onClick={startScanner}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            📷 Start Camera Scanner
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="w-full py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700"
          >
            Stop Scanner
          </button>
        )}

        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-gray-500 mb-2">Or enter QR code manually:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Paste QR code here..."
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button
              onClick={() => handleQRCode(manualCode)}
              disabled={!manualCode || loading}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50"
            >
              Validate
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="mt-2 text-gray-500">Validating...</p>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className={`rounded-xl shadow-sm p-6 ${result.valid ? 'bg-white' : 'bg-red-50'}`}>
          {result.valid && result.booking ? (
            <>
              <div className={`text-center p-4 rounded-lg mb-4 ${
                result.booking.redeem_status === 'redeemed' 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : result.booking.status === 'confirmed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
              }`}>
                <div className="text-3xl mb-2">
                  {result.booking.redeem_status === 'redeemed' ? '⚠️' : result.booking.status === 'confirmed' ? '✅' : '❌'}
                </div>
                <div className="font-bold text-lg">
                  {result.booking.redeem_status === 'redeemed' 
                    ? 'ALREADY REDEEMED' 
                    : result.booking.status === 'confirmed'
                      ? 'VALID TICKET'
                      : `STATUS: ${result.booking.status.toUpperCase()}`}
                </div>
                {result.booking.redeem_status === 'redeemed' && result.booking.redeemed_at && (
                  <div className="text-sm mt-1">
                    Redeemed at {formatDate(result.booking.redeemed_at)}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Booking Ref</span>
                  <span className="font-mono font-bold">{result.booking.booking_ref}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer</span>
                  <span>{result.booking.user?.first_name} {result.booking.user?.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Film</span>
                  <span className="font-medium">{result.booking.screening?.film?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Showtime</span>
                  <span>{result.booking.screening?.start_time && formatDate(result.booking.screening.start_time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Hall</span>
                  <span>{result.booking.screening?.hall?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Seats</span>
                  <span className="font-medium">{getSeats(result.booking.tickets)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span>${result.booking.final_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Redeem Button */}
              {result.booking.status === 'confirmed' && result.booking.redeem_status !== 'redeemed' && (
                <button
                  onClick={handleRedeem}
                  disabled={loading}
                  className="w-full mt-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 disabled:opacity-50"
                >
                  ✓ ADMIT ENTRY
                </button>
              )}

              {/* Redeem Result */}
              {redeemResult && (
                <div className={`mt-4 p-4 rounded-lg text-center ${
                  redeemResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {redeemResult.success ? '🎉 ' : '❌ '}{redeemResult.message}
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              <div className="text-5xl mb-4">❌</div>
              <div className="text-xl font-bold text-red-600">Invalid Ticket</div>
              <p className="text-gray-500 mt-2">{result.error || 'QR code not found'}</p>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
        <p className="font-medium mb-2">Instructions:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Scan the customer&apos;s QR code from their email or phone</li>
          <li>Verify the booking details match</li>
          <li>Click &quot;ADMIT ENTRY&quot; to mark the ticket as used</li>
          <li>Each ticket can only be redeemed once</li>
        </ol>
      </div>
    </div>
  );
}
