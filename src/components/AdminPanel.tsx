import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { SiteSettings, defaultSettings } from '../types';
import { Save, LogOut, Settings, Eye, EyeOff } from 'lucide-react';

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadSettings();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'settings', 'main');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data() as SiteSettings);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);
      setMessage("Bejelentkezési hiba.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await setDoc(doc(db, 'settings', 'main'), settings);
      setMessage('Beállítások sikeresen mentve!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage('Hiba történt a mentés során. Nincs jogosultságod?');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
        <div className="text-white text-xl">Betöltés...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto">
      <div className="min-h-screen p-4 sm:p-8">
        <div className="max-w-4xl mx-auto bg-stone-900 rounded-2xl shadow-2xl overflow-hidden border border-stone-800">
          
          {/* Header */}
          <div className="bg-stone-950 px-6 py-4 flex items-center justify-between border-b border-stone-800">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-emerald-500" />
              <h2 className="text-xl font-bold text-white">Adminisztrációs Felület</h2>
            </div>
            <button 
              onClick={onClose}
              className="text-stone-400 hover:text-white transition-colors"
            >
              Bezárás
            </button>
          </div>

          <div className="p-6">
            {!user ? (
              <div className="text-center py-12">
                <p className="text-stone-400 mb-6">Jelentkezz be a tartalom szerkesztéséhez.</p>
                <button
                  onClick={handleLogin}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Bejelentkezés Google fiókkal
                </button>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-8">
                
                {/* User Info & Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-stone-800/50 p-4 rounded-xl">
                  <div className="text-stone-300">
                    Bejelentkezve mint: <span className="font-medium text-white">{user.email}</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Kijelentkezés
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Mentés...' : 'Mentés'}
                    </button>
                  </div>
                </div>

                {message && (
                  <div className={`p-4 rounded-lg ${message.includes('Hiba') ? 'bg-red-900/50 text-red-200' : 'bg-emerald-900/50 text-emerald-200'}`}>
                    {message}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Toggles */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-white border-b border-stone-800 pb-2">Szekciók megjelenítése</h3>
                    
                    {[
                      { id: 'showHero', label: 'Főoldal (Hero)' },
                      { id: 'showAbout', label: 'Rólunk' },
                      { id: 'showServices', label: 'Szolgáltatások' },
                      { id: 'showGallery', label: 'Galéria' },
                      { id: 'showContact', label: 'Kapcsolat / Árajánlat' },
                    ].map((toggle) => (
                      <label key={toggle.id} className="flex items-center justify-between p-3 bg-stone-800/30 rounded-lg cursor-pointer hover:bg-stone-800/50 transition-colors">
                        <span className="text-stone-300">{toggle.label}</span>
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            name={toggle.id}
                            checked={settings[toggle.id as keyof SiteSettings] as boolean}
                            onChange={handleChange}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Right Column: Text Content */}
                  <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-lg font-semibold text-white border-b border-stone-800 pb-2">Szöveges tartalmak</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-400 mb-1">Főcím (Hero)</label>
                        <input
                          type="text"
                          name="heroTitle"
                          value={settings.heroTitle}
                          onChange={handleChange}
                          className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-stone-400 mb-1">Alcím (Hero)</label>
                        <textarea
                          name="heroSubtitle"
                          value={settings.heroSubtitle}
                          onChange={handleChange}
                          rows={2}
                          className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-stone-400 mb-1">Rólunk szöveg</label>
                        <textarea
                          name="aboutText"
                          value={settings.aboutText}
                          onChange={handleChange}
                          rows={4}
                          className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-stone-400 mb-1">Szolgáltatások bevezető</label>
                        <textarea
                          name="servicesText"
                          value={settings.servicesText}
                          onChange={handleChange}
                          rows={3}
                          className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-stone-400 mb-1">E-mail cím</label>
                          <input
                            type="email"
                            name="contactEmail"
                            value={settings.contactEmail}
                            onChange={handleChange}
                            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-stone-400 mb-1">Telefonszám</label>
                          <input
                            type="text"
                            name="contactPhone"
                            value={settings.contactPhone}
                            onChange={handleChange}
                            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-stone-400 mb-1">Fő szín (Hex kód)</label>
                        <div className="flex gap-4">
                          <input
                            type="color"
                            name="primaryColor"
                            value={settings.primaryColor}
                            onChange={handleChange}
                            className="h-10 w-20 bg-stone-800 border border-stone-700 rounded-lg cursor-pointer"
                          />
                          <input
                            type="text"
                            name="primaryColor"
                            value={settings.primaryColor}
                            onChange={handleChange}
                            className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none uppercase font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
