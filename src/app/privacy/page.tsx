export default function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: '800px', margin: '140px auto 60px auto', padding: '20px', fontFamily: 'sans-serif', lineHeight: '1.6', color: '#333' }}>
      <h1 style={{ color: '#0f172a' }}>PharmastackX Privacy Policy</h1>
      <p><em>Last updated: September 2026</em></p>
      
      <p>PharmastackX ("we", "us", or "our") develops the PharmastackX POS Connector browser extension to help pharmacies synchronize their point of sale operations.</p>
      
      <h2 style={{ color: '#0f172a', marginTop: '30px' }}>1. Information We Collect</h2>
      <p>When authorized by the user, the extension captures:</p>
      <ul>
        <li>Pharmacy inventory item names, quantities, and prices.</li>
        <li>Point of sale transaction records (line items, transaction amounts, timestamps).</li>
        <li>Internal product search queries performed on the pharmacy management portal.</li>
        <li>Authentication credentials linking the browser session to the pharmacy's POS portal.</li>
        <li>Personally identifiable information (such as cashier names or patient details that incidentally appear on POS receipts).</li>
      </ul>
      
      <h2 style={{ color: '#0f172a', marginTop: '30px' }}>2. How We Use Information</h2>
      <p>The data collected is used solely to provide pharmacy management analytics, stock reconciliation, and demand insights to the authenticated pharmacy owner and authorized staff.</p>
      
      <h2 style={{ color: '#0f172a', marginTop: '30px' }}>3. Data Sharing & Security</h2>
      <p>We do not sell, rent, or monetize your operational data with third parties. All network communications between the extension and our servers are encrypted using industry-standard TLS (HTTPS).</p>
      
      <h2 style={{ color: '#0f172a', marginTop: '30px' }}>4. Data Retention</h2>
      <p>Transaction and inventory logs are stored in secure databases for the duration of the pharmacy's active subscription. Users may request deletion of their data at any time by contacting support.</p>
    </div>
  );
}
