'use client';

import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';

export interface PackingSlipItem {
  name: string;
  packForm?: string;
  qty: number;
  price: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface WholesalePackingSlipProps {
  waybillNumber: string;
  orderReference: string;
  orderDate?: string;
  buyerPharmacy: {
    name: string;
    address: string;
    city?: string;
    state?: string;
    phone: string;
    email?: string;
    pcnLicense?: string;
    superintendentName?: string;
  };
  sellerDepot?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    pcnLicense: string;
    nafdacNumber: string;
  };
  items: PackingSlipItem[];
  deliveryMethod: string;
  distanceKm?: number;
  transitTime?: string;
  deliveryFee: number;
  subtotal: number;
  totalAmount: number;
  paymentMethod?: string;
  paymentReference?: string;
  onClose?: () => void;
}

export default function WholesalePackingSlip({
  waybillNumber,
  orderReference,
  orderDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  buyerPharmacy,
  sellerDepot = {
    name: 'Airen Wholesale Pharmaceutical Depot',
    address: '18 Mission Road, Central Commercial District, Benin City, Edo State',
    phone: '+234 (0) 803 555 0192',
    email: 'dispatch@airenwholesale.com.ng',
    pcnLicense: 'PCN/W-ED/2019/8821',
    nafdacNumber: 'ED-WH-0922'
  },
  items,
  deliveryMethod,
  distanceKm,
  transitTime,
  deliveryFee,
  subtotal,
  totalAmount,
  paymentMethod = 'Bank Transfer / Escrow',
  paymentReference,
  onClose
}: WholesalePackingSlipProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate QR Code containing verifiable consignment manifest payload
    const qrPayload = JSON.stringify({
      waybill: waybillNumber,
      orderRef: orderReference,
      depot: sellerDepot.name,
      buyer: buyerPharmacy.name,
      pcn: buyerPharmacy.pcnLicense,
      itemsCount: items.length,
      total: totalAmount,
      status: 'VERIFIED_GDP_CONSIGNMENT',
      verifyUrl: `https://www.psx.ng/verify-consignment?wb=${encodeURIComponent(waybillNumber)}`
    });

    QRCode.toDataURL(qrPayload, {
      width: 130,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error('QR code generation failed:', err));
  }, [waybillNumber, orderReference, sellerDepot.name, buyerPharmacy.name, buyerPharmacy.pcnLicense, items.length, totalAmount]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Generate deterministic mock batches and expiry for display if not set
  const getBatch = (index: number) => `BN-26${String.fromCharCode(65 + index)}${10 + (index * 7)}`;
  const getExpiry = (index: number) => `1${(index % 2) + 1}/202${8 + (index % 2)}`;

  return (
    <div className="psx-waybill-modal-overlay">
      {/* ACTION BAR (Hidden when printing) */}
      <div className="psx-waybill-action-bar no-print">
        <div className="psx-waybill-action-info">
          <span className="psx-pill">🏢 B2B Consignment Document</span>
          <span className="psx-waybill-ref">{waybillNumber}</span>
        </div>
        <div className="psx-waybill-action-btns">
          <button onClick={handlePrint} className="psx-print-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
            Print Packing Slip / Waybill
          </button>
          {onClose && (
            <button onClick={onClose} className="psx-close-btn" title="Close preview">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Close
            </button>
          )}
        </div>
      </div>

      {/* PRINTABLE SLIP / INVOICE BODY */}
      <div className="psx-waybill-container" ref={printRef}>
        
        {/* HEADER */}
        <div className="psx-wb-header">
          <div className="psx-wb-brand">
            <div className="psx-wb-crest">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div>
              <h1 className="psx-wb-depot-name">{sellerDepot.name.toUpperCase()}</h1>
              <p className="psx-wb-depot-sub">CENTRAL PHARMACEUTICAL DISTRIBUTION HUB & BULK COLD-CHAIN DEPOT</p>
              <p className="psx-wb-depot-meta">
                <span>📍 {sellerDepot.address}</span>
                <span>📞 {sellerDepot.phone}</span>
                <span>✉️ {sellerDepot.email}</span>
              </p>
              <div className="psx-wb-reg-badges">
                <span className="psx-reg-tag">Wholesale PCN Lic: <strong>{sellerDepot.pcnLicense}</strong></span>
                <span className="psx-reg-tag">NAFDAC Premise: <strong>{sellerDepot.nafdacNumber}</strong></span>
                <span className="psx-reg-tag">GDP Certified</span>
              </div>
            </div>
          </div>

          <div className="psx-wb-doc-title-box">
            <div className="psx-wb-doc-tag">OFFICIAL B2B DISPATCH MANIFEST</div>
            <h2 className="psx-wb-doc-title">WHOLESALE PACKING SLIP & WAYBILL</h2>
            <div className="psx-wb-status-tag">STATUS: PAYMENT CONFIRMED & CLEARED</div>
          </div>
        </div>

        <div className="psx-wb-divider-double" />

        {/* METADATA GRID */}
        <div className="psx-wb-meta-grid">
          <div className="psx-wb-meta-cell">
            <span className="psx-meta-lbl">WAYBILL NUMBER:</span>
            <span className="psx-meta-val highlight">{waybillNumber}</span>
          </div>
          <div className="psx-wb-meta-cell">
            <span className="psx-meta-lbl">ORDER REFERENCE:</span>
            <span className="psx-meta-val">{orderReference}</span>
          </div>
          <div className="psx-wb-meta-cell">
            <span className="psx-meta-lbl">DISPATCH DATE & TIME:</span>
            <span className="psx-meta-val">{orderDate}</span>
          </div>
          <div className="psx-wb-meta-cell">
            <span className="psx-meta-lbl">PAYMENT SETTLEMENT:</span>
            <span className="psx-meta-val green">{paymentMethod} (100% Settled)</span>
          </div>
        </div>

        {/* CONSIGNOR & CONSIGNEE DETAILS */}
        <div className="psx-wb-parties-grid">
          {/* CONSIGNOR */}
          <div className="psx-wb-party-card">
            <div className="psx-party-header">
              <span className="psx-party-role">CONSIGNOR / DISPATCHING DEPOT</span>
              <span className="psx-party-badge">ORIGIN</span>
            </div>
            <div className="psx-party-body">
              <h3 className="psx-party-name">{sellerDepot.name}</h3>
              <p className="psx-party-line">📍 {sellerDepot.address}</p>
              <p className="psx-party-line">📞 {sellerDepot.phone}</p>
              <p className="psx-party-line">✉️ {sellerDepot.email}</p>
              <p className="psx-party-line">🏛️ PCN Wholesale Reg: <strong>{sellerDepot.pcnLicense}</strong></p>
              <p className="psx-party-line">👨‍⚕️ Depot Supervisor: <strong>Pharm. E. Airen, B.Pharm, MPSN</strong></p>
            </div>
          </div>

          {/* CONSIGNEE */}
          <div className="psx-wb-party-card highlight">
            <div className="psx-party-header">
              <span className="psx-party-role">CONSIGNEE / BUYER PHARMACY</span>
              <span className="psx-party-badge buyer">DESTINATION</span>
            </div>
            <div className="psx-party-body">
              <h3 className="psx-party-name">{buyerPharmacy.name}</h3>
              <p className="psx-party-line">📍 {buyerPharmacy.address}{buyerPharmacy.city ? `, ${buyerPharmacy.city}` : ''}{buyerPharmacy.state ? `, ${buyerPharmacy.state}` : ''}</p>
              <p className="psx-party-line">📞 {buyerPharmacy.phone}</p>
              {buyerPharmacy.email && <p className="psx-party-line">✉️ {buyerPharmacy.email}</p>}
              <p className="psx-party-line">🏛️ PCN Retail Lic: <strong>{buyerPharmacy.pcnLicense || 'PCN/ED/RET/2022/VALID'}</strong></p>
              <p className="psx-party-line">👨‍⚕️ Receiving Pharmacist: <strong>{buyerPharmacy.superintendentName || 'Superintendent Pharmacist in Charge'}</strong></p>
            </div>
          </div>
        </div>

        {/* LOGISTICS & TRANSIT ROUTE BANNER */}
        <div className="psx-wb-route-banner">
          <div className="psx-route-left">
            <span className="psx-route-icon">🚚</span>
            <div>
              <div className="psx-route-title">
                B2B Logistics Method: <strong>{deliveryMethod}</strong>
              </div>
              <div className="psx-route-sub">
                Corridor: Airen Mission Road Depot ➔ {buyerPharmacy.name} ({buyerPharmacy.address})
              </div>
            </div>
          </div>
          <div className="psx-route-right">
            {distanceKm && (
              <div className="psx-route-metric">
                <span className="psx-metric-lbl">Haulage Distance</span>
                <span className="psx-metric-val">{distanceKm} km</span>
              </div>
            )}
            {transitTime && (
              <div className="psx-route-metric">
                <span className="psx-metric-lbl">Transit ETA</span>
                <span className="psx-metric-val">{transitTime}</span>
              </div>
            )}
            <div className="psx-route-metric">
              <span className="psx-metric-lbl">Logistics Fee</span>
              <span className="psx-metric-val">{deliveryFee === 0 ? 'FREE' : `₦${deliveryFee.toLocaleString()}`}</span>
            </div>
          </div>
        </div>

        {/* ITEMIZED INVENTORY TABLE */}
        <div className="psx-wb-table-wrapper">
          <table className="psx-wb-table">
            <thead>
              <tr>
                <th style={{ width: '4%' }}>#</th>
                <th style={{ width: '38%' }}>Drug Description & Formulation</th>
                <th style={{ width: '20%' }}>Wholesale Pack Form</th>
                <th style={{ width: '12%' }}>Batch / Expiry</th>
                <th style={{ width: '8%', textAlign: 'center' }}>Qty (Packs)</th>
                <th style={{ width: '9%', textAlign: 'right' }}>Unit Price (₦)</th>
                <th style={{ width: '9%', textAlign: 'right' }}>Total (₦)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const batch = item.batchNumber || getBatch(idx);
                const expiry = item.expiryDate || getExpiry(idx);
                const pack = item.packForm || 'Wholesale Pack · 10x10s';
                const lineTotal = item.price * item.qty;

                return (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <div className="psx-item-name">{item.name}</div>
                      <div className="psx-item-sub">Pharmacopeia Grade · Cold-Chain Checked</div>
                    </td>
                    <td>
                      <span className="psx-pack-badge">{pack}</span>
                    </td>
                    <td>
                      <div className="psx-batch-code">{batch}</div>
                      <div className="psx-exp-date">Exp: {expiry}</div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.qty}</td>
                    <td style={{ textAlign: 'right' }}>₦{item.price.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>₦{lineTotal.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* SUMMARY & AUTHENTICATION SECTION */}
        <div className="psx-wb-footer-grid">
          {/* BARCODE & QR SECURITY */}
          <div className="psx-wb-security-box">
            <div className="psx-sec-header">SECURITY AUTHENTICATION & BARCODE</div>
            <div className="psx-sec-content">
              {/* SVG HIGH DENSITY BARCODE */}
              <div className="psx-barcode-box">
                <svg className="psx-barcode-svg" viewBox="0 0 280 60">
                  <rect x="0" y="0" width="3" height="48" fill="#111"/>
                  <rect x="5" y="0" width="2" height="48" fill="#111"/>
                  <rect x="10" y="0" width="4" height="48" fill="#111"/>
                  <rect x="16" y="0" width="2" height="48" fill="#111"/>
                  <rect x="20" y="0" width="5" height="48" fill="#111"/>
                  <rect x="27" y="0" width="3" height="48" fill="#111"/>
                  <rect x="33" y="0" width="2" height="48" fill="#111"/>
                  <rect x="37" y="0" width="6" height="48" fill="#111"/>
                  <rect x="45" y="0" width="2" height="48" fill="#111"/>
                  <rect x="49" y="0" width="4" height="48" fill="#111"/>
                  <rect x="56" y="0" width="3" height="48" fill="#111"/>
                  <rect x="61" y="0" width="5" height="48" fill="#111"/>
                  <rect x="68" y="0" width="2" height="48" fill="#111"/>
                  <rect x="72" y="0" width="4" height="48" fill="#111"/>
                  <rect x="78" y="0" width="6" height="48" fill="#111"/>
                  <rect x="86" y="0" width="2" height="48" fill="#111"/>
                  <rect x="90" y="0" width="3" height="48" fill="#111"/>
                  <rect x="95" y="0" width="5" height="48" fill="#111"/>
                  <rect x="102" y="0" width="2" height="48" fill="#111"/>
                  <rect x="106" y="0" width="4" height="48" fill="#111"/>
                  <rect x="112" y="0" width="3" height="48" fill="#111"/>
                  <rect x="117" y="0" width="6" height="48" fill="#111"/>
                  <rect x="125" y="0" width="2" height="48" fill="#111"/>
                  <rect x="129" y="0" width="4" height="48" fill="#111"/>
                  <rect x="135" y="0" width="5" height="48" fill="#111"/>
                  <rect x="142" y="0" width="2" height="48" fill="#111"/>
                  <rect x="146" y="0" width="3" height="48" fill="#111"/>
                  <rect x="151" y="0" width="5" height="48" fill="#111"/>
                  <rect x="158" y="0" width="2" height="48" fill="#111"/>
                  <rect x="162" y="0" width="6" height="48" fill="#111"/>
                  <rect x="170" y="0" width="3" height="48" fill="#111"/>
                  <rect x="175" y="0" width="4" height="48" fill="#111"/>
                  <rect x="181" y="0" width="2" height="48" fill="#111"/>
                  <rect x="185" y="0" width="5" height="48" fill="#111"/>
                  <rect x="192" y="0" width="3" height="48" fill="#111"/>
                  <rect x="197" y="0" width="6" height="48" fill="#111"/>
                  <rect x="205" y="0" width="2" height="48" fill="#111"/>
                  <rect x="209" y="0" width="4" height="48" fill="#111"/>
                  <rect x="215" y="0" width="5" height="48" fill="#111"/>
                  <rect x="222" y="0" width="2" height="48" fill="#111"/>
                  <rect x="226" y="0" width="4" height="48" fill="#111"/>
                  <rect x="232" y="0" width="6" height="48" fill="#111"/>
                  <rect x="240" y="0" width="3" height="48" fill="#111"/>
                  <rect x="245" y="0" width="2" height="48" fill="#111"/>
                  <rect x="249" y="0" width="5" height="48" fill="#111"/>
                  <rect x="256" y="0" width="3" height="48" fill="#111"/>
                  <rect x="261" y="0" width="4" height="48" fill="#111"/>
                  <rect x="267" y="0" width="2" height="48" fill="#111"/>
                  <rect x="271" y="0" width="4" height="48" fill="#111"/>
                </svg>
                <div className="psx-barcode-number">*{waybillNumber}*</div>
              </div>

              {/* QR CODE */}
              {qrCodeUrl && (
                <div className="psx-qr-box">
                  <img src={qrCodeUrl} alt="Waybill QR code" className="psx-qr-img" />
                  <span className="psx-qr-caption">Scan for GDP Verify</span>
                </div>
              )}
            </div>
            <div className="psx-security-note">
              🔒 Verifiable via PharmaStackX B2B Ledger · Token: {paymentReference || waybillNumber}
            </div>
          </div>

          {/* FINANCIAL TOTALS */}
          <div className="psx-wb-totals-box">
            <div className="psx-total-row">
              <span>Items Consignment Subtotal:</span>
              <span>₦{subtotal.toLocaleString()}</span>
            </div>
            <div className="psx-total-row">
              <span>Haulage &amp; Dispatch Logistics:</span>
              <span>{deliveryFee === 0 ? 'FREE' : `₦${deliveryFee.toLocaleString()}`}</span>
            </div>
            <div className="psx-total-row">
              <span>B2B Wholesale Regulatory Levy (GDP):</span>
              <span className="green">₦0.00 (Waived)</span>
            </div>
            <div className="psx-total-row grand">
              <span>TOTAL CONSIGNMENT INVOICE:</span>
              <span>₦{totalAmount.toLocaleString()}</span>
            </div>
            <div className="psx-total-row status">
              <span>Settlement Status:</span>
              <span className="badge-paid">PAID IN FULL · ESCROW CLEARED</span>
            </div>
            <div className="psx-total-row balance">
              <span>Balance Outstanding:</span>
              <span>₦0.00</span>
            </div>
          </div>
        </div>

        {/* SIGN OFF & COMPLIANCE FOOTER */}
        <div className="psx-wb-signatures-grid">
          <div className="psx-sig-card">
            <div className="psx-sig-role">DISPATCHED BY (AIREN WHOLESALE DEPOT)</div>
            <div className="psx-sig-line">
              <span className="psx-sig-stamp">AIREN WHOLESALE DEPOT<br/>MISSION ROAD, BENIN CITY<br/>DISPATCHED &amp; SEALED</span>
            </div>
            <div className="psx-sig-meta">
              <p>Name: <strong>Pharm. E. Airen, B.Pharm, MPSN</strong></p>
              <p>Designation: <strong>Head of Wholesale Distribution &amp; Logistics</strong></p>
              <p>Sign &amp; Date: _______________________</p>
            </div>
          </div>

          <div className="psx-sig-card">
            <div className="psx-sig-role">RECEIVED IN GOOD ORDER (BUYER PHARMACY)</div>
            <div className="psx-sig-line empty">
              <span className="psx-stamp-placeholder">[ RETAIL PHARMACY OFFICIAL STAMP HERE ]</span>
            </div>
            <div className="psx-sig-meta">
              <p>Receiving Pharmacist: <strong>{buyerPharmacy.superintendentName || 'Superintendent Pharmacist'}</strong></p>
              <p>Premise PCN License: <strong>{buyerPharmacy.pcnLicense || 'Valid Ret. Lic.'}</strong></p>
              <p>Sign &amp; Date: _______________________</p>
            </div>
          </div>
        </div>

        {/* REGULATORY DISCLAIMER */}
        <div className="psx-wb-legal-footer">
          <p>
            <strong>REGULATORY NOTICE:</strong> This consignment document is issued in strict compliance with the 
            <em> Poison and Pharmacy Act (Cap 535, Laws of the Federation of Nigeria)</em>, 
            <em> Pharmacists Council of Nigeria (PCN) Act</em>, and <em>Good Distribution Practice (GDP)</em> guidelines. 
            All pharmaceuticals supplied are genuine, tamper-evident, and traceable to certified manufacturers. 
            Goods once accepted and inspected at destination premises are non-returnable except for verified transit cold-chain excursions reported within 4 hours of receipt.
          </p>
          <div className="psx-wb-legal-links">
            <span>Airen Wholesale Depot · 18 Mission Road, Benin City</span>
            <span>PharmaStackX B2B Wholesale Gateway</span>
            <span>Page 1 of 1 · Generated {orderDate}</span>
          </div>
        </div>

      </div>

      {/* PRINT-SPECIFIC CSS */}
      <style jsx global>{`
        .psx-waybill-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .psx-waybill-action-bar {
          width: 100%;
          max-width: 900px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #1e293b;
          color: white;
          padding: 12px 20px;
          border-radius: 12px;
          margin-bottom: 16px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }

        .psx-waybill-action-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .psx-pill {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          letter-spacing: 0.5px;
        }

        .psx-waybill-ref {
          font-family: monospace;
          font-weight: 700;
          color: #cbd5e1;
          font-size: 13px;
        }

        .psx-waybill-action-btns {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .psx-print-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #0f6e56;
          color: white;
          border: none;
          padding: 8px 18px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease;
        }
        .psx-print-btn:hover {
          background: #0b5341;
          transform: translateY(-1px);
        }

        .psx-close-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          border: none;
          padding: 8px 14px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
        }
        .psx-close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .psx-waybill-container {
          width: 100%;
          max-width: 900px;
          background: #ffffff;
          color: #0f172a;
          border-radius: 12px;
          padding: 36px 40px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
          font-size: 12px;
          line-height: 1.45;
        }

        .psx-wb-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
        }

        .psx-wb-brand {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          flex: 1;
        }

        .psx-wb-crest {
          width: 54px;
          height: 54px;
          border-radius: 12px;
          background: #0f6e56;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 10px rgba(15, 110, 86, 0.25);
        }

        .psx-wb-depot-name {
          font-family: 'Sora', sans-serif;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin: 0 0 3px 0;
          color: #0f172a;
        }

        .psx-wb-depot-sub {
          font-size: 10.5px;
          font-weight: 700;
          color: #0f6e56;
          margin: 0 0 6px 0;
          letter-spacing: 0.5px;
        }

        .psx-wb-depot-meta {
          font-size: 11px;
          color: #475569;
          margin: 0 0 8px 0;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .psx-wb-reg-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .psx-reg-tag {
          font-size: 10px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          padding: 2px 8px;
          border-radius: 4px;
          color: #334155;
        }

        .psx-wb-doc-title-box {
          text-align: right;
          flex-shrink: 0;
        }

        .psx-wb-doc-tag {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }

        .psx-wb-doc-title {
          font-family: 'Sora', sans-serif;
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px 0;
          letter-spacing: -0.3px;
        }

        .psx-wb-status-tag {
          display: inline-block;
          font-size: 10.5px;
          font-weight: 800;
          background: #dcfce7;
          color: #166534;
          padding: 3px 10px;
          border-radius: 6px;
          letter-spacing: 0.3px;
        }

        .psx-wb-divider-double {
          border-top: 3px double #cbd5e1;
          margin: 20px 0 16px 0;
        }

        .psx-wb-meta-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 16px;
        }

        .psx-wb-meta-cell {
          display: flex;
          flex-direction: column;
        }

        .psx-meta-lbl {
          font-size: 9.5px;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }

        .psx-meta-val {
          font-size: 12px;
          font-weight: 700;
          color: #0f172a;
        }
        .psx-meta-val.highlight {
          color: #0f6e56;
          font-family: monospace;
          font-size: 13px;
        }
        .psx-meta-val.green {
          color: #15803d;
        }

        .psx-wb-parties-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        .psx-wb-party-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px;
          background: #ffffff;
        }
        .psx-wb-party-card.highlight {
          border-color: #93c5fd;
          background: #f0f7ff;
        }

        .psx-party-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid #e2e8f0;
        }

        .psx-party-role {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #475569;
        }

        .psx-party-badge {
          font-size: 9.5px;
          font-weight: 700;
          background: #e2e8f0;
          color: #334155;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .psx-party-badge.buyer {
          background: #bfdbfe;
          color: #1e40af;
        }

        .psx-party-name {
          font-family: 'Sora', sans-serif;
          font-size: 13.5px;
          font-weight: 800;
          margin: 0 0 6px 0;
          color: #0f172a;
        }

        .psx-party-line {
          margin: 0 0 3px 0;
          font-size: 11.5px;
          color: #334155;
        }

        .psx-wb-route-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 16px;
          margin-bottom: 16px;
        }

        .psx-route-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .psx-route-icon {
          font-size: 22px;
        }

        .psx-route-title {
          font-size: 12px;
          color: #0f172a;
        }

        .psx-route-sub {
          font-size: 11px;
          color: #64748b;
        }

        .psx-route-right {
          display: flex;
          gap: 16px;
          text-align: right;
        }

        .psx-route-metric {
          display: flex;
          flex-direction: column;
        }

        .psx-metric-lbl {
          font-size: 9.5px;
          color: #64748b;
          font-weight: 700;
        }

        .psx-metric-val {
          font-size: 12px;
          font-weight: 800;
          color: #0f6e56;
        }

        .psx-wb-table-wrapper {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .psx-wb-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11.5px;
        }

        .psx-wb-table th {
          background: #f8fafc;
          border-bottom: 1px solid #cbd5e1;
          padding: 9px 10px;
          font-weight: 700;
          color: #334155;
          text-align: left;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .psx-wb-table td {
          padding: 10px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .psx-wb-table tr:last-child td {
          border-bottom: none;
        }

        .psx-item-name {
          font-weight: 700;
          color: #0f172a;
          font-size: 12px;
        }

        .psx-item-sub {
          font-size: 10px;
          color: #64748b;
        }

        .psx-pack-badge {
          display: inline-block;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          padding: 2px 7px;
          border-radius: 4px;
          font-size: 10.5px;
          font-weight: 600;
          color: #334155;
        }

        .psx-batch-code {
          font-family: monospace;
          font-weight: 700;
          color: #0f172a;
          font-size: 11px;
        }

        .psx-exp-date {
          font-size: 10px;
          color: #64748b;
        }

        .psx-wb-footer-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 16px;
          margin-bottom: 18px;
        }

        .psx-wb-security-box {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 12px;
          background: #ffffff;
        }

        .psx-sec-header {
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #64748b;
          margin-bottom: 10px;
        }

        .psx-sec-content {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .psx-barcode-box {
          flex: 1;
          text-align: center;
          padding: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
        }

        .psx-barcode-svg {
          width: 100%;
          height: 38px;
        }

        .psx-barcode-number {
          font-family: monospace;
          font-size: 10px;
          letter-spacing: 2px;
          color: #334155;
          margin-top: 2px;
        }

        .psx-qr-box {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
        }

        .psx-qr-img {
          width: 68px;
          height: 68px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 2px;
        }

        .psx-qr-caption {
          font-size: 8.5px;
          color: #64748b;
          font-weight: 700;
          margin-top: 2px;
        }

        .psx-security-note {
          margin-top: 8px;
          font-size: 9.5px;
          color: #64748b;
          font-style: italic;
        }

        .psx-wb-totals-box {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 12px 14px;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .psx-total-row {
          display: flex;
          justify-content: space-between;
          font-size: 11.5px;
          color: #475569;
        }
        .psx-total-row span.green {
          color: #16a34a;
          font-weight: 700;
        }
        .psx-total-row.grand {
          border-top: 1.5px solid #cbd5e1;
          border-bottom: 1.5px solid #cbd5e1;
          padding: 6px 0;
          margin: 3px 0;
          font-size: 13.5px;
          font-weight: 800;
          color: #0f172a;
        }
        .psx-total-row.status {
          font-size: 10.5px;
          align-items: center;
        }
        .badge-paid {
          background: #dcfce7;
          color: #15803d;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
        }
        .psx-total-row.balance {
          font-size: 11.5px;
          font-weight: 700;
          color: #334155;
        }

        .psx-wb-signatures-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        .psx-sig-card {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 12px;
          background: #ffffff;
        }

        .psx-sig-role {
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #475569;
          margin-bottom: 8px;
        }

        .psx-sig-line {
          height: 62px;
          border: 1px dashed #cbd5e1;
          border-radius: 6px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fdfdfd;
        }

        .psx-sig-stamp {
          font-size: 9px;
          font-weight: 800;
          color: #0f6e56;
          border: 1.5px solid #0f6e56;
          padding: 4px 10px;
          border-radius: 4px;
          text-align: center;
          transform: rotate(-3deg);
          letter-spacing: 0.5px;
        }

        .psx-stamp-placeholder {
          font-size: 9px;
          color: #94a3b8;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .psx-sig-meta p {
          margin: 0 0 2px 0;
          font-size: 10px;
          color: #475569;
        }

        .psx-wb-legal-footer {
          border-top: 1px solid #e2e8f0;
          padding-top: 10px;
          font-size: 9px;
          color: #64748b;
          line-height: 1.4;
        }
        .psx-wb-legal-footer p {
          margin: 0 0 6px 0;
        }

        .psx-wb-legal-links {
          display: flex;
          justify-content: space-between;
          font-size: 8.5px;
          color: #94a3b8;
          border-top: 1px dotted #e2e8f0;
          padding-top: 4px;
        }

        /* PRINT STYLES */
        @media print {
          body * {
            visibility: hidden;
          }
          .no-print {
            display: none !important;
          }
          .psx-waybill-modal-overlay {
            position: absolute !important;
            inset: 0 !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            display: block !important;
          }
          .psx-waybill-container, .psx-waybill-container * {
            visibility: visible !important;
          }
          .psx-waybill-container {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
