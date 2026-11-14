import React, { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Plus, Search, Share2, ShieldAlert, X } from 'lucide-react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { formatNaira } from '../lib/matchingEngine';
import {
  BusinessConnection,
  BusinessListing,
  BusinessProfile,
  INDUSTRIES,
  NIGERIAN_STATES,
} from '../types/girma';

interface DirectoryPageProps {
  navigate: (path: string) => void;
  isAuthenticated: boolean;
}

export const BusinessDirectoryPage: React.FC<DirectoryPageProps> = ({
  navigate,
  isAuthenticated,
}) => {
  const { firebaseUser, account } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [industry, setIndustry] = useState('All');
  const [stateFilter, setStateFilter] = useState('All');
  const [selectedBiz, setSelectedBiz] = useState<BusinessProfile | null>(null);
  const [enquiryMsg, setEnquiryMsg] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'business_profiles'),
            where('verificationStatus', 'in', ['verified', 'unverified', 'pending'])
          )
        );
        if (active) {
          setBusinesses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BusinessProfile)));
        }
      } catch (err) {
        console.error('Error loading business directory:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return businesses.filter((b) => {
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        const hay = `${b.businessName} ${b.description} ${b.industry} ${(b.products || []).join(' ')} ${(b.services || []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (industry !== 'All' && b.industry !== industry) return false;
      if (stateFilter !== 'All' && b.state !== stateFilter) return false;
      return true;
    });
  }, [businesses, searchText, industry, stateFilter]);

  const sendBusinessEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !selectedBiz) {
      navigate('/login');
      return;
    }
    if (enquiryMsg.trim().length < 5) return;
    try {
      await addDoc(collection(db, 'business_connections'), {
        senderId: firebaseUser.uid,
        senderName: account?.fullName || firebaseUser.displayName || 'GIRMA Member',
        recipientOwnerId: selectedBiz.ownerId,
        businessId: selectedBiz.id,
        listingTitle: `Direct Enquiry to ${selectedBiz.businessName}`,
        enquiryType: 'Business Contact',
        message: enquiryMsg.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setEnquiryMsg('');
      setNotice(`Enquiry sent to ${selectedBiz.businessName}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'business_connections');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#17231F]">Business Directory</h2>
          <p className="text-sm text-[#77817C] mt-1">
            Discover enterprises across Nigeria and Africa. Verification badges are granted only after administrative review.
          </p>
        </div>
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => navigate('/app/business')}
            className="px-4 py-2.5 rounded-lg bg-[#123C32] text-white text-xs font-semibold whitespace-nowrap"
          >
            Manage My Business Profile
          </button>
        )}
      </div>

      {notice && (
        <div className="bg-[#123C32] text-white px-4 py-3 rounded-lg text-xs flex justify-between">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="underline">Dismiss</button>
        </div>
      )}

      <div className="bg-white border border-[#17231F]/10 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#77817C] absolute left-3 top-3" />
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search businesses, products, services..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#17231F]/15 text-sm"
          />
        </div>
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm bg-white"
        >
          <option value="All">All Industries</option>
          {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm bg-white"
        >
          <option value="All">All Nigerian States</option>
          {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 rounded-xl bg-white border border-[#17231F]/10 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#17231F]/10 rounded-xl p-8 text-center text-sm text-[#77817C]">
          No businesses match your current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((biz) => (
            <div key={biz.id} className="bg-white border border-[#17231F]/10 rounded-xl p-6 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-[#77817C]">{biz.industry} · {biz.state}</span>
                  {biz.verificationStatus === 'verified' ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-[#238653]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified Business</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[#77817C]">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Unverified Profile</span>
                    </span>
                  )}
                </div>
                <h3 className="font-display text-lg font-bold text-[#17231F]">{biz.businessName}</h3>
                <p className="text-sm text-[#77817C] line-clamp-2">{biz.description}</p>
              </div>
              <div className="pt-3 border-t border-[#17231F]/10 flex items-center justify-between text-xs">
                <span className="text-[#77817C]">{biz.registrationStatus} · {biz.stage}</span>
                <button
                  type="button"
                  onClick={() => setSelectedBiz(biz)}
                  className="px-4 py-2 rounded-lg bg-[#123C32] text-white font-semibold"
                >
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedBiz && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
          <div className="w-full max-w-xl bg-white h-full overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-[#17231F]/10 pb-4">
              <div>
                <div className="text-xs font-semibold text-[#1F7A59]">
                  {selectedBiz.verificationStatus === 'verified' ? 'Verified Business' : 'Unverified Profile'} · {selectedBiz.industry}
                </div>
                <h3 className="font-display text-2xl font-bold text-[#17231F] mt-1">{selectedBiz.businessName}</h3>
                <p className="text-xs text-[#77817C]">{selectedBiz.city ? `${selectedBiz.city}, ` : ''}{selectedBiz.state}, {selectedBiz.country}</p>
              </div>
              <button type="button" onClick={() => setSelectedBiz(null)} className="p-2 rounded-lg hover:bg-[#F8F7F1]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-[#77817C] leading-relaxed">{selectedBiz.description}</p>

            <div className="grid grid-cols-2 gap-4 bg-[#F8F7F1] rounded-xl p-4 text-xs">
              <div>
                <span className="text-[#77817C] block">Registration</span>
                <span className="font-semibold text-[#17231F]">{selectedBiz.registrationStatus}</span>
              </div>
              <div>
                <span className="text-[#77817C] block">Stage</span>
                <span className="font-semibold text-[#17231F]">{selectedBiz.stage}</span>
              </div>
              {selectedBiz.products && selectedBiz.products.length > 0 && (
                <div className="col-span-2">
                  <span className="text-[#77817C] block">Products &amp; Services</span>
                  <span className="font-medium text-[#17231F]">
                    {[...(selectedBiz.products || []), ...(selectedBiz.services || [])].join(' · ')}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  setNotice('Business profile link copied.');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#17231F]/15 text-xs font-semibold"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Profile</span>
              </button>
            </div>

            <form onSubmit={sendBusinessEnquiry} className="pt-4 border-t border-[#17231F]/10 space-y-3">
              <h4 className="font-display text-base font-bold text-[#17231F]">Contact Business</h4>
              <textarea
                rows={3}
                required
                value={enquiryMsg}
                onChange={(e) => setEnquiryMsg(e.target.value)}
                placeholder="Introduce yourself and describe your partnership, supplier, or purchase enquiry..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-[#123C32] text-white text-xs font-semibold"
              >
                {isAuthenticated ? 'Send Business Enquiry' : 'Sign In to Contact Business'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const MarketsPage: React.FC<{ navigate: (path: string) => void }> = () => {
  const { firebaseUser, account, businessProfile } = useAuth();
  const [listings, setListings] = useState<BusinessListing[]>([]);
  const [connections, setConnections] = useState<BusinessConnection[]>([]);
  const [tab, setTab] = useState<'browse' | 'enquiries' | 'publish'>('browse');
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [stateFilter, setStateFilter] = useState('All');

  // Publish form
  const [title, setTitle] = useState('');
  const [listingType, setListingType] = useState<'product' | 'service' | 'partnership' | 'supplier'>('product');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState<string>(businessProfile?.industry || INDUSTRIES[0]);
  const [state, setState] = useState<string>(businessProfile?.state || account?.state || 'Adamawa');
  const [priceNgn, setPriceNgn] = useState('');
  const [priceUnit, setPriceUnit] = useState('per unit');
  const [contactMethod, setContactMethod] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const [enquiryTarget, setEnquiryTarget] = useState<BusinessListing | null>(null);
  const [enquiryText, setEnquiryText] = useState('');

  useEffect(() => {
    let active = true;
    async function loadMarkets() {
      try {
        const listSnap = await getDocs(
          query(collection(db, 'business_listings'), where('status', '==', 'active'))
        );
        if (!active) return;
        setListings(listSnap.docs.map((d) => ({ id: d.id, ...d.data() } as BusinessListing)));

        if (firebaseUser && firebaseUser.emailVerified) {
          const [sentSnap, recvSnap] = await Promise.all([
            getDocs(query(collection(db, 'business_connections'), where('senderId', '==', firebaseUser.uid))),
            getDocs(query(collection(db, 'business_connections'), where('recipientOwnerId', '==', firebaseUser.uid))),
          ]);
          if (active) {
            const merged = new Map<string, BusinessConnection>();
            for (const d of [...sentSnap.docs, ...recvSnap.docs]) {
              merged.set(d.id, { id: d.id, ...d.data() } as BusinessConnection);
            }
            setConnections(Array.from(merged.values()));
          }
        }
      } catch (err) {
        console.error('Error loading markets:', err);
      }
    }
    loadMarkets();
    return () => {
      active = false;
    };
  }, [firebaseUser]);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        const hay = `${l.title} ${l.businessName} ${l.description} ${l.industry}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (typeFilter !== 'All' && l.listingType !== typeFilter) return false;
      if (stateFilter !== 'All' && l.state !== stateFilter) return false;
      return true;
    });
  }, [listings, searchText, typeFilter, stateFilter]);

  const publishListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    try {
      const payload = {
        ownerId: firebaseUser.uid,
        businessId: businessProfile?.id || '',
        businessName: businessProfile?.businessName || account?.fullName || 'GIRMA Seller',
        title: title.trim(),
        listingType,
        description: description.trim(),
        industry,
        country: account?.country || 'Nigeria',
        state,
        priceNgn: priceNgn ? Number(priceNgn) : 0,
        priceUnit: priceUnit.trim(),
        contactMethod: contactMethod.trim() || 'GIRMA Markets Enquiry',
        status: 'active' as const,
      };
      const ref = await addDoc(collection(db, 'business_listings'), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setListings((prev) => [{ id: ref.id, ...payload }, ...prev]);
      setTitle('');
      setDescription('');
      setPriceNgn('');
      setTab('browse');
      setNotice('Market listing published.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'business_listings');
    }
  };

  const sendListingEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !enquiryTarget) return;
    try {
      const payload = {
        senderId: firebaseUser.uid,
        senderName: account?.fullName || 'GIRMA Buyer',
        recipientOwnerId: enquiryTarget.ownerId,
        businessId: enquiryTarget.businessId || '',
        listingId: enquiryTarget.id || '',
        listingTitle: enquiryTarget.title,
        enquiryType: enquiryTarget.listingType,
        message: enquiryText.trim(),
        status: 'pending' as const,
      };
      const ref = await addDoc(collection(db, 'business_connections'), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setConnections((prev) => [{ id: ref.id, ...payload }, ...prev]);
      setEnquiryTarget(null);
      setEnquiryText('');
      setNotice('Enquiry sent to the business owner.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'business_connections');
    }
  };

  const respondConnection = async (connId: string, status: 'accepted' | 'declined') => {
    try {
      await updateDoc(doc(db, 'business_connections', connId), {
        status,
        updatedAt: serverTimestamp(),
      });
      setConnections((prev) =>
        prev.map((c) => (c.id === connId ? { ...c, status } : c))
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `business_connections/${connId}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#17231F]">Markets &amp; B2B Connections</h2>
          <p className="text-sm text-[#77817C] mt-1">
            Discover products, services, suppliers, and B2B partnership opportunities across Africa.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-white border border-[#17231F]/10 rounded-lg">
          <button
            type="button"
            onClick={() => setTab('browse')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              tab === 'browse' ? 'bg-[#123C32] text-white' : 'text-[#77817C]'
            }`}
          >
            Browse Listings
          </button>
          <button
            type="button"
            onClick={() => setTab('enquiries')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              tab === 'enquiries' ? 'bg-[#123C32] text-white' : 'text-[#77817C]'
            }`}
          >
            Enquiries ({connections.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('publish')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold ${
              tab === 'publish' ? 'bg-[#123C32] text-white' : 'text-[#77817C]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post Listing</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="bg-[#123C32] text-white px-4 py-3 rounded-lg text-xs flex justify-between">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="underline">Dismiss</button>
        </div>
      )}

      {tab === 'browse' && (
        <>
          <div className="bg-white border border-[#17231F]/10 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search products, services, suppliers..."
              className="px-3.5 py-2 rounded-lg border border-[#17231F]/15 text-sm"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm bg-white"
            >
              <option value="All">All Listing Types</option>
              <option value="product">Products</option>
              <option value="service">Services</option>
              <option value="supplier">Suppliers</option>
              <option value="partnership">Partnerships</option>
            </select>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm bg-white"
            >
              <option value="All">All Nigerian States</option>
              {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((item) => (
              <div key={item.id} className="bg-white border border-[#17231F]/10 rounded-xl p-6 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#77817C]">
                    <span className="capitalize font-semibold text-[#1F7A59]">{item.listingType}</span>
                    <span>{item.state} · {item.industry}</span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#17231F]">{item.title}</h3>
                  <p className="text-xs font-medium text-[#17231F] flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#77817C]" />
                    <span>{item.businessName}</span>
                  </p>
                  <p className="text-sm text-[#77817C]">{item.description}</p>
                </div>
                <div className="pt-3 border-t border-[#17231F]/10 flex items-center justify-between gap-4">
                  <span className="font-mono text-sm font-semibold tabular-nums text-[#123C32]">
                    {item.priceNgn ? `${formatNaira(item.priceNgn)} ${item.priceUnit || ''}` : 'Quote on enquiry'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEnquiryTarget(item)}
                    className="px-4 py-2 rounded-lg bg-[#123C32] text-white text-xs font-semibold whitespace-nowrap"
                  >
                    Send Enquiry
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full bg-white border border-[#17231F]/10 rounded-xl p-8 text-center text-sm text-[#77817C]">
                No market listings match your filter. Post the first listing in your sector.
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'enquiries' && (
        <div className="bg-white border border-[#17231F]/10 rounded-xl divide-y divide-[#17231F]/10">
          {connections.length === 0 ? (
            <p className="p-8 text-sm text-[#77817C] text-center">No market enquiries sent or received yet.</p>
          ) : (
            connections.map((c) => (
              <div key={c.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-[#77817C]">
                    {c.listingTitle || 'Business Enquiry'} · From {c.senderName} · Status: <strong className="text-[#17231F] capitalize">{c.status}</strong>
                  </div>
                  <p className="text-sm text-[#17231F]">{c.message}</p>
                </div>
                {c.recipientOwnerId === firebaseUser?.uid && c.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => c.id && respondConnection(c.id, 'accepted')}
                      className="px-3 py-1.5 rounded-lg bg-[#238653] text-white text-xs font-semibold"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => c.id && respondConnection(c.id, 'declined')}
                      className="px-3 py-1.5 rounded-lg border border-[#D94C4C]/30 text-[#D94C4C] text-xs font-semibold"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'publish' && (
        <form onSubmit={publishListing} className="bg-white border border-[#17231F]/10 rounded-xl p-6 space-y-4 max-w-2xl">
          <h3 className="font-display text-lg font-bold text-[#17231F]">Publish Product, Service, or Supplier Listing</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Listing Title</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Grade A Dried Hibiscus (25kg)"
                className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Listing Type</label>
              <select
                value={listingType}
                onChange={(e) => setListingType(e.target.value as typeof listingType)}
                className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm bg-white"
              >
                <option value="product">Product</option>
                <option value="service">Service</option>
                <option value="supplier">Supplier</option>
                <option value="partnership">B2B Partnership</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Industry</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm bg-white"
              >
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm bg-white"
              >
                {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Price (₦, optional)</label>
              <input
                type="number"
                min={0}
                value={priceNgn}
                onChange={(e) => setPriceNgn(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Unit / Terms</label>
              <input
                value={priceUnit}
                onChange={(e) => setPriceUnit(e.target.value)}
                placeholder="per bag / per project"
                className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Description</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Preferred Contact Method</label>
            <input
              value={contactMethod}
              onChange={(e) => setContactMethod(e.target.value)}
              placeholder="GIRMA Enquiry / Phone / Business Email"
              className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-lg bg-[#123C32] text-white text-sm font-semibold"
          >
            Publish Listing
          </button>
        </form>
      )}

      {enquiryTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={sendListingEnquiry}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-display text-lg font-bold">Enquire: {enquiryTarget.title}</h3>
              <button type="button" onClick={() => setEnquiryTarget(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              required
              rows={4}
              value={enquiryText}
              onChange={(e) => setEnquiryText(e.target.value)}
              placeholder="Quantity needed, delivery location, or partnership question..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-[#123C32] text-white text-sm font-semibold"
            >
              Send Enquiry
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
