
import React from 'react';

export const PrivacyPolicy: React.FC<{onBack: () => void}> = ({onBack}) => (
  <div className="absolute inset-0 bg-white z-50 p-8 overflow-y-auto text-black">
    <button onClick={onBack} className="mb-4 text-blue-600 underline font-bold">← BACK</button>
    <h1 className="text-3xl font-black mb-4">PRIVACY POLICY</h1>
    <p className="mb-2"><strong>Effective Date:</strong> Oct 26, 2023</p>
    <p className="mb-4">Comic Bonk ("we", "us") respects your privacy. This policy explains how we handle data.</p>
    <h2 className="text-xl font-bold mb-2">1. Data Collection</h2>
    <p className="mb-2">We do not collect personal identifiers (name, email). We only interact with your Solana Public Key to verify NFT ownership.</p>
    <h2 className="text-xl font-bold mb-2">2. Blockchain Data</h2>
    <p className="mb-2">Transactions signed by you are public on the Solana blockchain. This is irreversible.</p>
    <h2 className="text-xl font-bold mb-2">3. Third Parties</h2>
    <p className="mb-2">We use Helius RPC for blockchain connectivity. Their privacy policy applies to RPC requests.</p>
  </div>
);

export const TermsOfService: React.FC<{onBack: () => void}> = ({onBack}) => (
  <div className="absolute inset-0 bg-white z-50 p-8 overflow-y-auto text-black">
    <button onClick={onBack} className="mb-4 text-blue-600 underline font-bold">← BACK</button>
    <h1 className="text-3xl font-black mb-4">TERMS OF SERVICE</h1>
    <p className="mb-4">By using Comic Bonk, you agree to these terms.</p>
    <h2 className="text-xl font-bold mb-2">1. Solana Seeker Requirement</h2>
    <p className="mb-2">This app is designed exclusively for Solana Seeker devices. Use on other devices is not supported.</p>
    <h2 className="text-xl font-bold mb-2">2. Assets</h2>
    <p className="mb-2">Genesis NFTs are virtual items with no guaranteed monetary value.</p>
    <h2 className="text-xl font-bold mb-2">3. Liability</h2>
    <p className="mb-2">We are not responsible for lost funds, failed transactions, or hammer-related thumb injuries.</p>
  </div>
);
