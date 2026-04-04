'use client';

import React, { useState, useEffect } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useSession } from '@/context/SessionProvider';
import RxScanModal from './RxScanModal';

interface DispatchFormProps {
  initialSearchValue?: string;
  setView: (view: string) => void;
  setSelectedRequestId: (id: string) => void;
  onViewResponses?: () => void;
  isNavigating?: boolean;
  initialRequestId?: string;
  initialScanRx?: boolean;
}

const nigerianStates = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara"
];

const DispatchForm: React.FC<DispatchFormProps> = ({ initialSearchValue, setView, setSelectedRequestId, onViewResponses,
  isNavigating = false,
  initialRequestId,
  initialScanRx = false
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchValue || '');
  const [isAddFormActive, setIsAddFormActive] = useState(false);
  const [expandedTiles, setExpandedTiles] = useState<Record<string, boolean>>({});
  const [newMedName, setNewMedName] = useState('');

  // Real or Mock State for the request list
  const [requestList, setRequestList] = useState<any[]>([]);
  const [pastRequests, setPastRequests] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(3);

  const { user } = useSession();
  const [modalState, setModalState] = useState<'none' | 'login' | 'confirm'>('none');
  const [isSearching, setIsSearching] = useState(false);
  const [showGuestGate, setShowGuestGate] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [generalNotes, setGeneralNotes] = useState('');
  const [prescriptionImage, setPrescriptionImage] = useState<string | null>(null);
  const [prescriptionImageFile, setPrescriptionImageFile] = useState<File | null>(null);
  const [scanMode, setScanMode] = useState<'rx' | 'med'>('rx');

  const handleScanResult = (medicines: any[], scanImage?: string) => {
    const newItems = medicines.map((m, index) => ({
      id: 'scan_' + Date.now() + index,
      name: m.name || (scanMode === 'med' ? 'Identified Medicine' : 'Scanned Medicine'),
      strength: m.strength || '',
      form: m.form || 'Tablet',
      quantity: m.quantity || 1,
      unit: m.unit || 'Packs',
      image: scanMode === 'med' ? scanImage : undefined
    }));
    setRequestList(prev => [...prev, ...newItems]);
    if (scanImage && scanMode === 'rx') {
      setPrescriptionImage(scanImage);
    }
    if (newItems.length > 0) {
      setExpandedTiles(prev => ({ ...prev, [newItems[0].id]: true }));
    }
  };

  React.useEffect(() => {
    if (initialRequestId) {
      setRequestId(initialRequestId);
      setIsSearching(true);
    }
    if (initialScanRx) {
      setIsScanModalOpen(true);
    }
  }, [initialRequestId, initialScanRx]);

  useEffect(() => {
    if (isSearching && !user) {
      const timer = setTimeout(() => setShowGuestGate(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowGuestGate(false);
    }
  }, [isSearching, user]);

  useEffect(() => {
    if (user?._id) {
      const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
          const res = await fetch(`/api/requests?source=dispatch&userId=${user._id}`);
          if (res.ok) {
            const data = await res.json();
            setPastRequests(Array.isArray(data) ? data : []);
          }
        } catch (err) {
          console.error('Failed to fetch request history:', err);
        } finally {
          setIsLoadingHistory(false);
        }
      };
      fetchHistory();
    }
  }, [user]);

  const handleSendRequest = () => {
    if (requestList.length === 0) return;
    if (!user) {
      setModalState('login');
    } else {
      setModalState('confirm');
    }
  };

  useEffect(() => {
    const screen = document.getElementById('search-screen-container') || document.body;

    function checkReveals() {
      const reveals = document.querySelectorAll('.reveal, .reveal-scale');
      reveals.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < (window.innerHeight || 800)) el.classList.add('visible');
      });
    }

    screen.addEventListener('scroll', checkReveals);
    window.addEventListener('scroll', checkReveals);
    
    // Multiple attempts to ensure newly rendered elements are caught
    checkReveals();
    const t1 = setTimeout(checkReveals, 100);
    const t2 = setTimeout(checkReveals, 500);
    const t3 = setTimeout(checkReveals, 1000);

    return () => {
      screen.removeEventListener('scroll', checkReveals);
      window.removeEventListener('scroll', checkReveals);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [requestList.length, isAddFormActive, isSearching, modalState]);

  const toggleTile = (id: string) => {
    setExpandedTiles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectSuggestion = (name: string) => {
    setSearchQuery(name);
    setIsAddFormActive(true);
    setNewMedName(name);
    setTimeout(() => {
      document.getElementById('addForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const showAddForm = () => {
    setIsAddFormActive(true);
    setTimeout(() => {
      document.getElementById('addForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const hideAddForm = () => {
    setIsAddFormActive(false);
    setSearchQuery('');
    setNewMedName('');
  };

  const handleAddToRequest = () => {
    if (!newMedName.trim() && !searchQuery.trim()) {
      hideAddForm();
      return;
    }

    // Add item to list
    const newItemId = 'item_' + Date.now();
    setRequestList(prev => [...prev, {
      id: newItemId,
      name: newMedName || searchQuery,
      strength: '',
      form: 'Tablet',
      quantity: 1,
      unit: 'Packs'
    }]);

    // Reset and hide form
    setNewMedName('');
    setSearchQuery('');
    setIsAddFormActive(false);
  };

  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRequestList(prev => prev.filter(item => item.id !== id));
  };

  const handleRefill = (request: any) => {
    const newItems = request.items.map((item: any) => ({
      ...item,
      id: 'item_' + Date.now() + Math.random().toString(36).substring(7)
    }));
    setRequestList(newItems);
    setTimeout(() => {
      document.querySelector('.med-list-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSeeQuotes = (reqId: string) => {
    setSelectedRequestId(reqId);
    setView('reviewRequest');
  };

  return (
    <div id="search-screen-container" style={{ width: '100%', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=DM+Sans:wght@300;400;500&family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,900&display=swap');
        
        #search-screen-container {
          --green: #0F6E56; --green-light: #1D9E75; --green-pale: #E1F5EE;
          --pink: #C84B8F; --pink-pale: #fdf0f6;
          --black: #111; --gray: #888; --light-gray: #bbb; --border: rgba(0,0,0,0.06);
          --bg: transparent;
          color: var(--black);
          padding-bottom: 100px;
          max-width: 500px;
          margin: 0 auto;
          background: transparent;
        }
        #search-screen-container * { box-sizing: border-box; }
        
        #search-screen-container .reveal { opacity: 0; transform: translateY(16px); transition: opacity 0.6s ease, transform 0.6s ease; }
        #search-screen-container .reveal.visible { opacity: 1; transform: translateY(0); }
        #search-screen-container .d1 { transition-delay: 0.1s; } 
        #search-screen-container .d2 { transition-delay: 0.2s; } 
        #search-screen-container .d3 { transition-delay: 0.3s; }
        #search-screen-container .d4 { transition-delay: 0.4s; } 
        #search-screen-container .d5 { transition-delay: 0.5s; } 
        #search-screen-container .d6 { transition-delay: 0.6s; }

        #search-screen-container .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 24px 24px 0px;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        #search-screen-container .back-btn:hover {
          opacity: 0.7;
        }
        #search-screen-container .back-btn-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid #e8e8e8;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.8);
          color: #888;
        }
        #search-screen-container .back-btn-text {
          font-size: 12px;
          color: #888;
          font-weight: 500;
        }

        #search-screen-container .header { padding: 16px 24px 16px; border-bottom: 1px solid var(--border); background: var(--bg); }
        #search-screen-container .header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        #search-screen-container .header-title { font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; color: var(--black); letter-spacing: -0.4px; margin: 0; }

        #search-screen-container .search-main { background: #fff; border: 1.5px solid var(--green); border-radius: 16px; padding: 13px 18px; display: flex; align-items: center; gap: 12px; box-shadow: 0 2px 16px rgba(15,110,86,0.08); }
        #search-screen-container .search-ring { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--green); flex-shrink: 0; }
        #search-screen-container .search-input { flex: 1; border: none; outline: none; font-size: 13px; color: var(--black); font-family: 'DM Sans', sans-serif; background: transparent; width: 100%; }
        #search-screen-container .search-input::placeholder { color: #ccc; font-weight: 300; }
        #search-screen-container .scan-btn { background: var(--pink); color: #fff; font-size: 10px; font-weight: 600; border-radius: 100px; padding: 7px 14px; white-space: nowrap; border: none; cursor: pointer; }

        #search-screen-container .suggestions { background: #fff; border: 1px solid #ebebeb; border-radius: 14px; margin-top: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); display: none; }
        #search-screen-container .suggestions.active { display: block; }
        #search-screen-container .suggestion-item { padding: 11px 16px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s; }
        #search-screen-container .suggestion-item:last-child { border-bottom: none; }
        #search-screen-container .suggestion-item:hover { background: var(--green-pale); }
        #search-screen-container .sug-icon { width: 30px; height: 30px; border-radius: 8px; background: var(--green-pale); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        #search-screen-container .sug-icon-inner { width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--green); }
        #search-screen-container .sug-name { font-size: 12px; font-weight: 500; color: var(--black); }
        #search-screen-container .sug-meta { font-size: 10px; color: #bbb; margin-top: 1px; }

        #search-screen-container .or-row { display: flex; align-items: center; gap: 12px; margin: 14px 0 12px; }
        #search-screen-container .or-line { flex: 1; height: 1px; background: var(--border); }
        #search-screen-container .or-text { font-size: 10px; color: #ccc; letter-spacing: 0.5px; text-transform: uppercase; }

        #search-screen-container .scan-options { display: flex; gap: 10px; margin-bottom: 0; }
        #search-screen-container .scan-option { flex: 1; background: rgba(255,255,255,0.85); border: 1px solid #ebebeb; border-radius: 12px; padding: 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: all 0.2s; }
        #search-screen-container .scan-option:hover { border-color: var(--green); background: #fff; }
        #search-screen-container .scan-opt-icon { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        #search-screen-container .scan-opt-icon.g { background: var(--green-pale); }
        #search-screen-container .scan-opt-icon.p { background: var(--pink-pale); }
        #search-screen-container .scan-opt-icon-inner { width: 12px; height: 12px; border-radius: 3px; border: 2px solid var(--green); }
        #search-screen-container .scan-opt-icon-inner.p { border-color: var(--pink); border-radius: 50%; }
        #search-screen-container .scan-opt-title { font-size: 11px; font-weight: 600; color: var(--black); font-family: 'Sora', sans-serif; letter-spacing: -0.1px; margin-bottom: 2px; }
        #search-screen-container .scan-opt-sub { font-size: 10px; color: #bbb; font-weight: 300; }

        #search-screen-container .med-list-section { padding: 20px 24px 0; }
        #search-screen-container .sec-label { font-size: 10px; color: var(--light-gray); letter-spacing: 1px; text-transform: uppercase; font-weight: 500; margin-bottom: 12px; }

        #search-screen-container .med-tile { background: #fff; border: 1px solid var(--border); border-radius: 14px; margin-bottom: 10px; overflow: hidden; transition: border-color 0.2s; max-width: 100%; }
        #search-screen-container .med-tile.expanded { border-color: var(--green); }
        #search-screen-container .med-tile-header { padding: 13px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; }
        #search-screen-container .med-tile-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); flex-shrink: 0; }
        #search-screen-container .med-tile-body { flex: 1; }
        #search-screen-container .med-tile-name { font-size: 13px; font-weight: 600; color: var(--black); font-family: 'Sora', sans-serif; letter-spacing: -0.2px; }
        #search-screen-container .med-tile-meta { font-size: 10px; color: #bbb; margin-top: 2px; }
        #search-screen-container .med-tile-actions { display: flex; align-items: center; gap: 8px; }
        #search-screen-container .med-tile-edit { font-size: 10px; color: var(--green); font-weight: 500; cursor: pointer; }
        #search-screen-container .med-tile-remove { width: 22px; height: 22px; border-radius: 50%; background: #f5f5f5; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 11px; color: #bbb; border: none; padding: 0; }

        #search-screen-container .med-tile-form { padding: 0 16px 16px; border-top: 1px solid var(--border); display: none; }
        #search-screen-container .med-tile.expanded .med-tile-form { display: block; }
        #search-screen-container .form-row { display: flex; gap: 8px; margin-top: 12px; width: 100%; }
        #search-screen-container .form-field { flex: 1; min-width: 0; }
        #search-screen-container .form-label { font-size: 10px; color: #bbb; margin-bottom: 5px; font-weight: 300; display: block; }
        #search-screen-container .form-input { width: 100%; background: #f8f8f8; border: 1px solid #ebebeb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: var(--black); font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.2s; -webkit-appearance: none; box-sizing: border-box; }
        #search-screen-container .form-input:focus { border-color: var(--green); background: #fff; }
        #search-screen-container .form-input::placeholder { color: #ccc; }
        #search-screen-container .form-select { width: 100%; background: #f8f8f8; border: 1px solid #ebebeb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: var(--black); font-family: 'DM Sans', sans-serif; outline: none; -webkit-appearance: none; appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23bbb' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; box-sizing: border-box; }
        #search-screen-container .form-notes { width: 100%; background: #f8f8f8; border: 1px solid #ebebeb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: var(--black); font-family: 'DM Sans', sans-serif; outline: none; resize: none; height: 60px; transition: border-color 0.2s; margin-top: 0; box-sizing: border-box; }
        #search-screen-container .form-notes:focus { border-color: var(--green); background: #fff; }
        #search-screen-container .form-notes::placeholder { color: #ccc; font-weight: 300; }
        #search-screen-container .upload-img-btn { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--pink); font-weight: 500; cursor: pointer; margin-top: 10px; }
        #search-screen-container .upload-img-icon { width: 20px; height: 20px; border-radius: 6px; background: var(--pink-pale); display: flex; align-items: center; justify-content: center; }
        #search-screen-container .upload-img-icon-inner { width: 8px; height: 8px; border-radius: 1px; border: 1.5px solid var(--pink); }
        #search-screen-container .done-btn { width: 100%; background: var(--green); color: #fff; border-radius: 10px; padding: 11px; font-size: 12px; font-weight: 600; text-align: center; font-family: 'Sora', sans-serif; border: none; cursor: pointer; margin-top: 12px; }

        #search-screen-container .add-new-section { padding: 0 24px; }
        #search-screen-container .add-new-search { background: rgba(255,255,255,0.85); border: 1.5px dashed #ddd; border-radius: 14px; padding: 13px 18px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.2s; margin-bottom: 8px; }
        #search-screen-container .add-new-search:hover { border-color: var(--green); background: #fff; }
        #search-screen-container .add-new-ring { width: 18px; height: 18px; border-radius: 50%; border: 2px dashed #ccc; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #ccc; }
        #search-screen-container .add-new-text { font-size: 12px; color: #bbb; font-weight: 300; }

        #search-screen-container .add-form { background: #fff; border: 1.5px solid var(--green); border-radius: 14px; padding: 16px; margin-bottom: 8px; display: none; }
        #search-screen-container .add-form.active { display: block; }
        #search-screen-container .add-form-title { font-size: 11px; font-weight: 600; color: var(--green); font-family: 'Sora', sans-serif; margin-bottom: 12px; letter-spacing: -0.1px; }

        #search-screen-container .notes-section { padding: 8px 24px 0; }
        #search-screen-container .notes-field { width: 100%; background: rgba(255,255,255,0.85); border: 1px solid #ebebeb; border-radius: 14px; padding: 13px 16px; font-size: 12px; color: var(--black); font-family: 'DM Sans', sans-serif; outline: none; resize: none; height: 72px; transition: border-color 0.2s; box-sizing: border-box; }
        #search-screen-container .notes-field:focus { border-color: var(--green); background: #fff; }
        #search-screen-container .notes-field::placeholder { color: #ccc; font-weight: 300; }

        #search-screen-container .send-section { padding: 16px 24px; }
        #search-screen-container .send-btn { width: 100%; background: var(--green); color: #fff; border-radius: 14px; padding: 16px; font-size: 14px; font-weight: 600; text-align: center; font-family: 'Sora', sans-serif; letter-spacing: -0.3px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: opacity 0.2s; box-sizing: border-box; }
        #search-screen-container .send-btn:hover { opacity: 0.88; }
        #search-screen-container .send-arrow { width: 22px; height: 22px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 12px; }
        #search-screen-container .send-hint { text-align: center; font-size: 11px; color: #bbb; margin-top: 8px; font-weight: 300; }
        #search-screen-container .send-hint span { color: var(--green); font-weight: 500; }

        /* RECENT */
        #search-screen-container .recent-section { padding: 4px 24px 24px; }
        #search-screen-container .recent-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        #search-screen-container .recent-chip { background: #fff; border: 1px solid #ebebeb; border-radius: 100px; padding: 7px 14px; font-size: 11px; color: var(--gray); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
        #search-screen-container .recent-chip:hover { border-color: var(--green); color: var(--green); background: var(--green-pale); }
        #search-screen-container .recent-chip-dot { width: 5px; height: 5px; border-radius: 50%; background: #ddd; }
        #search-screen-container .recent-chip:hover .recent-chip-dot { background: var(--green); }

        /* MODAL OVERLAY */
        #search-screen-container .modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(10,15,12,0.6);display:flex;align-items:flex-end;justify-content:center;z-index:9000;backdrop-filter:blur(3px)}

        /* LOGIN MODAL */
        #search-screen-container .login-modal{background:var(--bg);border-radius:28px 28px 0 0;padding:24px;padding-bottom:110px;width:100%;max-width:500px;max-height:92vh;overflow-y:auto;animation:slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1)}
        #search-screen-container .modal-handle{width:36px;height:4px;border-radius:2px;background:#ddd;margin:0 auto 20px}
        #search-screen-container .modal-title{font-family:'Fraunces',serif;font-size:22px;font-weight:900;color:var(--black);letter-spacing:-0.8px;line-height:1.2;margin-bottom:6px}
        #search-screen-container .modal-title em{color:var(--green);font-style:italic}
        #search-screen-container .modal-sub{font-size:12px;color:var(--gray);font-weight:300;line-height:1.65;margin-bottom:22px}
        #search-screen-container .modal-btn-primary{width:100%;background:var(--black);color:#fff;border-radius:13px;padding:15px;font-size:13px;font-weight:600;text-align:center;font-family:'Sora',sans-serif;letter-spacing:-0.2px;border:none;cursor:pointer;margin-bottom:10px}
        #search-screen-container .modal-btn-green{width:100%;background:var(--green);color:#fff;border-radius:13px;padding:15px;font-size:13px;font-weight:600;text-align:center;font-family:'Sora',sans-serif;letter-spacing:-0.2px;border:none;cursor:pointer;margin-bottom:10px}
        #search-screen-container .modal-btn-outline{width:100%;background:transparent;border:1px solid #ebebeb;color:var(--gray);border-radius:13px;padding:14px;font-size:13px;font-weight:600;text-align:center;font-family:'DM Sans',sans-serif;cursor:pointer;margin-bottom:0}
        #search-screen-container .modal-divider{display:flex;align-items:center;gap:10px;margin:14px 0}
        #search-screen-container .modal-divider-line{flex:1;height:1px;background:var(--border)}
        #search-screen-container .modal-divider-text{font-size:10px;color:#ccc;letter-spacing:0.5px;text-transform:uppercase}
        #search-screen-container .modal-note{text-align:center;font-size:11px;color:#bbb;margin-top:12px;font-weight:300;line-height:1.6}
        #search-screen-container .modal-note span{color:var(--green);font-weight:500}

        /* BENEFITS LIST */
        #search-screen-container .benefits{background:var(--green-pale);border:1px solid rgba(15,110,86,0.12);border-radius:14px;padding:14px;margin-bottom:20px}
        #search-screen-container .benefit-item{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px}
        #search-screen-container .benefit-item:last-child{margin-bottom:0}
        #search-screen-container .benefit-dot{width:16px;height:16px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
        #search-screen-container .benefit-dot-inner{width:5px;height:5px;border-radius:50%;background:#fff}
        #search-screen-container .benefit-text{font-size:11px;color:var(--gray);line-height:1.55;font-weight:300}
        #search-screen-container .benefit-text strong{color:var(--green);font-weight:500}

        /* CONFIRM MODAL */
        #search-screen-container .confirm-modal{background:var(--bg);border-radius:28px 28px 0 0;padding:24px;padding-bottom:110px;width:100%;max-width:500px;max-height:92vh;overflow-y:auto;animation:slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1)}
        #search-screen-container .confirm-request-summary{background:#fff;border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:18px;max-height:180px;overflow-y:auto}
        #search-screen-container .confirm-summary-label{font-size:10px;color:var(--light-gray);letter-spacing:1px;text-transform:uppercase;font-weight:500;margin-bottom:10px}
        #search-screen-container .confirm-med{display:flex;align-items:center;gap:10px;margin-bottom:8px}
        #search-screen-container .confirm-med:last-child{margin-bottom:0}
        #search-screen-container .confirm-med-dot{width:7px;height:7px;border-radius:50%;background:var(--green);flex-shrink:0}
        #search-screen-container .confirm-med-name{font-size:12px;font-weight:500;color:var(--black);flex:1}
        #search-screen-container .confirm-med-meta{font-size:10px;color:#bbb;white-space:nowrap}
        #search-screen-container .confirm-field{margin-bottom:14px}
        #search-screen-container .confirm-label{font-size:10px;color:var(--light-gray);letter-spacing:1px;text-transform:uppercase;font-weight:500;display:block;margin-bottom:6px}
        #search-screen-container .confirm-input{width:100%;background:rgba(255,255,255,0.85);border:1px solid #ebebeb;border-radius:13px;padding:13px 16px;font-size:13px;color:var(--black);font-family:'DM Sans',sans-serif;outline:none;transition:border-color 0.2s;box-sizing:border-box}
        #search-screen-container .confirm-input:focus{border-color:var(--green);background:#fff}
        #search-screen-container .confirm-input::placeholder{color:#ccc}
        #search-screen-container .confirm-select{width:100%;background:rgba(255,255,255,0.85);border:1px solid #ebebeb;border-radius:13px;padding:13px 16px;font-size:13px;color:var(--black);font-family:'DM Sans',sans-serif;outline:none;-webkit-appearance:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23bbb' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;box-sizing:border-box}
        #search-screen-container .confirm-select:focus{border-color:var(--green)}
        #search-screen-container .search-scope-note{background:var(--green-pale);border:1px solid rgba(15,110,86,0.15);border-radius:12px;padding:12px 14px;margin-bottom:18px;display:flex;gap:10px;align-items:flex-start}
        #search-screen-container .scope-bar{width:3px;background:var(--green);border-radius:2px;flex-shrink:0;opacity:0.5;align-self:stretch}
        #search-screen-container .scope-text{font-size:11px;color:var(--gray);line-height:1.65;font-weight:300}
        #search-screen-container .scope-text strong{color:var(--green);font-weight:500}
        #search-screen-container .phone-wrap{display:flex;width:100%}
        #search-screen-container .phone-prefix{background:rgba(255,255,255,0.85);border:1px solid #ebebeb;border-right:none;border-radius:13px 0 0 13px;padding:13px 14px;font-size:13px;color:var(--gray);font-weight:500;white-space:nowrap;display:flex;align-items:center;gap:4px}
        #search-screen-container .phone-prefix span{font-size:10px}
        #search-screen-container .phone-wrap .confirm-input{border-radius:0 13px 13px 0}
        
        /* RADAR ANIMATION */
        #search-screen-container .radar-section{padding:32px 24px 24px;text-align:center}
        #search-screen-container .radar-wrap{position:relative;width:160px;height:160px;margin:0 auto 28px}
        #search-screen-container .radar-ring{position:absolute;border-radius:50%;border:1px solid rgba(15,110,86,0.15);top:50%;left:50%;transform:translate(-50%,-50%)}
        #search-screen-container .radar-ring-1{width:160px;height:160px;animation:ripple 2.5s 0s infinite}
        #search-screen-container .radar-ring-2{width:120px;height:120px;animation:ripple 2.5s 0.5s infinite}
        #search-screen-container .radar-ring-3{width:80px;height:80px;animation:ripple 2.5s 1s infinite}
        #search-screen-container .radar-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:48px;height:48px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(15,110,86,0.3)}
        #search-screen-container .radar-center-inner{width:20px;height:20px;border-radius:50%;border:3px solid rgba(255,255,255,0.6)}

        #search-screen-container .pharma-dot{position:absolute;width:12px;height:12px;border-radius:50%;background:#fff;border:2px solid var(--green);display:flex;align-items:center;justify-content:center;animation:fadeUp 0.5s ease both}
        #search-screen-container .pharma-dot-inner{width:4px;height:4px;border-radius:50%;background:var(--green)}
        #search-screen-container .pd1{top:10px;left:30px;animation-delay:1s}
        #search-screen-container .pd2{top:20px;right:20px;animation-delay:1.5s}
        #search-screen-container .pd3{bottom:20px;left:20px;animation-delay:2s}
        #search-screen-container .pd4{bottom:10px;right:35px;animation-delay:2.5s}

        #search-screen-container .radar-title{font-family:'Fraunces',serif;font-size:24px;font-weight:900;color:var(--black);letter-spacing:-0.8px;line-height:1.2;margin-bottom:8px}
        #search-screen-container .radar-title em{color:var(--green);font-style:italic}
        #search-screen-container .radar-sub{font-size:12px;color:var(--gray);line-height:1.7;font-weight:300;max-width:240px;margin:0 auto}

        /* REQUEST SUMMARY in RADAR */
        #search-screen-container .request-card{margin:0 24px 16px;background:#fff;border:1px solid var(--border);border-radius:16px;padding:16px}
        #search-screen-container .request-card-label{font-size:10px;color:var(--light-gray);letter-spacing:1px;text-transform:uppercase;font-weight:500;margin-bottom:12px}
        #search-screen-container .request-med{display:flex;align-items:center;gap:10px;margin-bottom:8px}
        #search-screen-container .request-med:last-child{margin-bottom:0}
        #search-screen-container .request-med-dot{width:7px;height:7px;border-radius:50%;background:var(--green);flex-shrink:0}
        #search-screen-container .request-med-name{font-size:12px;font-weight:500;color:var(--black)}
        #search-screen-container .request-med-meta{font-size:10px;color:#bbb;margin-left:auto}
        #search-screen-container .request-divider{height:1px;background:var(--border);margin:10px 0}
        #search-screen-container .request-footer{display:flex;justify-content:space-between;align-items:center}
        #search-screen-container .request-time{font-size:10px;color:#bbb}
        #search-screen-container .request-location{display:flex;align-items:center;gap:4px;font-size:10px;color:var(--green);font-weight:500}
        #search-screen-container .request-loc-dot{width:5px;height:5px;border-radius:50%;background:var(--green)}

        /* NOTIFICATION PROMPT */
        #search-screen-container .notif-prompt{margin:0 24px 16px;background:var(--pink-pale);border:1px solid rgba(200,75,143,0.15);border-radius:14px;padding:14px;display:flex;gap:12px;align-items:flex-start}
        #search-screen-container .notif-icon{width:36px;height:36px;border-radius:10px;background:rgba(200,75,143,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        #search-screen-container .notif-icon-inner{width:14px;height:14px;border-radius:3px;border:2px solid var(--pink)}
        #search-screen-container .notif-title{font-size:12px;font-weight:600;color:var(--black);font-family:'Sora',sans-serif;margin-bottom:3px;letter-spacing:-0.2px}
        #search-screen-container .notif-sub{font-size:11px;color:var(--gray);line-height:1.55;font-weight:300;margin-bottom:10px}
        #search-screen-container .notif-btn{background:var(--pink);color:#fff;border-radius:8px;padding:8px 14px;font-size:11px;font-weight:600;font-family:'Sora',sans-serif;display:inline-block;cursor:pointer;border:none}

        /* CANCEL ROW */
        #search-screen-container .cancel-row{text-align:center;padding:8px 0 16px}
        #search-screen-container .cancel-text{font-size:11px;color:#bbb;cursor:pointer}
        #search-screen-container .cancel-text span{color:var(--pink);font-weight:500}

        /* GUEST GATE OVERLAY */
        #search-screen-container .guest-gate{position:fixed;top:0;left:0;right:0;bottom:0;z-index:9000;display:flex;flex-direction:column;justify-content:flex-end;animation:slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1)}
        #search-screen-container .guest-gate-blur{position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(250,250,248,0.75);backdrop-filter:blur(8px)}
        #search-screen-container .guest-gate-sheet{position:relative;z-index:1;background:var(--bg);border-radius:28px 28px 0 0;padding:28px 24px;padding-bottom:110px;box-shadow:0 -8px 40px rgba(0,0,0,0.1);width:100%;max-width:500px;margin:0 auto}
        #search-screen-container .guest-gate-handle{width:36px;height:4px;border-radius:2px;background:#ddd;margin:0 auto 22px}
        #search-screen-container .guest-gate-icon{width:52px;height:52px;border-radius:16px;background:var(--green-pale);margin:0 auto 16px;display:flex;align-items:center;justify-content:center}
        #search-screen-container .guest-gate-icon-inner{width:22px;height:22px;border-radius:50%;border:3px solid var(--green)}
        #search-screen-container .guest-gate-title{font-family:'Fraunces',serif;font-size:22px;font-weight:900;color:var(--black);letter-spacing:-0.8px;line-height:1.2;text-align:center;margin-bottom:8px}
        #search-screen-container .guest-gate-title em{color:var(--green);font-style:italic}
        #search-screen-container .guest-gate-sub{font-size:12px;color:var(--gray);font-weight:300;line-height:1.65;text-align:center;margin-bottom:22px}
        #search-screen-container .guest-gate-sub span{color:var(--green);font-weight:500}
        #search-screen-container .guest-gate-btn-primary{width:100%;background:var(--black);color:#fff;border-radius:13px;padding:15px;font-size:13px;font-weight:600;text-align:center;font-family:'Sora',sans-serif;letter-spacing:-0.2px;border:none;cursor:pointer;margin-bottom:10px}
        #search-screen-container .guest-gate-btn-green{width:100%;background:var(--green);color:#fff;border-radius:13px;padding:15px;font-size:13px;font-weight:600;text-align:center;font-family:'Sora',sans-serif;letter-spacing:-0.2px;border:none;cursor:pointer;margin-bottom:14px}
        #search-screen-container .guest-gate-note{text-align:center;font-size:11px;color:#bbb;font-weight:300}
        
        .reveal-scale{opacity:0;transform:scale(0.94);transition:opacity 0.7s ease,transform 0.7s ease}
        .reveal-scale.visible{opacity:1;transform:scale(1)}

        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.7)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ripple{0%{transform:scale(0.8);opacity:0.8}100%{transform:scale(2.2);opacity:0}}
      `}</style>

      {isSearching ? (
        <div style={{ paddingBottom: '110px' }}>
          <div className="header reveal visible">
            <div className="back-btn" onClick={() => setIsSearching(false)}>
              <div className="back-circle">
                <ArrowBackIcon style={{ fontSize: 16 }} />
              </div>
              <div className="back-text">My requests</div>
            </div>
            <div className="header-badge" style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--pink-pale)', border: '1px solid rgba(200,75,143,0.15)', borderRadius: '100px', padding: '5px 12px' }}>
              <div className="header-badge-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--pink)', animation: 'pulseDot 1.5s infinite' }}></div>
              <div className="header-badge-text" style={{ fontSize: '10px', color: 'var(--pink)', fontWeight: 500 }}>Searching...</div>
            </div>
          </div>

          <div className="radar-section">
            <div className="radar-wrap reveal-scale visible d1">
              <div className="radar-ring radar-ring-1"></div>
              <div className="radar-ring radar-ring-2"></div>
              <div className="radar-ring radar-ring-3"></div>
              <div className="pharma-dot pd1"><div className="pharma-dot-inner"></div></div>
              <div className="pharma-dot pd2"><div className="pharma-dot-inner"></div></div>
              <div className="pharma-dot pd3"><div className="pharma-dot-inner"></div></div>
              <div className="pharma-dot pd4"><div className="pharma-dot-inner"></div></div>
              <div className="radar-center">
                <div className="radar-center-inner"></div>
              </div>
            </div>
            <div className="radar-title reveal visible d2" style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', fontWeight: 900, color: '#111', letterSpacing: '-0.8px', lineHeight: 1.2, marginBottom: '8px' }}>
              Searching for <em style={{ color: 'var(--green)', fontStyle: 'italic' }}>medicines</em>
            </div>
            <div className="radar-sub reveal visible d2" style={{ fontSize: '12px', color: 'var(--gray)', lineHeight: 1.7, fontWeight: 300, maxWidth: '240px', margin: '0 auto' }}>
              Your request has been sent to pharmacists within 5km. You'll be notified as soon as someone responds.
            </div>

            {requestId && (
              <div className="reveal visible d2" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    if (requestId) {
                      setSelectedRequestId(requestId);
                      setView('reviewRequest');
                    }
                  }}
                  style={{
                    background: 'var(--green)',
                    color: '#fff',
                    borderRadius: '100px',
                    padding: '10px 24px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(15, 110, 86, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'pulseDot 2s infinite' }}></div>
                  View Responses
                </button>
              </div>
            )}
          </div>

          <div className="request-card reveal visible d3">
            <div className="request-card-label">Your request</div>
            {requestList.map(item => (
              <div className="request-med" key={item.id}>
                <div className="request-med-dot"></div>
                <div className="request-med-name">{item.name}</div>
                <div className="request-med-meta">Qty: {item.quantity} {item.unit}</div>
              </div>
            ))}
            <div className="request-divider"></div>
            <div className="request-footer">
              <div className="request-time">Sent just now</div>
              <div className="request-location">
                <div className="request-loc-dot"></div>
                {user?.city || 'Your Location'}
              </div>
            </div>
          </div>

          <div className="notif-prompt reveal visible d4">
            <div className="notif-icon"><div className="notif-icon-inner"></div></div>
            <div className="notif-body">
              <div className="notif-title">Get instant alerts</div>
              <div className="notif-sub">Add PharmaStackX to your home screen to receive push notifications when a pharmacist responds.</div>
              <button className="notif-btn">Add to home screen</button>
            </div>
          </div>



          <div className="cancel-row reveal visible d6">
            <div className="cancel-text" onClick={() => { setIsSearching(false); setModalState('confirm'); }}>Changed your mind? <span>Cancel request</span></div>
          </div>

          {!user && showGuestGate && (
            <div className="guest-gate">
              <style>{`#whatsapp-live-support-btn { display: none !important; }`}</style>
              <div className="guest-gate-blur"></div>
              <div className="guest-gate-sheet">
                <div className="guest-gate-handle"></div>
                <div className="guest-gate-icon"><div className="guest-gate-icon-inner"></div></div>
                <div className="guest-gate-title">Login to view<br /><em>responses.</em></div>
                <div className="guest-gate-sub">Your request has been sent. When a pharmacist responds you'll need to be logged in to <span>view and accept their quote.</span></div>
                <button className="guest-gate-btn-primary" onClick={() => window.location.href = '/auth?mode=login'}>Sign in</button>
                <button className="guest-gate-btn-green" onClick={() => window.location.href = '/auth'}>Create account</button>
                <div className="guest-gate-note" style={{ paddingTop: '8px' }}>Your request is saved and will still receive responses</div>
                <div
                  onClick={() => { setIsSearching(false); setModalState('confirm'); }}
                  style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#888', fontWeight: 500, cursor: 'pointer' }}
                >
                  <span style={{ color: 'var(--pink)' }}>Go back</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div style={{
            opacity: modalState !== 'none' ? 0.3 : 1,
            filter: modalState !== 'none' ? 'blur(3px)' : 'none',
            pointerEvents: modalState !== 'none' ? 'none' : 'auto',
            transition: 'all 0.3s ease'
          }}>
            <div className="back-btn reveal visible" onClick={() => setView('home')}>
              <div className="back-btn-icon">
                <ArrowBackIcon style={{ fontSize: 16 }} />
              </div>
              <div className="back-btn-text">Back to home</div>
            </div>

            <div className="header">
              <div className="header-top reveal visible" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 className="header-title">Find a medicine</h1>
                <div 
                  onClick={() => setView('findMedicines')}
                  style={{ 
                    fontSize: '10px', 
                    color: 'var(--green)', 
                    fontWeight: 800, 
                    cursor: 'pointer',
                    padding: '6px 14px',
                    background: 'var(--green-pale)',
                    borderRadius: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    border: '1.5px solid rgba(15, 110, 86, 0.15)',
                    transition: 'all 0.2s ease',
                    fontFamily: "'Sora', sans-serif",
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  className="hover-opacity"
                >
                  Browse Catalog <span>→</span>
                </div>
              </div>

              <div className="reveal d1">
                <div className="search-main">
                  <div className="search-ring"></div>
                  <input
                    className="search-input"
                    type="text"
                    placeholder="Type any medicine name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchQuery && selectSuggestion(searchQuery)}
                  />
                  <button
                    className="scan-btn"
                    style={{
                      background: searchQuery.trim().length > 0 ? 'var(--green)' : 'var(--pink)',
                      transition: 'background 0.2s ease',
                    }}
                    onClick={() => {
                      if (searchQuery.trim().length > 0) {
                        selectSuggestion(searchQuery);
                      } else {
                        setScanMode('rx');
                        setIsScanModalOpen(true);
                      }
                    }}
                  >
                    {searchQuery.trim().length > 0 ? 'Enter' : 'Scan Rx'}
                  </button>
                </div>
                <div className={`suggestions ${searchQuery.length > 0 && !isAddFormActive ? 'active' : ''}`} id="suggestions">
                  <div className="suggestion-item" onClick={() => selectSuggestion(searchQuery)}>
                    <div className="sug-icon"><div className="sug-icon-inner"></div></div>
                    <div><div className="sug-name">Add "{searchQuery}"</div><div className="sug-meta">New Request</div></div>
                  </div>
                </div>
              </div>

              <div className="or-row reveal d2">
                <div className="or-line"></div>
                <div className="or-text">or search by</div>
                <div className="or-line"></div>
              </div>

              <div className="scan-options reveal d2">
                <div className="scan-option" onClick={() => { setScanMode('rx'); setIsScanModalOpen(true); }}>
                  <div className="scan-opt-icon g"><div className="scan-opt-icon-inner"></div></div>
                  <div><div className="scan-opt-title">Prescription</div><div className="scan-opt-sub">AI reads all medicines</div></div>
                </div>
                <div className="scan-option" style={{ cursor: 'pointer' }} onClick={() => { setScanMode('med'); setIsScanModalOpen(true); }}>
                  <div className="scan-opt-icon p"><div className="scan-opt-icon-inner p"></div></div>
                  <div><div className="scan-opt-title">Medicine image</div><div className="scan-opt-sub">AI identifies the drug</div></div>
                </div>
              </div>

              <div className="reveal d3" style={{ marginTop: '24px' }}>
                <button
                  disabled={isNavigating}
                  onClick={() => {
                    if (onViewResponses) {
                      onViewResponses();
                    } else {
                      setView('orders');
                    }
                  }}
                  style={{
                    width: '100%',
                    background: isNavigating ? 'rgba(15, 110, 86, 0.04)' : 'rgba(15, 110, 86, 0.08)',
                    color: 'var(--green)',
                    border: '1.5px solid rgba(15, 110, 86, 0.15)',
                    borderRadius: '16px',
                    padding: '18px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    cursor: isNavigating ? 'not-allowed' : 'pointer',
                    fontFamily: "'Sora', sans-serif",
                    opacity: isNavigating ? 0.7 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isNavigating ? (
                    <div style={{ width: 14, height: 14, border: '2px solid rgba(15,110,86,0.2)', borderTop: '2px solid var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                  ) : (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', animation: 'pulseDot 2s infinite' }}></div>
                  )}
                  {isNavigating ? 'Fetching responses...' : 'View my medicine responses'}
                </button>
                <style>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          `}</style>
              </div>
            </div>

            {/* MEDICINE LIST / DISPATCH BUILDING */}
            <div className="med-list-section">
              {/* PERSISTENT GENERAL NOTES */}
              <div className="sec-label" style={{ fontSize: '10px', color: 'var(--light-gray)', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 500, marginBottom: '12px', padding: '0 24px' }}>Medicines in this request</div>

              {requestList.length > 0 ? (
                requestList.map((item) => (
                  <div key={item.id} className={`med-tile ${expandedTiles[item.id] ? 'expanded' : ''}`} id={item.id}>
                    <div className="med-tile-header" onClick={() => toggleTile(item.id)}>
                      <div className="med-tile-dot"></div>
                      <div className="med-tile-body">
                        <div className="med-tile-name">{item.name}</div>
                        <div className="med-tile-meta">
                          {item.strength ? `${item.strength} · ` : ''}Qty: {item.quantity} {item.unit} · {item.form}
                        </div>
                      </div>
                      <div className="med-tile-actions">
                        <div className="med-tile-edit">Edit</div>
                        <button className="med-tile-remove" onClick={(e) => handleRemoveItem(item.id, e)}>×</button>
                      </div>
                    </div>
                    <div className="med-tile-form">
                      <div className="form-row">
                        <div className="form-field">
                          <label className="form-label">Medicine name</label>
                          <input className="form-input" type="text" defaultValue={item.name} placeholder="Medicine Name" />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-field">
                          <label className="form-label">Strength</label>
                          <input className="form-input" type="text" placeholder="e.g. 500mg" defaultValue={item.strength} />
                        </div>
                        <div className="form-field">
                          <label className="form-label">Form</label>
                          <select className="form-select" defaultValue={item.form}>
                            <option>Tablet</option>
                            <option>Capsule</option>
                            <option>Syrup</option>
                            <option>Injection</option>
                            <option>Cream</option>
                            <option>Inhaler</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-field">
                          <label className="form-label">Quantity</label>
                          <input className="form-input" type="number" defaultValue={item.quantity} />
                        </div>
                        <div className="form-field">
                          <label className="form-label">Unit</label>
                          <select className="form-select" defaultValue={item.unit}>
                            <option>Strips</option>
                            <option>Packs</option>
                            <option>Bottles</option>
                            <option>Vials</option>
                            <option>Sachets</option>
                            <option>Pieces</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-field">
                          <label className="form-label">Notes (brand, active ingredient etc.)</label>
                          <textarea className="form-notes" placeholder="Any specific brand or notes..."></textarea>
                        </div>
                      </div>
                      <label className="upload-img-btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              const tempUrl = URL.createObjectURL(file);
                              setRequestList(prev => prev.map(req => req.id === item.id ? { ...req, image: tempUrl, imageFile: file } : req));
                            }
                          }}
                        />
                        {!item.image ? (
                          <>
                            <div className="upload-img-icon"><div className="upload-img-icon-inner"></div></div>
                            Upload medicine image
                          </>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img src={item.image} alt="Uploaded" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} />
                            <span style={{ color: '#0F6E56', fontWeight: 500 }}>Image attached (Tap to change)</span>
                          </div>
                        )}
                      </label>
                      <div style={{ paddingBottom: '16px' }}>
                        <button className="done-btn" onClick={() => toggleTile(item.id)}>Done</button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '32px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.4)', borderRadius: '24px', border: '1.5px dashed rgba(0,0,0,0.06)' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #eee' }}></div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111', marginBottom: '4px' }}>No medicines added</div>
                  <div style={{ fontSize: '12px', color: '#999' }}>Search above to start your request</div>
                </div>
              )}
            </div>

            {/* ADD NEW MEDICINE */}
            <div className="add-new-section">
              {/* ADD FORM */}
              <div className={`add-form ${isAddFormActive ? 'active' : ''}`} id="addForm">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div className="add-form-title" style={{ marginBottom: 0 }}>Adding new medicine</div>
                  <button
                    onClick={hideAddForm}
                    style={{ background: 'transparent', border: 'none', fontSize: '18px', color: '#bbb', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
                <div className="form-row" style={{ marginTop: 0 }}>
                  <div className="form-field">
                    <label className="form-label">Medicine name</label>
                    <input className="form-input" type="text" placeholder="Type medicine name" value={newMedName} onChange={(e) => setNewMedName(e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label className="form-label">Strength</label>
                    <input className="form-input" type="text" placeholder="e.g. 500mg" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Form</label>
                    <select className="form-select" defaultValue="">
                      <option value="" disabled>Form</option>
                      <option>Tablet</option>
                      <option>Capsule</option>
                      <option>Syrup</option>
                      <option>Injection</option>
                      <option>Cream</option>
                      <option>Inhaler</option>
                      <option>Drops</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label className="form-label">Quantity</label>
                    <input className="form-input" type="number" placeholder="1" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Unit</label>
                    <select className="form-select" defaultValue="">
                      <option value="" disabled>Unit</option>
                      <option>Strips</option>
                      <option>Packs</option>
                      <option>Bottles</option>
                      <option>Vials</option>
                      <option>Sachets</option>
                      <option>Pieces</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label className="form-label">Notes (optional)</label>
                    <textarea className="form-notes" placeholder="Brand, active ingredient, any other details..."></textarea>
                  </div>
                </div>
                <label className="upload-img-btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        // Since the user is uploading before clicking "Add to request", 
                        // we can auto-submit it into the list as a new Image Upload request
                        const tempUrl = URL.createObjectURL(file);
                        const newItemId = 'item_' + Date.now();
                        setRequestList(prev => [...prev, {
                          id: newItemId,
                          name: newMedName || searchQuery || 'Scanned Medicine',
                          strength: '',
                          form: 'Tablet',
                          quantity: 1,
                          unit: 'Packs',
                          image: tempUrl,
                          imageFile: file
                        }]);
                        setExpandedTiles(prev => ({ ...prev, [newItemId]: true }));
                        hideAddForm();
                      }
                    }}
                  />
                  <div className="upload-img-icon"><div className="upload-img-icon-inner"></div></div>
                  Upload medicine image
                </label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button className="done-btn" onClick={hideAddForm} style={{ marginTop: 0, flex: 1, background: '#f5f5f5', color: '#888' }}>Cancel</button>
                  <button className="done-btn" onClick={handleAddToRequest} style={{ marginTop: 0, flex: 2 }}>Add to request</button>
                </div>
              </div>

              {!isAddFormActive && requestList.length > 0 && (
                <div className={`add-new-search reveal v-mount ${requestList.length > 0 ? 'visible' : ''}`} onClick={showAddForm} id="addBtn">
                  <div className="add-new-ring">+</div>
                  <div className="add-new-text">Add another medicine to this request</div>
                </div>
              )}
            </div>

            {requestList.length > 0 && (
              <>
                {/* PERSISTENT GENERAL NOTES - MOVED TO BOTTOM */}
                <div className="notes-section reveal d1 visible" style={{ marginBottom: '24px', padding: '0 24px', marginTop: '24px' }}>
                  <div className="sec-label" style={{ marginBottom: '8px', fontSize: '10px', color: 'var(--light-gray)', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 500 }}>Your Prescription / General Notes</div>
                  <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '20px', padding: '16px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    <textarea 
                      className="notes-field" 
                      placeholder="Add manual notes or attach a prescription for the pharmacist..."
                      value={generalNotes}
                      onChange={(e) => setGeneralNotes(e.target.value)}
                      style={{ background: 'transparent', border: 'none', padding: 0, height: '70px', width: '100%', outline: 'none', fontSize: '13px', color: 'var(--black)', fontFamily: "'DM Sans', sans-serif", resize: 'none', marginBottom: prescriptionImage ? '16px' : '0' }}
                    ></textarea>
                    
                    {prescriptionImage && (
                      <div style={{ position: 'relative', width: 'fit-content', marginBottom: '16px' }}>
                        <img src={prescriptionImage} alt="Prescription" style={{ width: '100px', height: '100px', borderRadius: '14px', objectFit: 'cover', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                        <button 
                          onClick={() => { setPrescriptionImage(null); setPrescriptionImageFile(null); }}
                          style={{ position: 'absolute', top: -10, right: -10, width: 24, height: 24, borderRadius: '50%', background: '#ff4d4d', color: '#fff', border: '2px solid #fff', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                        >×</button>
                      </div>
                    )}

                    <label className="upload-img-btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0 }}>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            setPrescriptionImageFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => setPrescriptionImage(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <div className="upload-img-icon" style={{ width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: prescriptionImage ? 'var(--green-pale)' : 'rgba(0,0,0,0.03)' }}>
                         <div className="upload-img-icon-inner" style={{ width: '12px', height: '12px', border: prescriptionImage ? '2px solid var(--green)' : '2px solid #ccc', borderRadius: '3px' }}></div>
                      </div>
                      <span style={{ color: prescriptionImage ? 'var(--green)' : '#888', fontWeight: 600, fontSize: '12px' }}>
                        {prescriptionImage ? 'Prescription attached (Tap to change)' : 'Attach prescription image'}
                      </span>
                    </label>
                  </div>
                </div>

                <div className={`send-section reveal d1 ${requestList.length > 0 ? 'visible' : ''}`}>
                  <button className="send-btn" onClick={handleSendRequest}>
                    <div className="send-arrow">→</div>
                    Send request to nearby pharmacists
                  </button>
                  <div className="send-hint">Pharmacists within <span>5km</span> will be notified instantly</div>
                </div>
              </>
            )}

            {/* REQUEST HISTORY - ABSOLUTE BOTTOM */}
            <div className="history-section reveal visible" style={{ marginTop: '40px', paddingBottom: '30px', padding: '0 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--light-gray)', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 500 }}>Your request history</div>
                {isLoadingHistory && <div style={{ width: 12, height: 12, border: '1.5px solid rgba(15,110,86,0.2)', borderTop: '1.5px solid var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>}
              </div>

              {pastRequests.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pastRequests.slice(0, visibleHistoryCount).map((req, idx) => (
                    <div key={req._id} className="history-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div className="history-meds" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '75%' }}>
                          {req.items.slice(0, 3).map((it: any, i: number) => (
                            <span key={i} style={{ fontSize: '10px', background: 'var(--green-pale)', color: 'var(--green)', padding: '2px 8px', borderRadius: '100px', fontWeight: 600 }}>{it.name}</span>
                          ))}
                          {req.items.length > 3 && <span style={{ fontSize: '10px', color: '#bbb', alignSelf: 'center' }}>+{req.items.length - 3} more</span>}
                        </div>
                        <div style={{ fontSize: '9px', color: '#bbb', textAlign: 'right' }}>
                          {new Date(req.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          <div style={{ color: req.status === 'quoted' ? 'var(--green)' : '#bbb', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>{req.status}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleRefill(req)}
                          style={{ flex: 1.2, background: 'var(--black)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Sora', sans-serif" }}
                        >
                          Refill
                        </button>
                        <button
                          onClick={() => handleSeeQuotes(req._id)}
                          style={{ flex: 1, background: 'transparent', color: 'var(--black)', border: '1px solid #eee', borderRadius: '10px', padding: '10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Sora', sans-serif" }}
                        >
                          See quotes
                        </button>
                      </div>
                    </div>
                  ))}
                  {pastRequests.length > visibleHistoryCount && (
                    <button
                      onClick={() => setVisibleHistoryCount(prev => prev + 3)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--green)', fontSize: '11px', fontWeight: 700, padding: '10px', cursor: 'pointer', textAlign: 'center', width: '100%', fontFamily: "'Sora', sans-serif" }}
                    >
                      Show more history
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.6)', borderRadius: '16px', border: '1.5px dashed #ebebeb' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #ddd' }}></div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#111', marginBottom: '4px', fontFamily: "'Sora', sans-serif" }}>No recent requests</div>
                  <div style={{ fontSize: '11px', color: '#bbb', lineHeight: 1.5 }}>Search or scan above to begin.</div>
                </div>
              )}
            </div>
          </div>

          {/* OVERLAYS */}
          {modalState !== 'none' && (
            <div className="modal-overlay" onClick={(e) => {
              if (e.target === e.currentTarget) setModalState('none');
            }}>
              <style>{`
            #whatsapp-live-support-btn { display: none !important; }
          `}</style>
              {modalState === 'login' && (
                <div className="login-modal">
                  <div className="modal-handle"></div>
                  <div className="modal-title">Sign in to<br /><em>continue.</em></div>
                  <div className="modal-sub">Create an account or sign in to send your request and track responses.</div>

                  <div className="benefits">
                    <div className="benefit-item">
                      <div className="benefit-dot"><div className="benefit-dot-inner"></div></div>
                      <div className="benefit-text"><strong>Get notified</strong> instantly when a pharmacist responds to your request</div>
                    </div>
                    <div className="benefit-item">
                      <div className="benefit-dot"><div className="benefit-dot-inner"></div></div>
                      <div className="benefit-text"><strong>Track your order</strong> from request to delivery in real time</div>
                    </div>
                    <div className="benefit-item">
                      <div className="benefit-dot"><div className="benefit-dot-inner"></div></div>
                      <div className="benefit-text"><strong>Save your medicines</strong> for quick reorder anytime</div>
                    </div>
                  </div>

                  <div>
                    <button className="modal-btn-primary" onClick={() => window.location.href = '/auth?mode=login'}>Sign in</button>
                    <button className="modal-btn-green" onClick={() => window.location.href = '/auth'}>Create account</button>
                    <div className="modal-divider">
                      <div className="modal-divider-line"></div>
                      <div className="modal-divider-text">or</div>
                      <div className="modal-divider-line"></div>
                    </div>
                    <button className="modal-btn-outline" onClick={() => setModalState('confirm')}>Continue as guest</button>
                  </div>

                  <div className="modal-note">Guests can search but <span>won't receive notifications</span> or track orders</div>
                </div>
              )}

              {modalState === 'confirm' && (
                <div className="confirm-modal">
                  <div className="modal-handle"></div>
                  <div className="modal-title" style={{ fontSize: '20px', marginBottom: '4px' }}>Confirm your<br /><em>search.</em></div>
                  <div className="modal-sub" style={{ marginBottom: '16px' }}>Check your request and confirm your details before we notify nearby pharmacists.</div>

                  <div className="confirm-request-summary">
                    <div className="confirm-summary-label">Your request</div>
                    {requestList.map(item => (
                      <div className="confirm-med" key={item.id}>
                        <div className="confirm-med-dot"></div>
                        <div className="confirm-med-name">{item.name}</div>
                        <div className="confirm-med-meta">{item.quantity} {item.unit} {item.form ? `· ${item.form}` : ''}</div>
                      </div>
                    ))}
                  </div>

                  <div className="confirm-field">
                    <label className="confirm-label">Confirm your phone number</label>
                    <div className="phone-wrap">
                      <div className="phone-prefix">🇳🇬 <span>+234</span></div>
                      <input className="confirm-input" type="tel" placeholder="800 000 0000" defaultValue={user?.phoneNumber || ''} />
                    </div>
                  </div>

                  <div className="confirm-field">
                    <label className="confirm-label">Your state</label>
                    <select className="confirm-select" defaultValue={user?.state || ""}>
                      <option value="" disabled>Select State</option>
                      {nigerianStates.map(st => (
                        <option key={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div className="search-scope-note">
                    <div className="scope-bar"></div>
                    <div className="scope-text">The search will start <strong>state-wide</strong> before expanding nationwide if no responses come in.</div>
                  </div>

                  <div>
                    <button
                      className="modal-btn-green"
                      disabled={isSubmitting}
                      style={{ 
                        opacity: isSubmitting ? 0.7 : 1, 
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px'
                      }}
                      onClick={async () => {
                        setIsSubmitting(true);
                        try {
                          const response = await fetch('/api/requests', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              requestType: 'drug-list',
                              items: requestList.map(item => ({
                                name: item.name,
                                quantity: item.quantity,
                                unit: item.unit,
                                strength: item.strength,
                                form: item.form,
                                notes: item.notes,
                                image: item.image
                              })),
                              notes: generalNotes,
                              prescriptionImage: prescriptionImage,
                              // Add patient coordinates for distance sorting
                              coordinates: await new Promise((resolve) => {
                                if ("geolocation" in navigator) {
                                  navigator.geolocation.getCurrentPosition(
                                    (pos) => resolve({
                                      type: 'Point',
                                      coordinates: [pos.coords.longitude, pos.coords.latitude]
                                    }),
                                    () => resolve(undefined),
                                    { enableHighAccuracy: true, timeout: 5000 }
                                  );
                                } else {
                                  resolve(undefined);
                                }
                              }),
                              // Optional: phoneNumber and state from the modal
                              phoneNumber: (document.querySelector('.confirm-input') as HTMLInputElement)?.value || user?.phoneNumber,
                              state: (document.querySelector('.confirm-select') as HTMLSelectElement)?.value || user?.state
                            })
                          });

                          if (response.ok) {
                            const newRequest = await response.json();
                            const realId = newRequest._id;

                            // Trigger Notification to Pharmacists
                            try {
                              await fetch('/api/notify-pharmacists', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  requestId: realId,
                                  drugNames: requestList.map(item => item.name)
                                })
                              });
                            } catch (notifyErr) {
                              console.error('Failed to trigger notification:', notifyErr);
                            }

                            setModalState('none');
                            setIsSearching(true);
                            setRequestId(realId);
                            setSelectedRequestId(realId);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          } else {
                            console.error('Failed to create request');
                            // Fallback to mock behavior if API fails, though not ideal
                            setModalState('none');
                            setIsSearching(true);
                          }
                        } catch (err) {
                          console.error('Error creating request:', err);
                          setModalState('none');
                          setIsSearching(true);
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                          Searching...
                        </>
                      ) : (
                        'Start search'
                      )}
                    </button>
                    <button className="modal-btn-outline" style={{ marginTop: '8px' }} onClick={() => setModalState('none')}>Edit request</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
      <RxScanModal 
        open={isScanModalOpen} 
        onClose={() => setIsScanModalOpen(false)} 
        onScanResult={handleScanResult}
        mode={scanMode}
      />
    </div>
  );
};

export default DispatchForm;
