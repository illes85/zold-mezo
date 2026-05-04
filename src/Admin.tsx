import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db, auth, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { collection, updateDoc, doc, query, orderBy, onSnapshot, serverTimestamp, getDoc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Settings, Save, LogOut, LayoutDashboard, List, FileText, Check, X, AlertCircle, Calculator, Plus, Trash2, UploadCloud, ChevronUp, ChevronDown, Axe, Car, HardHat, Droplets, Scissors, MapPin, Mail, Phone, Calendar, Tractor, BarChart3, CheckCircle2 } from 'lucide-react';
import { CalculatorSettings, defaultCalculatorSettings, SectionBlock, CustomBlock, QuoteRequest, QuoteImage } from './types';
import { v4 as uuidv4 } from 'uuid';
import ImageCropperModal from './components/ImageCropperModal';

const StatCard = ({ title, value, icon, color = "emerald" }: { title: string, value: string | number, icon: React.ReactNode, color?: string }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600`}>
        {icon}
      </div>
    </div>
    <p className="text-sm font-medium text-stone-500 mb-1">{title}</p>
    <h4 className="text-2xl font-bold text-stone-900">{value}</h4>
  </div>
);

const StatisticsDashboard = ({ quotes, analytics, dailyStats, hasPermission = true }: { quotes: QuoteRequest[], analytics: any[], dailyStats: any[], hasPermission?: boolean }) => {
  // Calculated metrics
  const totalQuotes = quotes.length;
  const completedQuotes = quotes.filter(q => q.status === 'completed').length;
  const acceptedQuotes = quotes.filter(q => q.status === 'accepted').length;
  const totalRevenue = quotes
    .filter(q => q.status === 'completed' || q.status === 'accepted')
    .reduce((sum, q) => sum + (q.calculatedPrice || 0), 0);
  
  const conversionRate = totalQuotes > 0 ? ((completedQuotes + acceptedQuotes) / totalQuotes * 100).toFixed(1) : 0;

  const totalPageViews = dailyStats.reduce((sum, s) => sum + (s.page_views || 0), 0);
  const totalInteractions = dailyStats.reduce((sum, s) => sum + (s.calculator_interactions || 0), 0);

  // Status breakdown
  const statusCounts = {
    pending: quotes.filter(q => q.status === 'pending').length,
    accepted: acceptedQuotes,
    completed: completedQuotes,
    rejected: quotes.filter(q => q.status === 'rejected').length,
  };

  // Service breakdown
  const serviceCounts: Record<string, number> = {};
  quotes.forEach(q => {
    const s = q.serviceType || 'Ismeretlen';
    serviceCounts[s] = (serviceCounts[s] || 0) + 1;
  });

  // Top settlements
  const settlements: Record<string, number> = {};
  quotes.forEach(q => {
    if (q.details?.settlement) {
      settlements[q.details.settlement] = (settlements[q.details.settlement] || 0) + 1;
    }
  });
  const topSettlements = Object.entries(settlements)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Statisztika és Elemzés</h1>
          <p className="text-stone-600">Az oldal forgalmának és az ajánlatkéréseknek a nyomon követése.</p>
        </div>
        {!hasPermission && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 max-w-md">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <p className="font-bold mb-1">Hiányzó jogosultságok</p>
              <p>A látogatottsági adatok megjelenítéséhez frissítened kell a Firestore Security Rules-t a Firebase Console-ban.</p>
            </div>
          </div>
        )}
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Összes Ajánlatkérés" value={totalQuotes} icon={<FileText className="w-6 h-6" />} color="blue" />
        <StatCard title="Várható Bevétel" value={`${totalRevenue.toLocaleString()} Ft`} icon={<Car className="w-6 h-6" />} color="emerald" />
        <StatCard title="Konverziós Arány" value={`${conversionRate}%`} icon={<BarChart3 className="w-6 h-6" />} color="amber" />
        <StatCard title="Összes Oldalmegtekintés" value={totalPageViews} icon={<LayoutDashboard className="w-6 h-6" />} color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h3 className="text-lg font-bold text-stone-800 mb-6 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Ajánlatok állapota
          </h3>
          <div className="space-y-4">
            {Object.entries(statusCounts).map(([status, count]) => {
              const labels: any = { pending: 'Új', accepted: 'Elfogadva', completed: 'Kész', rejected: 'Elutasítva' };
              const colors: any = { pending: 'bg-blue-500', accepted: 'bg-amber-500', completed: 'bg-emerald-500', rejected: 'bg-red-500' };
              const percent = totalQuotes > 0 ? (count / totalQuotes * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-stone-700">{labels[status]}</span>
                    <span className="text-stone-500">{count} db ({percent.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className={`h-full ${colors[status]}`} style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Services */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h3 className="text-lg font-bold text-stone-800 mb-6 flex items-center gap-2">
            <List className="w-5 h-5 text-emerald-600" /> Népszerű szolgáltatások
          </h3>
          <div className="space-y-4">
            {Object.entries(serviceCounts).sort((a,b) => b[1] - a[1]).map(([service, count]) => {
              const percent = totalQuotes > 0 ? (count / totalQuotes * 100) : 0;
              return (
                <div key={service}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-stone-700">{service}</span>
                    <span className="text-stone-500">{count} db</span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Geographical Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h3 className="text-lg font-bold text-stone-800 mb-6 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" /> Top 5 Település
          </h3>
          <div className="space-y-4">
            {topSettlements.map(([city, count]) => {
              const percent = totalQuotes > 0 ? (count / totalQuotes * 100) : 0;
              return (
                <div key={city}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-stone-700">{city}</span>
                    <span className="text-stone-500">{count} db</span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
            {topSettlements.length === 0 && <p className="text-stone-400 italic text-sm">Még nincs település adat.</p>}
          </div>
        </div>

        {/* Funnel / User Behavior */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h3 className="text-lg font-bold text-stone-800 mb-6 flex items-center gap-2">
            <Tractor className="w-5 h-5 text-emerald-600" /> Felhasználói útvonal
          </h3>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-bold">1</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-stone-800">Látogatás</p>
                <p className="text-xs text-stone-500">{totalPageViews} megtekintés</p>
              </div>
            </div>
            <div className="w-px h-8 bg-stone-200 ml-6"></div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-bold">2</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-stone-800">Kalkulátor használat</p>
                <p className="text-xs text-stone-500">{totalInteractions} interakció ({totalPageViews > 0 ? (totalInteractions / totalPageViews * 100).toFixed(1) : 0}%)</p>
              </div>
            </div>
            <div className="w-px h-8 bg-stone-200 ml-6"></div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">3</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-800">Ajánlatkérés</p>
                <p className="text-xs text-emerald-600">{totalQuotes} sikeres beküldés ({totalPageViews > 0 ? (totalQuotes / totalPageViews * 100).toFixed(1) : 0}%)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity (Events) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
        <h3 className="text-lg font-bold text-stone-800 mb-6 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600" /> Legutóbbi tevékenységek
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-500 font-medium border-b border-stone-200">
              <tr>
                <th className="px-4 py-3">Időpont</th>
                <th className="px-4 py-3">Esemény</th>
                <th className="px-4 py-3">Részletek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {analytics.slice(0, 10).map((event) => (
                <tr key={event.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-stone-500">
                    {event.timestamp?.toDate().toLocaleString('hu-HU')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      event.type === 'form_submit' ? 'bg-emerald-100 text-emerald-700' : 
                      event.type === 'calculator_result' ? 'bg-blue-100 text-blue-700' :
                      'bg-stone-100 text-stone-600'
                    }`}>
                      {event.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-600 truncate max-w-xs">
                    {JSON.stringify(event.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('settings');

  // Data states
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [calculatorSettings, setCalculatorSettings] = useState<CalculatorSettings>(defaultCalculatorSettings);
  const [services, setServices] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [hasStatsPermission, setHasStatsPermission] = useState(true);
  const pendingCount = quotes.filter(q => q.status === 'pending').length;

  // UI states
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Image Cropper states
  const [modalOpen, setModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [activeServiceId, setActiveServiceId] = useState<string | null>(null);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<'image' | 'icon'>('image');

  useEffect(() => {
    if (isAdmin && services.length > 0) {
      const locsolas = services.find(s => (s.title || '').toLowerCase().includes('locsol'));
      if (locsolas && (!locsolas.image || locsolas.image.includes('picsum'))) {
        const docRef = doc(db, 'services', locsolas.id);
        updateDoc(docRef, { image: '/locsolas.jpg' }).catch(err => console.error("Update error", err));
      }
    }
  }, [isAdmin, services]);

  useEffect(() => {
    if (isAdmin) {
      // Listen to site settings
      const settingsUnsubscribe = onSnapshot(doc(db, 'settings', 'site'), (docSnap) => {
        if (docSnap.exists()) {
          setSiteSettings(docSnap.data());
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/site');
      });

      // Listen to calculator settings
      const calcUnsubscribe = onSnapshot(doc(db, 'settings', 'calculator'), (docSnap) => {
        if (docSnap.exists()) {
          setCalculatorSettings({ ...defaultCalculatorSettings, ...docSnap.data() });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/calculator');
      });

      // Listen to services
      const q = query(collection(db, 'services'), orderBy('order'));
      const servicesUnsubscribe = onSnapshot(q, (querySnapshot) => {
        const servicesData: any[] = [];
        querySnapshot.forEach((doc) => {
          servicesData.push({ id: doc.id, ...doc.data() });
        });
        setServices(servicesData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'services');
      });

      // Listen to quotes
      const quotesQ = query(collection(db, 'quotes'), orderBy('createdAt', 'desc'));
      const quotesUnsubscribe = onSnapshot(quotesQ, (querySnapshot) => {
        const quotesData: QuoteRequest[] = [];
        querySnapshot.forEach((doc) => {
          quotesData.push({ ...doc.data() as QuoteRequest, id: doc.id });
        });
        setQuotes(quotesData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'quotes');
      });

      // Listen to analytics (limit to last 500 for performance)
      const analyticsQ = query(collection(db, 'analytics'), orderBy('timestamp', 'desc'));
      const analyticsUnsubscribe = onSnapshot(analyticsQ, (querySnapshot) => {
        const analyticsData: any[] = [];
        querySnapshot.forEach((doc) => {
          analyticsData.push({ id: doc.id, ...doc.data() });
        });
        setAnalytics(analyticsData);
      }, (error) => {
        if (error.message?.includes('permission-denied') || error.message?.includes('Missing or insufficient permissions')) {
          setHasStatsPermission(false);
        }
        handleFirestoreError(error, OperationType.LIST, 'analytics');
      });

      // Listen to daily stats
      const statsQ = query(collection(db, 'stats'), orderBy('date', 'desc'));
      const statsUnsubscribe = onSnapshot(statsQ, (querySnapshot) => {
        const statsData: any[] = [];
        querySnapshot.forEach((doc) => {
          statsData.push({ id: doc.id, ...doc.data() });
        });
        setDailyStats(statsData);
      }, (error) => {
        if (error.message?.includes('permission-denied') || error.message?.includes('Missing or insufficient permissions')) {
          setHasStatsPermission(false);
        }
        handleFirestoreError(error, OperationType.LIST, 'stats');
      });

      return () => {
        settingsUnsubscribe();
        calcUnsubscribe();
        servicesUnsubscribe();
        quotesUnsubscribe();
        analyticsUnsubscribe();
        statsUnsubscribe();
      };
    }
  }, [isAdmin]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setSiteSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleServiceChange = (id: string, key: string, value: any) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, [key]: value } : s));
  };

  const handleCalculatorSettingChange = (key: keyof CalculatorSettings, value: any) => {
    setCalculatorSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleAddCost = (serviceId: string) => {
    setCalculatorSettings(prev => {
      const currentCosts = { ...(prev.serviceCosts || {}) };
      const serviceCosts = [...(currentCosts[serviceId] || [])];
      serviceCosts.push({ label: '', value: 0 });
      currentCosts[serviceId] = serviceCosts;
      return { ...prev, serviceCosts: currentCosts };
    });
  };

  const handleRemoveCost = (serviceId: string, index: number) => {
    setCalculatorSettings(prev => {
      const currentCosts = { ...(prev.serviceCosts || {}) };
      const serviceCosts = [...(currentCosts[serviceId] || [])];
      serviceCosts.splice(index, 1);
      currentCosts[serviceId] = serviceCosts;
      return { ...prev, serviceCosts: currentCosts };
    });
  };

  const handleCostChange = (serviceId: string, index: number, field: 'label' | 'value', value: any) => {
    setCalculatorSettings(prev => {
      const currentCosts = { ...(prev.serviceCosts || {}) };
      const serviceCosts = [...(currentCosts[serviceId] || [])];
      serviceCosts[index] = { ...serviceCosts[index], [field]: value };
      currentCosts[serviceId] = serviceCosts;
      return { ...prev, serviceCosts: currentCosts };
    });
  };

  const handleTierChange = (type: 'traktorPriceTiers' | 'tologatosPriceTiers', newTiers: any[]) => {
    setCalculatorSettings(prev => ({ ...prev, [type]: newTiers }));
  };

  const TierManager = ({ type, title }: { type: 'traktorPriceTiers' | 'tologatosPriceTiers', title: string }) => {
    const tiers = calculatorSettings[type] || [];
    const addTier = () => {
      const newTiers = [...tiers, { limit: 1000, price: 0 }];
      handleTierChange(type, newTiers);
    };
    const updateTier = (idx: number, field: 'limit' | 'price', value: number) => {
      const newTiers = [...tiers];
      newTiers[idx] = { ...newTiers[idx], [field]: value };
      handleTierChange(type, newTiers);
    };
    const removeTier = (idx: number) => {
      const newTiers = [...tiers];
      newTiers.splice(idx, 1);
      handleTierChange(type, newTiers);
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-stone-700">{title} (Ársávok)</label>
          <button onClick={addTier} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200 transition">
            + Új ársáv
          </button>
        </div>
        <div className="space-y-2">
          {tiers.map((tier: any, idx: number) => {
            const startLimit = idx === 0 ? 0 : tiers[idx - 1].limit + 1;
            return (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-stone-50 p-2 rounded border border-stone-200">
                  <span className="text-xs text-stone-500 whitespace-nowrap">{startLimit} -</span>
                  <input type="number" value={tier.limit} onChange={e => updateTier(idx, 'limit', Number(e.target.value))}
                    className="w-full text-sm bg-transparent outline-none" placeholder="-1 a végtelenhez" />
                  <span className="text-xs text-stone-500">m²</span>
                </div>
                <div className="flex-1 flex items-center gap-2 bg-stone-50 p-2 rounded border border-stone-200">
                  <span className="text-xs text-stone-500 whitespace-nowrap">Ár:</span>
                  <input type="number" value={tier.price} onChange={e => updateTier(idx, 'price', Number(e.target.value))}
                    className="w-full text-sm bg-transparent outline-none" />
                  <span className="text-xs text-stone-500">Ft/m²</span>
                </div>
                <button onClick={() => removeTier(idx)} className="p-2 text-stone-400 hover:text-red-500 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          {tiers.length === 0 && <p className="text-xs text-stone-500 italic">Nincsenek ársávok megadva.</p>}
        </div>
      </div>
    );
  };

  const CostItemsManager = ({ serviceId }: { serviceId: string }) => {
    const costs = calculatorSettings.serviceCosts?.[serviceId] || [];
    return (
      <div className="pt-4 border-t border-stone-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-stone-500 uppercase">Belső költségek (csak admin)</p>
          <button
            onClick={() => handleAddCost(serviceId)}
            className="text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-600 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Tétel hozzáadása
          </button>
        </div>
        <div className="space-y-2">
          {costs.map((cost, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Megnevezés"
                value={cost.label}
                onChange={(e) => handleCostChange(serviceId, idx, 'label', e.target.value)}
                className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-stone-200 outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                type="number"
                placeholder="Ft"
                value={cost.value || ''}
                onChange={(e) => handleCostChange(serviceId, idx, 'value', Number(e.target.value))}
                className="w-20 text-xs px-2 py-1.5 rounded-lg border border-stone-200 outline-none focus:ring-1 focus:ring-emerald-500 text-right"
              />
              <button
                onClick={() => handleRemoveCost(serviceId, idx)}
                className="text-stone-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {costs.length === 0 && (
            <p className="text-[10px] text-stone-400 italic">Nincsenek rögzített költségek.</p>
          )}
        </div>
      </div>
    );
  };

  const toggleProhibitedOption = (serviceId: string, optionId: string, isProhibited: boolean) => {
    setCalculatorSettings(prev => {
      const currentProhibited = { ...(prev.prohibitedOptions || {}) };
      const serviceOptions = [...(currentProhibited[serviceId] || [])];

      if (isProhibited) {
        if (!serviceOptions.includes(optionId)) serviceOptions.push(optionId);
      } else {
        const index = serviceOptions.indexOf(optionId);
        if (index > -1) serviceOptions.splice(index, 1);
      }

      currentProhibited[serviceId] = serviceOptions;
      return { ...prev, prohibitedOptions: currentProhibited };
    });
  };

  const handleAddService = () => {
    const newId = uuidv4();
    setServices(prev => [...prev, {
      id: newId,
      title: 'Új szolgáltatás',
      description: 'Írd le az új szolgáltatás részleteit...',
      iconName: 'Settings',
      image: '',
      isActive: false,
      order: prev.length + 1,
      isNew: true
    }]);
  };

  const handleRemoveService = async (id: string, isNew?: boolean) => {
    if (window.confirm('Biztosan törölni szeretnéd ezt a szolgáltatást? Ezt nem lehet visszavonni.')) {
      if (isNew) {
        setServices(prev => prev.filter(s => s.id !== id));
      } else {
        try {
          await deleteDoc(doc(db, 'services', id));
          // onSnapshot fogja frissíteni a listát
        } catch (error) {
          console.error("Hiba törléskor", error);
        }
      }
    }
  };

  const moveService = (index: number, direction: 'up' | 'down') => {
    setServices(prev => {
      const newServices = [...prev];
      if (direction === 'up' && index > 0) {
        const temp = newServices[index - 1];
        newServices[index - 1] = newServices[index];
        newServices[index] = temp;
      } else if (direction === 'down' && index < newServices.length - 1) {
        const temp = newServices[index + 1];
        newServices[index + 1] = newServices[index];
        newServices[index] = temp;
      }
      return newServices.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>, serviceId: string, type: 'image' | 'icon' = 'image') => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || null);
        setActiveServiceId(serviceId);
        setUploadType(type);
        setModalOpen(true);
      });
      reader.readAsDataURL(file);
      // Reset input
      e.target.value = '';
    }
  };

  const getCroppedImg = async (imageSrc: string, pixelCrop: any, type: 'image' | 'icon' = 'image'): Promise<Blob | null> => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise(resolve => image.onload = resolve);
    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(
      image,
      pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
      0, 0, pixelCrop.width, pixelCrop.height
    );
    return new Promise((resolve, reject) => {
      canvas.toBlob((file) => {
        if (file) resolve(file);
        else reject(new Error('Canvas is empty'));
      }, type === 'icon' ? 'image/png' : 'image/jpeg', 0.9);
    });
  };

  const handleCropComplete = async (pixelCrop: any) => {
    setModalOpen(false);
    if (!imageSrc || !activeServiceId) return;

    setUploadingImageId(activeServiceId);
    try {
      const blob = await getCroppedImg(imageSrc, pixelCrop, uploadType);
      if (!blob) throw new Error("Vágás sikertelen");

      const formData = new FormData();
      formData.append('image', blob, `${activeServiceId}_${Date.now()}.${uploadType === 'icon' ? 'png' : 'jpg'}`);

      const uploadResponse = await fetch('/upload.php', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('A szerver nem válaszolt. (Kizárólag Nethelyen fog működni az upload.php)');
      }

      const result = await uploadResponse.json();
      if (!result.success) {
        throw new Error(result.error || 'Ismeretlen hiba feltöltéskor');
      }

      const url = result.url;
      handleServiceChange(activeServiceId, uploadType === 'icon' ? 'iconUrl' : 'image', url);
    } catch (error) {
      console.error(error);
      alert("Hiba történt a kép feltöltésekor.");
    } finally {
      setUploadingImageId(null);
      setImageSrc(null);
      setActiveServiceId(null);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      await updateDoc(doc(db, 'settings', 'site'), siteSettings);
      await setDoc(doc(db, 'settings', 'calculator'), calculatorSettings, { merge: true });
      setSaveMessage('Beállítások sikeresen mentve!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings');
    } finally {
      setIsSaving(false);
    }
  };

  const saveAllServices = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      await Promise.all(services.map(service => {
        const { isNew, ...data } = service;
        return setDoc(doc(db, 'services', data.id), data);
      }));
      setSaveMessage('Minden szolgáltatás sikeresen mentve!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'services');
    } finally {
      setIsSaving(false);
    }
  };

  const QuotesManager = () => {
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
    const [afterImages, setAfterImages] = useState<File[]>([]);
    const [isCompleting, setIsCompleting] = useState(false);
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);
    const [viewerType, setViewerType] = useState<'before' | 'after'>('before');
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

    const filteredQuotes = quotes.filter(q => {
      if (statusFilter === 'trash') return q.status === 'deleted';
      if (statusFilter === 'all') return q.status !== 'deleted';
      return q.status === statusFilter;
    });

    const groupQuotesByDate = (quotes: QuoteRequest[]) => {
      const groups: Record<string, QuoteRequest[]> = {
        'Ez a hét': [],
        'Múlt hét': [],
        'Korábbiak ebben a hónapban': [],
      };

      const now = new Date();
      const startOfThisWeek = new Date(now);
      startOfThisWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
      startOfThisWeek.setHours(0, 0, 0, 0);

      const startOfLastWeek = new Date(startOfThisWeek);
      startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      quotes.forEach(q => {
        const date = q.createdAt?.toDate ? q.createdAt.toDate() : new Date();
        if (date >= startOfThisWeek) {
          groups['Ez a hét'].push(q);
        } else if (date >= startOfLastWeek) {
          groups['Múlt hét'].push(q);
        } else if (date >= startOfThisMonth) {
          groups['Korábbiak ebben a hónapban'].push(q);
        } else {
          const monthYear = date.toLocaleString('hu-HU', { year: 'numeric', month: 'long' });
          if (!groups[monthYear]) groups[monthYear] = [];
          groups[monthYear].push(q);
        }
      });

      return groups;
    };

    const groupedQuotes = groupQuotesByDate(filteredQuotes);

    const handleDeleteQuote = async (quote: QuoteRequest, docId: string) => {
      try {
        if (quote.status === 'deleted') {
          // Permanent delete
          await deleteDoc(doc(db, 'quotes', docId));
        } else {
          // Move to trash
          await updateDoc(doc(db, 'quotes', docId), { status: 'deleted' });
        }
        setIsDeletingId(null);
      } catch (error) {
        console.error("Delete error", error);
        alert("Hiba történt a művelet során.");
      }
    };

    const handleRestoreQuote = async (docId: string) => {
      try {
        await updateDoc(doc(db, 'quotes', docId), { status: 'pending' });
      } catch (error) {
        console.error("Restore error", error);
      }
    };

    const updateQuoteStatus = async (quoteId: string, docId: string, newStatus: string) => {
      try {
        const quoteRef = doc(db, 'quotes', docId);
        await updateDoc(quoteRef, { status: newStatus });
      } catch (error) {
        console.error("Status update error", error);
      }
    };

    const handleJobComplete = async (quote: QuoteRequest, docId: string) => {
      if (afterImages.length === 0) {
        alert("Kérjük tölts fel legalább egy 'Utána' fotót a befejezéshez!");
        return;
      }
      if (afterImages.length > 10) {
        alert("Maximum 10 képet tölthet fel!");
        return;
      }

      setIsCompleting(true);
      try {
        const newImages = [...(quote.images || [])].filter(img => img.type === 'before');

        for (const file of afterImages) {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('folder', `quotes/${quote.id}/after`);

          const response = await fetch('/upload.php', {
            method: 'POST',
            body: formData
          });

          const resText = await response.text();
          let result;
          try {
            result = JSON.parse(resText);
          } catch (e) {
            console.warn("Upload PHP response is not JSON (likely dev mode).", resText);
            if (import.meta.env.DEV) {
              result = { success: true, url: URL.createObjectURL(file) };
            } else {
              throw new Error('Érvénytelen válasz a szervertől a képfeltöltés során.');
            }
          }

          if (result.success) {
            newImages.push({
              url: result.url,
              type: 'after',
              uploadedAt: new Date()
            });
          } else {
            throw new Error(result.error || 'Fájlfeltöltési hiba');
          }
        }

        const quoteRef = doc(db, 'quotes', docId);
        await updateDoc(quoteRef, {
          status: 'completed',
          images: newImages,
          completedAt: serverTimestamp()
        });

        // Trigger Before/After email via mail.php
        try {
          const mailRes = await fetch('/mail.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'job_completed',
              quoteId: quote.id,
              customerEmail: quote.customerEmail,
              customerName: quote.customerName,
              images: newImages
            })
          });
          const mailText = await mailRes.text();
          try {
            JSON.parse(mailText);
          } catch(e) {
            console.warn("Mail PHP response is not JSON (likely dev mode).", mailText);
          }
        } catch (e) {
          console.error("Mail notification error", e);
        }

        alert("Munka sikeresen lezárva és értesítés elküldve!");
        setSelectedQuote(null);
        setAfterImages([]);
      } catch (error) {
        console.error("Completion error", error);
        alert("Hiba történt a lezárás során.");
      } finally {
        setIsCompleting(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-stone-900 mb-2">Ajánlatkérések</h1>
              <p className="text-stone-600">Beérkező megkeresések és munkák kezelése.</p>
            </div>
            <div className="flex gap-2">
              {['all', 'pending', 'accepted', 'completed', 'rejected', 'trash'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === status ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                >
                  {status === 'all' ? 'Aktívak' : 
                   status === 'pending' ? 'Új' : 
                   status === 'accepted' ? 'Elfogadva' : 
                   status === 'completed' ? 'Kész' : 
                   status === 'rejected' ? 'Elutasítva' : 'Lomtár'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {Object.entries(groupedQuotes).map(([groupName, groupQuotes]) => {
            if (groupQuotes.length === 0) return null;
            return (
              <div key={groupName} className="space-y-4">
                <h2 className="text-sm font-bold text-stone-400 uppercase tracking-widest px-2">{groupName}</h2>
                <div className="grid grid-cols-1 gap-4">
                  {groupQuotes.map(quote => {
                    const docId = (quote as any).id;
                    return (
                      <div key={quote.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${quote.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                quote.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                                  quote.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                    'bg-stone-100 text-stone-700'
                                }`}>
                                {quote.status === 'pending' ? 'Új' : quote.status === 'accepted' ? 'Elfogadva' : quote.status === 'completed' ? 'Kész' : 'Elutasítva'}
                              </span>
                              <h3 className="text-xl font-bold text-stone-900">{quote.customerName}</h3>
                              <p className="text-stone-500 text-sm flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {quote.details?.settlement || 'N/A'} • {quote.serviceType}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-black text-emerald-600">{quote.calculatedPrice?.toLocaleString('hu-HU')} Ft</p>
                              <p className="text-xs text-stone-400">{quote.createdAt?.toDate().toLocaleString('hu-HU') || 'N/A'}</p>
                            </div>
                          </div>

                          <div className="flex gap-4 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                            {quote.images?.filter(img => img.type === 'before').map((img, i) => (
                              <img key={i} src={img.url} className="w-20 h-20 object-cover rounded-lg border border-stone-100 flex-shrink-0" alt="Work" />
                            ))}
                            {quote.images?.filter(img => img.type === 'before').length === 0 && <div className="text-xs text-stone-400 italic">Nincsenek fotók beküldve.</div>}
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-stone-50">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSelectedQuote(quote)}
                                className="px-4 py-2 bg-stone-900 text-white text-sm font-bold rounded-lg hover:bg-stone-800 transition-colors"
                              >
                                Részletek
                              </button>
                              
                              {/* Törlés gomb */}
                              {isDeletingId === quote.id ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleDeleteQuote(quote, docId)}
                                    className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                                  >
                                    {quote.status === 'deleted' ? 'Végleges törlés' : 'Törlés megerősítése'}
                                  </button>
                                  <button
                                    onClick={() => setIsDeletingId(null)}
                                    className="px-3 py-2 bg-stone-100 text-stone-600 text-xs font-bold rounded-lg hover:bg-stone-200 transition-colors"
                                  >
                                    Mégsem
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setIsDeletingId(quote.id)}
                                  className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title={quote.status === 'deleted' ? "Végleges törlés" : "Törlés / Lomtár"}
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              )}

                              {quote.status === 'deleted' && (
                                <button
                                  onClick={() => handleRestoreQuote(docId)}
                                  className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg hover:bg-emerald-100 transition-colors"
                                >
                                  Visszaállítás
                                </button>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {(quote.status === 'pending' || quote.status === 'rejected') && (
                                <button onClick={() => updateQuoteStatus(quote.id, docId, 'accepted')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Elfogadás"><Check className="w-5 h-5" /></button>
                              )}
                              {(quote.status === 'pending' || quote.status === 'accepted') && (
                                <button onClick={() => updateQuoteStatus(quote.id, docId, 'rejected')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Elutasítás"><X className="w-5 h-5" /></button>
                              )}
                              {quote.status === 'accepted' && (
                                <button
                                  onClick={() => setSelectedQuote(quote)}
                                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                                >
                                  <Check className="w-4 h-4" /> Munka kész!
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredQuotes.length === 0 && (
            <div className="text-center py-20 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
              <FileText className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-500">Nincsenek megjeleníthető ajánlatkérések.</p>
            </div>
          )}
        </div>

        {/* Detail/Action Modal */}
        {selectedQuote && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-sm"
            onClick={() => { setSelectedQuote(null); setAfterImages([]); }}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <h2 className="text-2xl font-bold">Részletek: {selectedQuote.customerName}</h2>
                <button onClick={() => { setSelectedQuote(null); setAfterImages([]); }} className="p-2 hover:bg-stone-100 rounded-full"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Ügyfél adatok</h4>
                    <div className="space-y-2">
                      <p className="flex items-center gap-2 text-stone-800"><Phone className="w-4 h-4 text-emerald-600" /> {selectedQuote.customerPhone}</p>
                      <p className="flex items-center gap-2 text-stone-800"><Mail className="w-4 h-4 text-emerald-600" /> {selectedQuote.customerEmail || 'Nincs megadva'}</p>
                      <p className="flex items-center gap-2 text-stone-800"><MapPin className="w-4 h-4 text-emerald-600" /> {selectedQuote.details?.settlement || 'N/A'}</p>
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Alkalmas napok</label>
                        <div className="grid grid-cols-7 gap-1">
                          {['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'].map((day, idx) => {
                            const isSelected = selectedQuote.preferredDays?.includes(day) || selectedQuote.preferredDays?.includes('a hét bármely napján');
                            return (
                              <div 
                                key={day} 
                                className={`flex flex-col items-center justify-center py-2 rounded-lg border text-[10px] font-bold transition-colors ${
                                  isSelected 
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' 
                                    : 'bg-stone-50 border-stone-100 text-stone-400'
                                }`}
                              >
                                {day}
                              </div>
                            );
                          })}
                        </div>
                        {selectedQuote.preferredDays?.includes('a hét bármely napján') && (
                          <div className="mt-2 text-center">
                             <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 italic">
                               A hét bármely napján megfelelő
                             </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Kalkuláció</h4>
                    <div className="text-2xl font-black text-emerald-600">{selectedQuote.calculatedPrice?.toLocaleString('hu-HU')} Ft</div>
                    <p className="text-sm text-stone-600">{selectedQuote.serviceType}</p>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-stone-50">
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Üzenet / Megjegyzés</h4>
                  <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 relative">
                    <span className="absolute -top-3 left-6 px-2 bg-stone-50 text-[10px] font-black text-stone-300 uppercase italic">Üzenet</span>
                    <p className="text-stone-700 whitespace-pre-line text-sm italic font-medium leading-relaxed">
                      "{selectedQuote.message || 'Az ügyfél nem hagyott üzenetet.'}"
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Munkaterület képei</h4>
                    <span className="text-[10px] text-stone-400">Kattints a nagyításhoz / lapozáshoz</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedQuote.images?.filter(img => img.type === 'before').map((img, i) => (
                      <button
                        key={i}
                        onClick={() => { setViewerType('before'); setViewerIndex(i); }}
                        className="aspect-square rounded-xl overflow-hidden border border-stone-200 group relative"
                      >
                        <img src={img.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="Before" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Plus className="w-6 h-6 text-white" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedQuote.status === 'accepted' && (
                  <div className="space-y-6 pt-10 border-t-2 border-dashed border-stone-100">
                    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                      <h4 className="text-emerald-800 font-bold mb-4 flex items-center gap-2">
                        <UploadCloud className="w-5 h-5" /> Munka lezárása (Utána fotók - max 10 db)
                      </h4>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <label className="cursor-pointer flex items-center justify-center gap-2 bg-white border border-emerald-200 text-emerald-700 py-3 rounded-xl hover:bg-emerald-50 transition-colors shadow-sm">
                          <Car className="w-5 h-5" />
                          <span className="text-sm font-bold">Készítés (Kamera)</span>
                          <input
                            type="file"
                            capture="environment"
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                              if (e.target.files) {
                                const files = Array.from(e.target.files);
                                setAfterImages(prev => [...prev, ...files].slice(0, 10));
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                        <label className="cursor-pointer flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-md">
                          <UploadCloud className="w-5 h-5" />
                          <span className="text-sm font-bold">Feltöltés galériából</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files) {
                                const files = Array.from(e.target.files);
                                setAfterImages(prev => [...prev, ...files].slice(0, 10));
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {afterImages.length > 0 && (
                        <div className="grid grid-cols-5 gap-2 mt-4 bg-white/50 p-3 rounded-xl border border-emerald-100">
                          {afterImages.map((file, i) => (
                            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-emerald-200 group">
                              <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="After preview" />
                              <button
                                onClick={() => setAfterImages(prev => prev.filter((_, idx) => idx !== i))}
                                className="absolute top-0.5 right-0.5 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => handleJobComplete(selectedQuote, (selectedQuote as any).id)}
                        disabled={isCompleting || afterImages.length === 0}
                        className="w-full mt-6 bg-emerald-600 text-white font-bold py-4 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                      >
                        {isCompleting ? 'Feltöltés és mentés...' : 'Munka lezárása és fotók küldése'}
                      </button>
                    </div>
                  </div>
                )}

                {selectedQuote.status === 'completed' && (
                  <div className="space-y-4 pt-6 border-t border-stone-50">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest text-emerald-600">Elkészült munka képei</h4>
                      <span className="text-[10px] text-stone-400">Kattints a nagyításhoz</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedQuote.images?.filter(img => img.type === 'after').map((img, i) => (
                        <button
                          key={i}
                          onClick={() => { setViewerType('after'); setViewerIndex(i); }}
                          className="aspect-square rounded-xl overflow-hidden border border-emerald-200 group relative"
                        >
                          <img src={img.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="After" />
                          <div className="absolute inset-0 bg-emerald-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Plus className="w-6 h-6 text-emerald-600" />
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-stone-400">Lezárva: {selectedQuote.completedAt?.toDate().toLocaleString('hu-HU') || 'N/A'}</p>
                  </div>
                )}

                {/* Lightbox / Carousel */}
                {viewerIndex !== null && (
                  <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center">
                    <button onClick={() => setViewerIndex(null)} className="absolute top-6 right-6 text-white bg-white/10 p-3 rounded-full hover:bg-white/20 z-10">
                      <X className="w-8 h-8" />
                    </button>

                    <div className="relative w-full h-full flex items-center justify-center p-4">
                      {/* Prev button */}
                      <button
                        onClick={() => setViewerIndex(prev => {
                          const list = selectedQuote.images?.filter(img => img.type === viewerType) || [];
                          return (prev! - 1 + list.length) % list.length;
                        })}
                        className="absolute left-4 p-4 text-white bg-black/50 rounded-full hover:bg-black/70 z-10"
                      >
                        <ChevronUp className="w-8 h-8 -rotate-90" />
                      </button>

                      <img
                        src={selectedQuote.images?.filter(img => img.type === viewerType)[viewerIndex]?.url}
                        className="max-w-full max-h-full object-contain"
                        alt="Gallery"
                      />

                      {/* Next button */}
                      <button
                        onClick={() => setViewerIndex(prev => {
                          const list = selectedQuote.images?.filter(img => img.type === viewerType) || [];
                          return (prev! + 1) % list.length;
                        })}
                        className="absolute right-4 p-4 text-white bg-black/50 rounded-full hover:bg-black/70 z-10"
                      >
                        <ChevronDown className="w-8 h-8 -rotate-90" />
                      </button>

                      <div className="absolute bottom-10 text-white bg-black/50 px-6 py-2 rounded-full font-bold">
                        {viewerIndex + 1} / {selectedQuote.images?.filter(img => img.type === viewerType).length}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50">Betöltés...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-900 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border border-stone-200">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mb-2">Adminisztrációs Felület</h1>
          <p className="text-stone-500 mb-8 text-sm">Jelentkezz be a tartalom szerkesztéséhez</p>
          <button
            onClick={handleLogin}
            className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Bejelentkezés Google fiókkal
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-900 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border border-stone-200">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mb-2">Nincs jogosultság</h1>
          <p className="text-stone-600 mb-8">Ehhez a felülethez csak adminisztrátorok férhetnek hozzá. Kérjük, jelentkezz be a megfelelő fiókkal.</p>
          <button
            onClick={handleLogout}
            className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium py-3.5 px-6 rounded-xl transition-colors"
          >
            Kijelentkezés és visszatérés
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-stone-900 text-white flex flex-col md:sticky md:top-0 md:h-screen overflow-y-auto">
        <div className="p-6 border-b border-stone-800">
          <h2 className="text-xl font-bold text-emerald-400">Admin Panel</h2>
          <p className="text-stone-400 text-sm mt-1">{user.email}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-emerald-600 text-white' : 'text-stone-300 hover:bg-stone-800'}`}
          >
            <Settings className="w-5 h-5" />
            Oldal beállítások
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'services' ? 'bg-emerald-600 text-white' : 'text-stone-300 hover:bg-stone-800'}`}
          >
            <List className="w-5 h-5" />
            Szolgáltatások
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'calculator' ? 'bg-emerald-600 text-white' : 'text-stone-300 hover:bg-stone-800'}`}
          >
            <Calculator className="w-5 h-5" />
            Árkalkulátor
          </button>
          <button
            onClick={() => setActiveTab('quotes')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'quotes' ? 'bg-emerald-600 text-white' : 'text-stone-300 hover:bg-stone-800'}`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5" />
              Ajánlatkérések
            </div>
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'statistics' ? 'bg-emerald-600 text-white' : 'text-stone-300 hover:bg-stone-800'}`}
          >
            <BarChart3 className="w-5 h-5" />
            Statisztika
          </button>
        </nav>
        <div className="p-4 border-t border-stone-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-stone-300 hover:bg-stone-800 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Kijelentkezés
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto">

          {/* Status Message */}
          {saveMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-emerald-100 text-emerald-800 rounded-xl flex items-center gap-2"
            >
              <Check className="w-5 h-5" />
              {saveMessage}
            </motion.div>
          )}

          {activeTab === 'settings' && siteSettings && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <div>
                  <h1 className="text-3xl font-bold text-stone-900 mb-2">Oldal beállítások</h1>
                  <p className="text-stone-600">Szekciók láthatósága és főbb szövegek szerkesztése.</p>
                </div>
                <button
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg"
                >
                  <Save className="w-5 h-5" />
                  {isSaving ? 'Mentés...' : 'Beállítások mentése'}
                </button>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-stone-800 flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-emerald-600" />
                    Szerkezeti felépítés (Dinamikus Blokkok)
                  </h2>
                </div>

                <div className="space-y-4">
                  {(siteSettings.sections || [
                    { id: 'hero', type: 'hero', isVisible: siteSettings.showHero !== false },
                    { id: 'features', type: 'features', isVisible: siteSettings.showFeatures !== false },
                    { id: 'services', type: 'services', isVisible: siteSettings.showServices !== false },
                    { id: 'contact', type: 'contact', isVisible: siteSettings.showContact !== false }
                  ]).map((section: SectionBlock, index: number, arr: SectionBlock[]) => {
                    const toggleVisibility = () => {
                      const newSections = [...arr];
                      newSections[index].isVisible = !newSections[index].isVisible;
                      handleSettingChange('sections', newSections);
                      if (section.type === 'hero') handleSettingChange('showHero', newSections[index].isVisible);
                      if (section.type === 'features') handleSettingChange('showFeatures', newSections[index].isVisible);
                      if (section.type === 'services') handleSettingChange('showServices', newSections[index].isVisible);
                      if (section.type === 'contact') handleSettingChange('showContact', newSections[index].isVisible);
                    };

                    const moveSection = (direction: 'up' | 'down') => {
                      const newSections = [...arr];
                      if (direction === 'up' && index > 0) {
                        const temp = newSections[index - 1];
                        newSections[index - 1] = newSections[index];
                        newSections[index] = temp;
                      } else if (direction === 'down' && index < newSections.length - 1) {
                        const temp = newSections[index + 1];
                        newSections[index + 1] = newSections[index];
                        newSections[index] = temp;
                      }
                      handleSettingChange('sections', newSections);
                    };

                    const deleteCustomSection = () => {
                      if (window.confirm("Biztosan törlöd ezt az egyedi blokkot?")) {
                        handleSettingChange('sections', arr.filter((_, i) => i !== index));
                      }
                    };

                    const updateCustomField = (field: string, value: string) => {
                      const newSections = [...arr] as any[];
                      newSections[index][field] = value;
                      handleSettingChange('sections', newSections);
                    };

                    let label = "";
                    if (section.type === 'hero') label = "Fejléc (Hero) szekció";
                    else if (section.type === 'features') label = "Miért minket válasszon szekció";
                    else if (section.type === 'services') label = "Szolgáltatások szekció";
                    else if (section.type === 'contact') label = "Kapcsolat és Árajánlatkérés szekció";
                    else label = "Egyedi Blokk";

                    return (
                      <div key={section.id} className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all hover:border-stone-300">
                        <div className="flex items-center justify-between p-4 bg-stone-50 border-b border-stone-100">
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => moveSection('up')}
                                disabled={index === 0}
                                className="p-1 rounded bg-stone-200 hover:bg-stone-300 text-stone-600 disabled:opacity-30"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => moveSection('down')}
                                disabled={index === arr.length - 1}
                                className="p-1 rounded bg-stone-200 hover:bg-stone-300 text-stone-600 disabled:opacity-30"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                            </div>
                            <div>
                              <span className="font-bold text-stone-800 block">{label}</span>
                              <span className="text-xs text-stone-500 font-mono">{section.type.toUpperCase()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <span className={`text-sm font-medium ${section.isVisible ? 'text-emerald-600' : 'text-stone-500'}`}>
                                {section.isVisible ? 'Látható' : 'Rejtett'}
                              </span>
                              <div className="relative inline-flex items-center">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={section.isVisible}
                                  onChange={toggleVisibility}
                                />
                                <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                              </div>
                            </label>
                            {section.type === 'custom' && (
                              <button onClick={deleteCustomSection} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Egyedi blokk szerkesztő mezői */}
                        {section.type === 'custom' && (
                          <div className="p-4 space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-stone-700 mb-1">Cím</label>
                              <input
                                type="text"
                                value={(section as CustomBlock).title || ''}
                                onChange={(e) => updateCustomField('title', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-stone-700 mb-1">Szöveges tartalom</label>
                              <textarea
                                rows={4}
                                value={(section as CustomBlock).content || ''}
                                onChange={(e) => updateCustomField('content', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">Háttérszín állított</label>
                                <select
                                  value={(section as CustomBlock).bgColor || 'bg-white'}
                                  onChange={(e) => updateCustomField('bgColor', e.target.value)}
                                  className="w-full px-4 py-2 rounded-lg border border-stone-200 outline-none"
                                >
                                  <option value="bg-white">Világos (Fehér)</option>
                                  <option value="bg-stone-50">Világosszürke</option>
                                  <option value="bg-stone-900">Sötétszürke</option>
                                  <option value="bg-stone-950">Nagyon sötét</option>
                                  <option value="bg-emerald-600">Zöld (Márkaszín)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">Szövegszín állított</label>
                                <select
                                  value={(section as CustomBlock).textColor || 'text-stone-900'}
                                  onChange={(e) => updateCustomField('textColor', e.target.value)}
                                  className="w-full px-4 py-2 rounded-lg border border-stone-200 outline-none"
                                >
                                  <option value="text-stone-900">Sötét szöveg</option>
                                  <option value="text-white">Világos szöveg</option>
                                  <option value="text-emerald-50">Halvány zöld</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => {
                    const newBlock: CustomBlock & { isVisible: boolean } = {
                      id: `custom_${uuidv4()}`,
                      type: 'custom',
                      title: 'Új egyedi blokk',
                      content: 'Írd ide a blokk tartalmát...',
                      bgColor: 'bg-white',
                      textColor: 'text-stone-900',
                      isVisible: true
                    };
                    const currentSections = siteSettings.sections || [
                      { id: 'hero', type: 'hero', isVisible: siteSettings.showHero !== false },
                      { id: 'features', type: 'features', isVisible: siteSettings.showFeatures !== false },
                      { id: 'services', type: 'services', isVisible: siteSettings.showServices !== false },
                      { id: 'contact', type: 'contact', isVisible: siteSettings.showContact !== false }
                    ];
                    handleSettingChange('sections', [...currentSections, newBlock]);
                  }}
                  className="mt-6 w-full py-3 border-2 border-dashed border-emerald-300 rounded-xl flex items-center justify-center gap-2 text-emerald-600 font-medium hover:border-emerald-500 hover:bg-emerald-50 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Új Egyedi Blokk Hozzáadása
                </button>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <h2 className="text-xl font-semibold text-stone-800 mb-6 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  Fejléc szövegek
                </h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">Főcím</label>
                    <input
                      type="text"
                      value={siteSettings.heroTitle || ''}
                      onChange={(e) => handleSettingChange('heroTitle', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-stone-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">Alcím / Leírás</label>
                    <textarea
                      rows={3}
                      value={siteSettings.heroSubtitle || ''}
                      onChange={(e) => handleSettingChange('heroSubtitle', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none text-stone-900 bg-white"
                    />
                  </div>
                  <div className="pt-6 border-t border-stone-100">
                    <h3 className="text-sm font-bold text-stone-800 mb-4 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-emerald-600" />
                      Értesítések
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Elsődleges email</label>
                        <input
                          type="email"
                          value={siteSettings.contactEmail || ''}
                          onChange={(e) => handleSettingChange('contactEmail', e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="info@zold-mezo.hu"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Másodlagos értesítési email</label>
                        <input
                          type="email"
                          value={siteSettings.secondaryContactEmail || ''}
                          onChange={(e) => handleSettingChange('secondaryContactEmail', e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="szi.illes85@gmail.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'services' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <div>
                  <h1 className="text-3xl font-bold text-stone-900 mb-2">Szolgáltatások kezelése</h1>
                  <p className="text-stone-600">Szolgáltatások be- és kikapcsolása, szövegek módosítása.</p>
                </div>
                <button
                  onClick={async () => {
                    await saveSettings();
                    await saveAllServices();
                  }}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg"
                >
                  <Save className="w-5 h-5" />
                  {isSaving ? 'Mentés...' : 'Beállítások mentése'}
                </button>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <h2 className="text-xl font-semibold text-stone-800 mb-6 flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5 text-emerald-600" />
                  Szolgáltatások megjelenése a főoldalon
                </h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-3">Elrendezés típusa</label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="servicesLayout"
                          value="grid"
                          checked={siteSettings?.servicesLayout !== 'list'}
                          onChange={() => handleSettingChange('servicesLayout', 'grid')}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-stone-300"
                        />
                        <span className="text-stone-700">Négyzetes (Egymás mellett)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="servicesLayout"
                          value="list"
                          checked={siteSettings?.servicesLayout === 'list'}
                          onChange={() => handleSettingChange('servicesLayout', 'list')}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-stone-300"
                        />
                        <span className="text-stone-700">Széles sávos (Kép és szöveg)</span>
                      </label>
                    </div>
                  </div>

                  {siteSettings?.servicesLayout === 'list' && (
                    <div className="pt-4 border-t border-stone-100">
                      <label className="block text-sm font-medium text-stone-700 mb-3">Kép pozíciója az első elemnél</label>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="servicesListStartSide"
                            value="left"
                            checked={siteSettings?.servicesListStartSide !== 'right'}
                            onChange={() => handleSettingChange('servicesListStartSide', 'left')}
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-stone-300"
                          />
                          <span className="text-stone-700">Bal oldalon kezdődik</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="servicesListStartSide"
                            value="right"
                            checked={siteSettings?.servicesListStartSide === 'right'}
                            onChange={() => handleSettingChange('servicesListStartSide', 'right')}
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-stone-300"
                          />
                          <span className="text-stone-700">Jobb oldalon kezdődik</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {services.map((service, index) => (
                  <div key={service.id} className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveService(index, 'up')}
                            disabled={index === 0}
                            className="p-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 disabled:opacity-30 transition-colors"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveService(index, 'down')}
                            disabled={index === services.length - 1}
                            className="p-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 disabled:opacity-30 transition-colors"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                        <h3 className="text-lg font-bold text-stone-900">{service.title || 'Névtelen szolgáltatás'}</h3>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <span className={`text-sm font-medium ${service.isActive ? 'text-emerald-600' : 'text-stone-600'}`}>
                            {service.isActive ? 'Aktív' : 'Inaktív'}
                          </span>
                          <div className="relative inline-flex items-center">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={service.isActive}
                              onChange={(e) => handleServiceChange(service.id, 'isActive', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                          </div>
                        </label>
                        <button
                          onClick={() => handleRemoveService(service.id, service.isNew)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Törlés"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-1">Megnevezés</label>
                          <input
                            type="text"
                            value={service.title}
                            onChange={(e) => handleServiceChange(service.id, 'title', e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none text-stone-900 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-1">Leírás</label>
                          <textarea
                            rows={4}
                            value={service.description}
                            onChange={(e) => handleServiceChange(service.id, 'description', e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-stone-900 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-1">Ikon beállítása</label>
                          <div className="flex flex-col gap-2">
                            <select
                              value={service.iconName || 'Leaf'}
                              onChange={(e) => handleServiceChange(service.id, 'iconName', e.target.value)}
                              className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-stone-900"
                            >
                              <option value="Leaf">Falevél (Alapértelmezett)</option>
                              <option value="Scissors">Olló / Sövénynyíró</option>
                              <option value="Axe">Balta / Kasza</option>
                              <option value="TreePine">Fenyőfa</option>
                              <option value="Tractor">Traktor</option>
                              <option value="Droplets">Cseppek / Locsolás</option>
                            </select>
                            <div className="flex gap-2 items-center">
                              <div className="flex-1 relative">
                                <input
                                  type="text"
                                  value={service.iconUrl || ''}
                                  placeholder="Ikon URL vagy feltöltés..."
                                  onChange={(e) => handleServiceChange(service.id, 'iconUrl', e.target.value)}
                                  className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none text-stone-900 bg-white text-xs pr-20"
                                />
                                {service.iconUrl && (
                                  <button
                                    onClick={() => handleServiceChange(service.id, 'iconUrl', '')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-red-500"
                                  >
                                    Törlés
                                  </button>
                                )}
                              </div>
                              <label className="cursor-pointer bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg border border-emerald-200 transition-colors flex items-center justify-center gap-2 whitespace-nowrap">
                                <UploadCloud className="w-4 h-4" />
                                <span className="text-xs font-medium">Kép feltöltése</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => onFileChange(e, service.id, 'icon')}
                                />
                              </label>
                              <div className="w-12 h-12 rounded-lg border border-stone-200 overflow-hidden bg-stone-50 flex-shrink-0 flex items-center justify-center p-1">
                                <img src={service.iconUrl} alt="Választott ikon" className="w-full h-full object-contain icon-emerald" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-stone-700">Kép (16:9 arány javasolt)</label>
                        <div className="border-2 border-dashed border-stone-300 rounded-xl overflow-hidden bg-stone-50 relative group aspect-video flex-shrink-0">
                          {service.image ? (
                            <>
                              <img src={service.image} alt="Kép előnézet" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <label className="cursor-pointer bg-white/20 hover:bg-white/30 p-3 rounded-full backdrop-blur-sm transition-colors text-white">
                                  <UploadCloud className="w-6 h-6" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => onFileChange(e, service.id)}
                                  />
                                </label>
                              </div>
                            </>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-stone-100 transition-colors">
                              <UploadCloud className="w-8 h-8 text-stone-400 mb-2" />
                              <span className="text-sm font-medium text-stone-500">Kép feltöltése</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => onFileChange(e, service.id)}
                              />
                            </label>
                          )}
                          {uploadingImageId === service.id && (
                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 backdrop-blur-sm">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddService}
                className="w-full py-4 border-2 border-dashed border-stone-300 rounded-2xl flex items-center justify-center gap-2 text-stone-500 font-medium hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
              >
                <Plus className="w-5 h-5" />
                Új szolgáltatás hozzáadása
              </button>
            </motion.div>
          )}

          {activeTab === 'quotes' && <QuotesManager />}

          {activeTab === 'calculator' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <div>
                  <h1 className="text-3xl font-bold text-stone-900 mb-2">Árkalkulátor beállítások</h1>
                  <p className="text-stone-600">A kalkulátor képleteinek és alapárainak módosítása.</p>
                </div>
                <button
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg"
                >
                  <Save className="w-5 h-5" />
                  {isSaving ? 'Mentés...' : 'Beállítások mentése'}
                </button>
              </div>

              {/* 0. AKCIÓK ÉS PROMÓCIÓK */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl shadow-sm border border-amber-200 space-y-6">
                <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
                  <Calculator className="w-6 h-6 text-amber-600" /> Aktív Akciók és Promóciók
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {['fuvagas', 'locsolas', 'soveny'].map(id => {
                    const promo = calculatorSettings.promotions?.[id] || { isActive: false, type: 'percent', value: 0, message: '' };
                    const updatePromo = (key: string, val: any) => {
                      setCalculatorSettings(prev => ({
                        ...prev,
                        promotions: {
                          ...(prev.promotions || {}),
                          [id]: { ...promo, [key]: val }
                        }
                      }));
                    };

                    return (
                      <div key={id} className={`p-4 rounded-xl border-2 transition-all ${promo.isActive ? 'bg-white border-amber-400 shadow-md' : 'bg-stone-50/50 border-stone-200 opacity-70'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <span className="font-bold text-stone-800 uppercase text-sm">{id === 'fuvagas' ? 'Fűvágás' : id === 'locsolas' ? 'Locsolás' : 'Sövény'}</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={promo.isActive} onChange={e => updatePromo('isActive', e.target.checked)} />
                            <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                          </label>
                        </div>
                        
                        <div className="space-y-3">
                          <input 
                            disabled={!promo.isActive}
                            type="text" 
                            placeholder="Akciós üzenet (pl. Tavaszi akció!)"
                            value={promo.message} 
                            onChange={e => updatePromo('message', e.target.value)}
                            className="w-full text-xs border border-stone-200 rounded px-2 py-2 outline-none focus:ring-2 focus:ring-amber-500 italic bg-white"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 1. SZOLGÁLTATÁSOK ALAPÁRAI */}
              <div className="grid md:grid-cols-2 gap-8">
                {/* Traktoros fűnyírás */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-4 flex flex-col">
                  <h2 className="text-xl font-semibold text-stone-800 border-b border-stone-100 pb-4 flex items-center gap-2">
                    <Car className="w-5 h-5 text-emerald-600" /> Traktoros fűnyírás
                  </h2>
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Minimum díj (Ft)</label>
                      <input type="number" value={calculatorSettings.traktorMinPrice}
                        onChange={(e) => handleCalculatorSettingChange('traktorMinPrice', Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-stone-900 bg-white" />
                    </div>
                    <TierManager type="traktorPriceTiers" title="Traktor egységárak" />
                    <div className="pt-2 border-t border-stone-100">
                      <p className="text-xs font-semibold text-stone-500 uppercase mb-2">Tiltott opciók</p>
                      <div className="flex flex-wrap gap-2">
                        <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer">
                          <input type="checkbox"
                            checked={calculatorSettings.prohibitedOptions?.traktor?.includes('terrainSteep') || false}
                            onChange={(e) => toggleProhibitedOption('traktor', 'terrainSteep', e.target.checked)}
                          /> Meredek terep
                        </label>
                        <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer">
                          <input type="checkbox"
                            checked={calculatorSettings.prohibitedOptions?.traktor?.includes('grassHigh') || false}
                            onChange={(e) => toggleProhibitedOption('traktor', 'grassHigh', e.target.checked)}
                          /> Magas fű
                        </label>
                      </div>
                    </div>
                    <CostItemsManager serviceId="traktor" />
                  </div>
                </div>

                {/* Tologatós fűnyírás */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-4 flex flex-col">
                  <h2 className="text-xl font-semibold text-stone-800 border-b border-stone-100 pb-4 flex items-center gap-2">
                    <HardHat className="w-5 h-5 text-emerald-600" /> Tologatós fűnyírás
                  </h2>
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Minimum díj (Ft)</label>
                      <input type="number" value={calculatorSettings.tologatosMinPrice}
                        onChange={(e) => handleCalculatorSettingChange('tologatosMinPrice', Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-stone-900 bg-white" />
                    </div>
                    <TierManager type="tologatosPriceTiers" title="Tologatós egységárak" />
                    <div className="pt-2 border-t border-stone-100">
                      <p className="text-xs font-semibold text-stone-500 uppercase mb-2">Tiltott opciók</p>
                      <div className="flex flex-wrap gap-2">
                        <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer">
                          <input type="checkbox"
                            checked={calculatorSettings.prohibitedOptions?.tologatos?.includes('terrainSteep') || false}
                            onChange={(e) => toggleProhibitedOption('tologatos', 'terrainSteep', e.target.checked)}
                          /> Meredek terep
                        </label>
                        <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer">
                          <input type="checkbox"
                            checked={calculatorSettings.prohibitedOptions?.tologatos?.includes('grassHigh') || false}
                            onChange={(e) => toggleProhibitedOption('tologatos', 'grassHigh', e.target.checked)}
                          /> Magas fű
                        </label>
                      </div>
                    </div>
                    <CostItemsManager serviceId="tologatos" />
                  </div>
                </div>

                {/* Fűkaszálás */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-4 flex flex-col">
                  <h2 className="text-xl font-semibold text-stone-800 border-b border-stone-100 pb-4 flex items-center gap-2">
                    <Axe className="w-5 h-5 text-emerald-600" /> Fűkaszálás
                  </h2>
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Minimum díj (Ft)</label>
                      <input type="number" value={calculatorSettings.kaszoMinPrice}
                        onChange={(e) => handleCalculatorSettingChange('kaszoMinPrice', Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-stone-900 bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Alapár (Ft/m²)</label>
                      <input type="number" value={calculatorSettings.kaszoBasePrice}
                        onChange={(e) => handleCalculatorSettingChange('kaszoBasePrice', Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-stone-900 bg-white" />
                    </div>
                    <div className="pt-2 border-t border-stone-100">
                      <p className="text-xs font-semibold text-stone-500 uppercase mb-2">Tiltott opciók</p>
                      <div className="flex flex-wrap gap-2">
                        <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer">
                          <input type="checkbox"
                            checked={calculatorSettings.prohibitedOptions?.kaszo?.includes('terrainSteep') || false}
                            onChange={(e) => toggleProhibitedOption('kaszo', 'terrainSteep', e.target.checked)}
                          /> Meredek terep
                        </label>
                        <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer">
                          <input type="checkbox"
                            checked={calculatorSettings.prohibitedOptions?.kaszo?.includes('grassHigh') || false}
                            onChange={(e) => toggleProhibitedOption('kaszo', 'grassHigh', e.target.checked)}
                          /> Magas fű
                        </label>
                      </div>
                    </div>
                    <CostItemsManager serviceId="kaszo" />
                  </div>
                </div>

                {/* Fűnyírási Logika Szabályok */}
                <div className="md:col-span-2 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-2xl shadow-sm border border-emerald-100 space-y-6">
                  <h2 className="text-xl font-bold text-emerald-900 flex items-center gap-2">
                    <Tractor className="w-6 h-6 text-emerald-600" /> Fűnyírási Logika és Szabályok
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white/60 p-4 rounded-xl border border-white space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-stone-700 mb-1">Tologatós m² korlát</label>
                        <p className="text-xs text-stone-500 mb-3">Maximális terület, amíg a tologatós fűnyíró még választható opció.</p>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            value={calculatorSettings.tologatosMaxArea || 2500}
                            onChange={(e) => handleCalculatorSettingChange('tologatosMaxArea', Number(e.target.value))}
                            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-stone-900 bg-white" 
                          />
                          <span className="text-sm font-bold text-stone-400">m²</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/60 p-4 rounded-xl border border-white space-y-4">
                      <p className="text-sm font-bold text-stone-700 uppercase tracking-wider mb-2">Terepviszonyok szerinti traktor kizárás</p>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="block text-sm font-semibold text-stone-700">Nagyon tagolt terep</label>
                            <p className="text-[10px] text-stone-500 italic">Alapértelmezetten tiltva</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={calculatorSettings.excludeTraktorOnVerySegmented ?? true} 
                              onChange={(e) => handleCalculatorSettingChange('excludeTraktorOnVerySegmented', e.target.checked)} 
                            />
                            <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <label className="block text-sm font-semibold text-stone-700">Sok akadály</label>
                            <p className="text-[10px] text-stone-500 italic">Alapértelmezetten tiltva</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={calculatorSettings.excludeTraktorOnManyObstacles ?? true} 
                              onChange={(e) => handleCalculatorSettingChange('excludeTraktorOnManyObstacles', e.target.checked)} 
                            />
                            <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                          <div>
                            <label className="block text-sm font-bold text-red-700">Meredek lejtő / Rézsű</label>
                            <p className="text-[10px] text-red-500 font-medium italic">Kalkuláció teljes tiltása (Minden eszköz)</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={calculatorSettings.excludeAllOnSteepSlope ?? true} 
                              onChange={(e) => handleCalculatorSettingChange('excludeAllOnSteepSlope', e.target.checked)} 
                            />
                            <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sövénynyírás */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-4 flex flex-col">
                  <h2 className="text-xl font-semibold text-stone-800 border-b border-stone-100 pb-4 flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-emerald-600" /> Sövénynyírás
                  </h2>
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Minimum díj (Ft)</label>
                      <input type="number" value={calculatorSettings.hedgeTrimmingMinPrice || ''}
                        onChange={(e) => handleCalculatorSettingChange('hedgeTrimmingMinPrice', Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-stone-900 bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Alapár (Ft/fm – hossz alapú)</label>
                      <input type="number" value={calculatorSettings.hedgeTrimmingBasePrice || ''}
                        onChange={(e) => handleCalculatorSettingChange('hedgeTrimmingBasePrice', Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-stone-900 bg-white" />
                    </div>
                    <div className="pt-2 border-t border-stone-100">
                      <p className="text-xs font-semibold text-stone-500 uppercase mb-2">Tiltott opciók</p>
                      <div className="flex flex-wrap gap-2">
                        <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer">
                          <input type="checkbox"
                            checked={calculatorSettings.prohibitedOptions?.soveny?.includes('terrainSteep') || false}
                            onChange={(e) => toggleProhibitedOption('soveny', 'terrainSteep', e.target.checked)}
                          /> Meredek terep
                        </label>
                      </div>
                    </div>
                    <CostItemsManager serviceId="soveny" />
                  </div>
                </div>
              </div>

              {/* 2. LOCSOLÁS */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-6">
                <h2 className="text-xl font-semibold text-stone-800 border-b border-stone-100 pb-4 flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-emerald-600" /> Locsolás (Szivattyús)
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-stone-400 uppercase tracking-wider">Általános</p>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Minimum díj (Ft)</label>
                      <input type="number" value={calculatorSettings.wateringMinPrice || ''}
                        onChange={(e) => handleCalculatorSettingChange('wateringMinPrice', Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-stone-900 bg-white" />
                    </div>
                    <CostItemsManager serviceId="locsolas" />
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-stone-400 uppercase tracking-wider">Fák, facsemeték (Ft/fa)</p>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">1-100 db</label>
                      <input type="number" value={calculatorSettings.wateringTreePrice1}
                        onChange={(e) => handleCalculatorSettingChange('wateringTreePrice1', Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-stone-900 bg-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">101-500 db</label>
                      <input type="number" value={calculatorSettings.wateringTreePrice2}
                        onChange={(e) => handleCalculatorSettingChange('wateringTreePrice2', Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-stone-900 bg-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">501+ db</label>
                      <input type="number" value={calculatorSettings.wateringTreePrice3}
                        onChange={(e) => handleCalculatorSettingChange('wateringTreePrice3', Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-stone-900 bg-white text-sm" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-stone-400 uppercase tracking-wider">Díszkertek, ágyások, pázsit (Ft/m²)</p>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">1-100 m²</label>
                      <input type="number" value={calculatorSettings.wateringPlantPrice1}
                        onChange={(e) => handleCalculatorSettingChange('wateringPlantPrice1', Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-stone-900 bg-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">101-500 m²</label>
                      <input type="number" value={calculatorSettings.wateringPlantPrice2}
                        onChange={(e) => handleCalculatorSettingChange('wateringPlantPrice2', Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-stone-900 bg-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">501+ m²</label>
                      <input type="number" value={calculatorSettings.wateringPlantPrice3}
                        onChange={(e) => handleCalculatorSettingChange('wateringPlantPrice3', Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-stone-900 bg-white text-sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. ÁRKÉPZÉSI FINOMHANGOLÓK */}
              <div className="grid md:grid-cols-2 gap-8">
                {/* Szorzók */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-4">
                  <h2 className="text-xl font-semibold text-stone-800 border-b border-stone-100 pb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-emerald-600" /> Szorzók és Gyakorisági Kedvezmények
                  </h2>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Kevés akadály (%)</label>
                        <input type="number" step="1" value={calculatorSettings.surchargeObstacleFew ?? 20}
                          onChange={(e) => handleCalculatorSettingChange('surchargeObstacleFew', Number(e.target.value))}
                          className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Sok akadály (%)</label>
                        <input type="number" step="1" value={calculatorSettings.surchargeObstacleMany ?? 40}
                          onChange={(e) => handleCalculatorSettingChange('surchargeObstacleMany', Number(e.target.value))}
                          className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-stone-100 space-y-4">
                      <p className="text-xs font-bold text-stone-400 uppercase">Gyakorisági Kedvezmények</p>
                      
                      {['monthly1', 'monthlyMore'].map(key => {
                        const label = key === 'monthly1' ? 'Havi 1 alkalom' : 'Havi többszöri';
                        const config = calculatorSettings.frequencyDiscountSettings?.[key as 'monthly1' | 'monthlyMore'] || { type: 'percent', value: 0 };
                        
                        const updateFreq = (field: string, val: any) => {
                          setCalculatorSettings(prev => ({
                            ...prev,
                            frequencyDiscountSettings: {
                              ...(prev.frequencyDiscountSettings || { monthly1: { type: 'percent', value: 10 }, monthlyMore: { type: 'percent', value: 15 } }),
                              [key]: { ...config, [field]: val }
                            }
                          }));
                        };

                        return (
                          <div key={key} className="flex items-center gap-4 bg-stone-50 p-3 rounded-xl border border-stone-100">
                            <span className="text-sm font-medium text-stone-700 flex-1">{label}</span>
                            <select 
                              value={config.type} 
                              onChange={e => updateFreq('type', e.target.value)}
                              className="text-xs border border-stone-200 rounded px-2 py-1.5 bg-white outline-none"
                            >
                              <option value="percent">Kedvezmény (%)</option>
                              <option value="fixed">Fix ár (Ft/m²)</option>
                            </select>
                            <input 
                              type="number" 
                              value={config.value} 
                              onChange={e => updateFreq('value', Number(e.target.value))}
                              className="w-20 text-sm font-bold border border-stone-200 rounded px-3 py-1.5 outline-none text-right"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-stone-100 flex flex-col gap-2">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Magas fű szorzó (pl. 2 = dupla ár)</label>
                      <input type="number" step="0.1" value={calculatorSettings.multiplierHighGrass ?? 2}
                        onChange={(e) => handleCalculatorSettingChange('multiplierHighGrass', Number(e.target.value))}
                        className="w-full px-4 py-2 rounded-xl border border-stone-200 text-sm" />
                    </div>
                  </div>
                </div>

                {/* Kerekítés */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-4">
                  <h2 className="text-xl font-semibold text-stone-800 border-b border-stone-100 pb-4 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-emerald-600" /> Kerekítés Beállításai
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Nagyobb kerekítési küszöb (Ft)</label>
                      <p className="text-xs text-stone-500 mb-2">Ezen összeg felett vált a rendszer a nagyobb kerekítésre.</p>
                      <input type="number" step="5000" value={calculatorSettings.roundingThreshold ?? 50000}
                        onChange={(e) => handleCalculatorSettingChange('roundingThreshold', Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Kicsi lépés (Ft)</label>
                        <input type="number" step="100" value={calculatorSettings.roundingStepLow ?? 500}
                          onChange={(e) => handleCalculatorSettingChange('roundingStepLow', Number(e.target.value))}
                          className="w-full px-4 py-2 rounded-xl border border-stone-200 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Nagy lépés (Ft)</label>
                        <input type="number" step="100" value={calculatorSettings.roundingStepHigh ?? 1000}
                          onChange={(e) => handleCalculatorSettingChange('roundingStepHigh', Number(e.target.value))}
                          className="w-full px-4 py-2 rounded-xl border border-stone-200 text-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. KISZÁLLÁSI BEÁLLÍTÁSOK */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-6">
                <h2 className="text-xl font-semibold text-stone-800 border-b border-stone-100 pb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" /> Kiszállás és Távolság-zónák
                </h2>
                <div className="grid md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Ingyenes küszöb (km)</label>
                    <p className="text-[10px] text-stone-500 mb-2">Idáig semmit nem adunk a minimumhoz.</p>
                    <input type="number" min="0" value={calculatorSettings.distanceFreeKm ?? 0}
                      onChange={(e) => handleCalculatorSettingChange('distanceFreeKm', Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">1. Zóna vége (km)</label>
                    <p className="text-[10px] text-stone-500 mb-2">Amíg csak a minimum díj emelkedik.</p>
                    <input type="number" min="0" value={calculatorSettings.distanceLimit1 ?? 30}
                      onChange={(e) => handleCalculatorSettingChange('distanceLimit1', Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">1. Zóna díj (Ft/km)</label>
                    <p className="text-[10px] text-stone-500 mb-2">Mennyivel emelje a minimumot.</p>
                    <input type="number" min="0" value={calculatorSettings.distanceLimit1FeePerKm ?? 400}
                      onChange={(e) => handleCalculatorSettingChange('distanceLimit1FeePerKm', Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">2. Zóna díj (Ft/km)</label>
                    <p className="text-[10px] text-stone-500 mb-2">Fix felár az 1. Zóna vége felett.</p>
                    <input type="number" min="0" value={calculatorSettings.distanceLimit2FeePerKm ?? 300}
                      onChange={(e) => handleCalculatorSettingChange('distanceLimit2FeePerKm', Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm" />
                  </div>
                </div>
                <div className="pt-4 border-t border-stone-100">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={calculatorSettings.showDistanceFeeExplicitly ?? true}
                      onChange={(e) => handleCalculatorSettingChange('showDistanceFeeExplicitly', e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded" />
                    <span className="text-sm font-medium text-stone-700">Kiszállási felár részletezése az eredményben</span>
                  </label>
                </div>
              </div>

              {/* 5. MEGJELENÍTÉS */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-6">
                <h2 className="text-xl font-semibold text-stone-800 border-b border-stone-100 pb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-emerald-600" /> Megjelenítés és Ikonok
                </h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <p className="text-sm font-bold text-stone-500 mb-4 tracking-wider uppercase">Egységárak megjelenítése</p>
                    <div className="space-y-2">
                      {[
                        { key: 'traktor', label: 'Fűnyírás – traktor' },
                        { key: 'tologatos', label: 'Fűnyírás – tologatós' },
                        { key: 'kaszo', label: 'Fűkaszálás' },
                        { key: 'locsolas', label: 'Locsolás' },
                        { key: 'soveny', label: 'Sövénynyírás' },
                      ].map(item => {
                        const current = calculatorSettings.showUnitPricePerService ?? {};
                        const checked = current[item.key] ?? (item.key !== 'soveny');
                        return (
                          <label key={item.key} className="flex items-center gap-3 p-2 border border-stone-100 rounded-lg hover:bg-stone-50 cursor-pointer transition-colors">
                            <input type="checkbox" checked={checked}
                              onChange={(e) => {
                                const updated = { ...current, [item.key]: e.target.checked };
                                handleCalculatorSettingChange('showUnitPricePerService', updated);
                              }}
                              className="w-4 h-4 text-emerald-600 rounded" />
                            <span className="text-sm text-stone-700">{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-stone-500 mb-4 tracking-wider uppercase">Extrák</p>
                    <label className="flex items-center gap-3 p-3 border border-stone-200 rounded-xl hover:bg-stone-50 cursor-pointer transition-colors">
                      <input type="checkbox" checked={calculatorSettings.showDoubleCutText ?? true}
                        onChange={(e) => handleCalculatorSettingChange('showDoubleCutText', e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded" />
                      <div>
                        <span className="text-sm font-medium text-stone-700 block">Dupla vágás felirat</span>
                        <span className="text-xs text-stone-500">Magas fű jelzése.</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-stone-200 rounded-xl hover:bg-stone-50 cursor-pointer transition-colors">
                      <input type="checkbox" checked={calculatorSettings.showMap ?? false}
                        onChange={(e) => handleCalculatorSettingChange('showMap', e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded" />
                      <div>
                        <span className="text-sm font-medium text-stone-700 block">Térkép vizualizáció</span>
                        <span className="text-xs text-stone-500">Útvonal kirajzolása.</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'statistics' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <StatisticsDashboard quotes={quotes} analytics={analytics} dailyStats={dailyStats} />
            </motion.div>
          )}
        </div>
      </main>

      <ImageCropperModal
        isOpen={modalOpen}
        imageSrc={imageSrc}
        onClose={() => {
          setModalOpen(false);
          setImageSrc(null);
          setActiveServiceId(null);
        }}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
