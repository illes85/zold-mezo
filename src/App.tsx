import { motion, AnimatePresence } from 'motion/react';
import {
  Leaf,
  Scissors,
  Axe,
  TreePine,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Clock,
  Shield,
  ChevronRight,
  Menu,
  X,
  ArrowUp,
  Tractor,
  Droplets,
  UploadCloud,
  Cookie
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from './firebase';
import { doc, onSnapshot, collection, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import PriceCalculator from './components/PriceCalculator';
import { CalculatorDetails, SiteSettings } from './types';

// Map icon names to components
const iconMap: Record<string, any> = {
  Leaf: <Leaf className="w-8 h-8 text-emerald-500" />,
  Scissors: <Scissors className="w-8 h-8 text-emerald-500" />,
  Axe: <Axe className="w-8 h-8 text-emerald-500" />,
  TreePine: <TreePine className="w-8 h-8 text-emerald-500" />,
  Tractor: <Tractor className="w-8 h-8 text-emerald-500" />,
  Droplets: <Droplets className="w-8 h-8 text-emerald-500" />
};

import { trackEvent } from './services/AnalyticsService';

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Dynamic data states
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Track page view
  useEffect(() => {
    trackEvent('page_view');
  }, []);

  // Calculator state
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [calculatorDetails, setCalculatorDetails] = useState<CalculatorDetails | null>(null);

  // Contact form state
  const [contactMessage, setContactMessage] = useState('');
  const [contactService, setContactService] = useState('');
  const [userEditedMessage, setUserEditedMessage] = useState(false);
  const [selectedServiceLabel, setSelectedServiceLabel] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [showEmailWarning, setShowEmailWarning] = useState(false);
  const [preferredDays, setPreferredDays] = useState<string[]>(['a hét bármely napján']);

  // Cookie banner state
  const [showCookieBanner, setShowCookieBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      const timer = setTimeout(() => {
        setShowCookieBanner(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptCookies = () => {
    localStorage.setItem('cookieConsent', 'true');
    setShowCookieBanner(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Fetch site settings
    const settingsUnsubscribe = onSnapshot(doc(db, 'settings', 'site'), (docSnap) => {
      if (docSnap.exists()) {
        setSiteSettings(docSnap.data() as SiteSettings);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/site');
      setLoading(false);
    });

    // Fetch active services
    const q = query(collection(db, 'services'), orderBy('order'));
    const servicesUnsubscribe = onSnapshot(q, (querySnapshot) => {
      const servicesData: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isActive) {
          servicesData.push({ id: doc.id, ...data });
        }
      });
      setServices(servicesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'services');
    });

    return () => {
      settingsUnsubscribe();
      servicesUnsubscribe();
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCalculate = (price: number | null, details: CalculatorDetails) => {
    setCalculatedPrice(price);
    setCalculatorDetails(details);

    // Üzenet automatikus generálása ha nem szerkesztette kézzel
    if (!userEditedMessage && price !== null) {
      const getFrequencyLabel = (f: string) => {
        if (f === 'egyszeri') return 'Egyszeri alkalom';
        if (f === 'havi_egy') return 'Havi 1 alkalom';
        if (f === 'havi_tobb') return 'Havi többszöri alkalom';
        return f;
      };

      let message = `Tisztelt Zöld-Mező!\n\nAjánlatot szeretnék kérni az alábbi szolgáltatásra:\n`;
      message += `- Szolgáltatás: ${selectedServiceLabel || details.serviceType}\n`;

      if (details.areaSize) message += `- Terület: ${details.areaSize} m²\n`;
      if (details.hedgeLength) message += `- Sövény hossza: ${details.hedgeLength} fm\n`;
      if (details.wateringCount) message += `- Fák száma: ${details.wateringCount} db\n`;
      if (details.wateringArea) message += `- Locsolandó terület: ${details.wateringArea} m²\n`;

      message += `- Gyakoriság: ${getFrequencyLabel(details.frequency)}\n`;

      const locationText = details.location === 'fot_kozel' ? 'Fót és környéke' : `Fóttól távolabb (${details.distance} km)`;
      message += `- Helyszín: ${details.settlement ? details.settlement + ' (' + locationText + ')' : locationText}\n`;

      message += `\nBecsült ár: ${price.toLocaleString('hu-HU')} Ft\n`;
      message += `\nKérem, vegyék fel velem a kapcsolatot a további egyeztetés céljából!`;

      setContactMessage(message);
    }
  };

  const handleServiceLabelChange = (label: string) => {
    setSelectedServiceLabel(label);

    // Keressük meg a szolgáltatást a listából
    let matched = services.find(s => s.title === label);

    // Ha "Fűvágás" jön a kalkulátorból, de nincs ilyen nevű szolgáltatás, 
    // próbáljuk megkeresni az első olyat, ami fűvel kapcsolatos (fűnyírás, stb)
    if (!matched && (label === 'Fűvágás' || label.toLowerCase().includes('fű'))) {
      matched = services.find(s =>
        s.title.toLowerCase().includes('fűnyírás') ||
        s.title.toLowerCase().includes('traktor') ||
        s.title.toLowerCase().includes('tologat')
      );
    }

    if (matched) setContactService(matched.id);

    // Üzenet automatikus frissítése ha nem szerkesztette kézzel
    if (!userEditedMessage) {
      setContactMessage(`Érdeklődöm a(z) ${label} szolgáltatással kapcsolatban.`);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (selectedImages.length + newFiles.length > 10) {
        alert("Maximum 10 képet tölthet fel!");
        return;
      }
      setSelectedImages(prev => [...prev, ...newFiles]);
    }
    // Reset input to allow selecting same file again
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleDay = (day: string) => {
    if (day === 'a hét bármely napján') {
      setPreferredDays(['a hét bármely napján']);
    } else {
      setPreferredDays(prev => {
        const withoutAny = prev.filter(d => d !== 'a hét bármely napján');
        if (withoutAny.includes(day)) {
          const next = withoutAny.filter(d => d !== day);
          return next.length === 0 ? ['a hét bármely napján'] : next;
        } else {
          return [...withoutAny, day];
        }
      });
    }
  };

  const handleSubmitQuote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!customerEmail && !showEmailWarning) {
      setShowEmailWarning(true);
      return;
    }

    setShowEmailWarning(false);
    setIsSubmitting(true);
    setSubmissionStatus('idle');

    try {
      const quoteId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const imageUrls: any[] = [];

      // 1. Upload images via PHP if any
      for (const file of selectedImages) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', `quotes/${quoteId}/before`);

        const response = await fetch('/upload.php', {
          method: 'POST',
          body: formData
        });

        const text = await response.text();
        let result;
        try {
          result = JSON.parse(text);
        } catch (e) {
          console.warn("PHP response is not valid JSON. Likely running in Dev mode without PHP support.", text);
          if (import.meta.env.DEV) {
            // Mock success in dev mode
            result = { success: true, url: URL.createObjectURL(file) };
          } else {
            throw new Error('Érvénytelen válasz a szervertől a képfeltöltés során.');
          }
        }

        if (result.success) {
          imageUrls.push({
            url: result.url,
            type: 'before',
            uploadedAt: new Date()
          });
        } else {
          throw new Error(result.error || 'Fájlfeltöltési hiba');
        }
      }

      // 2. Save to Firestore
      const quoteData = {
        id: quoteId,
        customerName,
        customerPhone,
        customerEmail,
        serviceType: selectedServiceLabel || calculatorDetails?.serviceType || 'Általános érdeklődés',
        calculatedPrice: calculatedPrice,
        details: calculatorDetails,
        message: contactMessage,
        status: 'pending',
        images: imageUrls,
        preferredDays: preferredDays,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'quotes'), quoteData);
      
      // Track analytics
      trackEvent('form_submit', { quoteId: quoteId, serviceType: quoteData.serviceType });

      // 3. Notify provider via mail.php
      try {
        const mailResponse = await fetch('/mail.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_quote',
            quoteId: quoteId,
            customerName,
            customerPhone,
            customerEmail,
            serviceType: quoteData.serviceType,
            price: calculatedPrice,
            preferredDays: preferredDays.join(', '),
            secondaryEmail: siteSettings?.secondaryContactEmail
          })
        });
        
        // Handle potential non-json response in dev
        const mailText = await mailResponse.text();
        try {
          JSON.parse(mailText);
        } catch(e) {
          console.warn("Mail PHP response is not JSON (likely dev mode).", mailText);
        }
      } catch (err) {
        console.error("Email notification failed", err);
      }

      setSubmissionStatus('success');
      setSelectedImages([]);
      setContactMessage('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
    } catch (error) {
      console.error("Error submitting quote:", error);
      setSubmissionStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50">Betöltés...</div>;
  }

  // Fallback settings if not loaded
  const settings = siteSettings || {
    showHero: true,
    showAbout: true,
    showFeatures: true,
    showServices: true,
    showGallery: true,
    showContact: true,
    heroTitle: "Professzionális Zöldterület Kezelés",
    heroSubtitle: "Ipari fűnyírás professzionális Toro fűnyíró traktorral, fűnyírás tologatós fűnyíróval kisebb - tagoltabb területeken és facsemeték, díszkertek locsolása. Megbízható gépparkkal, precíz munkavégzéssel állunk rendelkezésére cégek és magánszemélyek részére egyaránt.",
    aboutText: "",
    servicesText: "",
    contactEmail: "info@zold-mezo.hu",
    contactPhone: "",
    primaryColor: "emerald-600",
    sections: []
  } as SiteSettings;

  const features = [
    {
      title: 'Professzionális Géppark',
      description: 'Kizárólag ipari teljesítményű, megbízható gépekkel dolgozunk a tökéletes eredményért.',
      icon: <Shield className="w-6 h-6 text-emerald-600" />
    },
    {
      title: 'Precíz Munkavégzés',
      description: 'Minden munkát úgy adunk át, mintha a saját kertünkben dolgoztunk volna.',
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />
    },
    {
      title: 'Pontos Határidők',
      description: 'Az előre megbeszélt időpontokat, árajánlatokat és határidőket - amennyiben az időjárás is engedi - szigorúan betartjuk.',
      icon: <Clock className="w-6 h-6 text-emerald-600" />
    }
  ];

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 selection:bg-emerald-500 selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-24">
            <div
              className="flex items-center cursor-pointer transition-transform hover:scale-105"
              onClick={scrollToTop}
            >
              <img
                src="/logo.png"
                alt="A ZÖLDMEZŐ Logo"
                className="h-24 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {settings.showServices && <a href="#szolgaltatasok" className="text-sm font-medium text-stone-600 hover:text-emerald-600 transition-colors">Szolgáltatások</a>}
              {settings.showFeatures && <a href="#rolunk" className="text-sm font-medium text-stone-600 hover:text-emerald-600 transition-colors">Rólunk</a>}
              {settings.showContact && <a href="#kapcsolat" className="text-sm font-medium text-stone-600 hover:text-emerald-600 transition-colors">Kapcsolat</a>}
              <a href="#kapcsolat" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-md hover:shadow-lg">
                Árajánlatot kérek
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-stone-600"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-white border-b border-stone-200 px-4 py-4 space-y-4"
          >
            {settings.showServices && <a href="#szolgaltatasok" onClick={() => setIsMenuOpen(false)} className="block text-base font-medium text-stone-600">Szolgáltatások</a>}
            {settings.showFeatures && <a href="#rolunk" onClick={() => setIsMenuOpen(false)} className="block text-base font-medium text-stone-600">Rólunk</a>}
            {settings.showContact && <a href="#kapcsolat" onClick={() => setIsMenuOpen(false)} className="block text-base font-medium text-stone-600">Kapcsolat</a>}
            <a href="#kapcsolat" onClick={() => setIsMenuOpen(false)} className="block w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl text-base font-bold transition-colors">
              Árajánlatot kérek
            </a>
          </motion.div>
        )}
      </nav>

      {/* Dynamic Sections */}
      {(settings.sections || [
        { id: 'hero', type: 'hero', isVisible: settings.showHero !== false },
        { id: 'services', type: 'services', isVisible: settings.showServices !== false },
        { id: 'features', type: 'features', isVisible: settings.showFeatures !== false },
        { id: 'contact', type: 'contact', isVisible: settings.showContact !== false }
      ]).map((section: any, idx: number) => {
        if (!section.isVisible) return null;

        switch (section.type) {
          case 'hero':
            return (
              <section key={section.id} className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                <div className="absolute inset-0 z-0">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    poster="/hero-poster.jpg"
                  >
                    <source src="/hero-video.mp4" type="video/mp4" />
                    {/* Fallback image if video fails to load */}
                    <img
                      src="/hero-poster.jpg"
                      alt="Zöldterület"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </video>
                  <div className="absolute inset-0 bg-stone-900/40 mix-blend-multiply"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-900/50 to-transparent"></div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="max-w-3xl"
                  >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-medium mb-6 backdrop-blur-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Kapacitás elérhető a szezonra
                    </div>
                    <h1 className="font-display text-5xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight mb-6" dangerouslySetInnerHTML={{ __html: settings.heroTitle || 'Professzionális <br /><span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Zöldterület Kezelés</span>' }}>
                    </h1>
                    <p className="text-lg lg:text-xl text-stone-300 mb-10 max-w-2xl leading-relaxed">
                      {settings.heroSubtitle}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <a href="#kapcsolat" className="inline-flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40 hover:-translate-y-1">
                        Ingyenes felmérés kérése
                        <ChevronRight className="w-6 h-6" />
                      </a>
                      <a href="#szolgaltatasok" className="inline-flex justify-center items-center gap-2 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 px-8 py-4 rounded-full text-lg font-bold transition-all hover:-translate-y-1">
                        Szolgáltatásaink
                      </a>
                    </div>
                  </motion.div>
                </div>
              </section>
            );

          case 'services':
            return (
              <section id="szolgaltatasok" key={section.id} className="py-24 bg-stone-950 text-white relative overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                    <div className="max-w-2xl">
                      <span className="text-emerald-400 font-semibold tracking-wider uppercase text-sm mb-2 block">Szolgáltatásaink</span>
                      <h2 className="font-display text-3xl md:text-5xl font-bold text-white">Miben tudunk segíteni?</h2>
                    </div>
                    <a href="#kapcsolat" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                      Kérjen egyedi ajánlatot <ChevronRight className="w-4 h-4" />
                    </a>
                  </div>

                  {settings.servicesLayout === 'list' ? (
                    <div className="space-y-16 lg:space-y-24">
                      {services.map((service, index) => {
                        const isLeft = settings.servicesListStartSide === 'right' ? index % 2 !== 0 : index % 2 === 0;
                        const displayImage = (service.title || '').toLowerCase().includes('locsol') && (!service.image || service.image.includes('picsum')) ? '/locsolas.jpg' : service.image;
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className={`flex flex-col ${isLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-10 lg:gap-20 items-center`}
                          >
                            <div className="w-full lg:w-1/2">
                              <div className="relative rounded-[2.5rem] overflow-hidden border border-stone-800 group shadow-2xl">
                                <div className="absolute inset-0 bg-emerald-500/10 group-hover:bg-transparent transition-colors z-10"></div>
                                <img
                                  src={displayImage}
                                  alt={service.title}
                                  className="w-full h-[400px] md:h-[500px] lg:h-[600px] object-cover transform group-hover:scale-105 transition-transform duration-700"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            </div>
                            <div className="w-full lg:w-1/2 space-y-8">
                              <div className="flex items-center gap-6">
                                <div className="w-24 h-24 bg-stone-900 rounded-[2rem] flex items-center justify-center border border-stone-800 shadow-xl overflow-hidden shrink-0">
                                  {service.iconUrl ? (
                                    <img src={service.iconUrl} alt={service.title} className="w-16 h-16 object-contain icon-emerald" />
                                  ) : (
                                    <div className="text-emerald-500 scale-150">
                                      {iconMap[service.iconName] || <Leaf className="w-10 h-10" />}
                                    </div>
                                  )}
                                </div>
                                <h3 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">{service.title}</h3>
                              </div>
                              <div className="text-stone-400 text-xl md:text-2xl leading-relaxed prose-stone prose-invert max-w-none [&>p]:mb-4 [&>ul]:list-disc [&>ul]:ml-6 [&>ol]:list-decimal [&>ol]:ml-6 [&>ul>li]:mb-1 [&>ol>li]:mb-1 [&_strong]:text-white [&_em]:text-emerald-400 overflow-hidden" dangerouslySetInnerHTML={{ __html: (service.description || '').replace(/&nbsp;/g, ' ') }} />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
                      {services.map((service, index) => {
                        const displayImage = (service.title || '').toLowerCase().includes('locsol') && (!service.image || service.image.includes('picsum')) ? '/locsolas.jpg' : service.image;
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="group relative bg-stone-900 rounded-3xl overflow-hidden border border-stone-800 hover:border-emerald-500/30 transition-colors"
                          >
                            <div className="aspect-video w-full overflow-hidden relative">
                              <div className="absolute inset-0 bg-stone-900/20 group-hover:bg-transparent transition-colors z-10"></div>
                              <img
                                src={displayImage}
                                alt={service.title}
                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="p-8 relative z-20 bg-stone-900">
                              <div className="absolute -top-12 right-8 w-20 h-20 bg-stone-900 rounded-2xl flex items-center justify-center border border-stone-800 shadow-xl transform -rotate-3 group-hover:rotate-0 transition-transform overflow-hidden">
                                {service.iconUrl ? (
                                  <img src={service.iconUrl} alt={service.title} className="w-14 h-14 object-contain icon-emerald" />
                                ) : (
                                  <div className="text-emerald-500 scale-125">
                                    {iconMap[service.iconName] || <Leaf className="w-8 h-8" />}
                                  </div>
                                )}
                              </div>
                              <h3 className="font-display text-2xl font-bold text-white mb-3">{service.title}</h3>
                              <div className="text-stone-400 leading-relaxed prose-stone prose-invert max-w-none [&>p]:mb-3 [&>ul]:list-disc [&>ul]:ml-5 [&>ol]:list-decimal [&>ol]:ml-5 [&>ul>li]:mb-1 [&>ol>li]:mb-1 [&_strong]:text-white [&_em]:text-emerald-400 overflow-hidden" dangerouslySetInnerHTML={{ __html: (service.description || '').replace(/&nbsp;/g, ' ') }} />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            );

          case 'features':
            return (
              <section id="rolunk" key={section.id} className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="font-display text-3xl md:text-4xl font-bold text-stone-900 mb-4">Miért minket válasszon?</h2>
                    <p className="text-stone-600 text-lg">Mert nem csak végigszaladunk a területen. A Zöldmezőnél a nyers erőt a gondoskodással ötvözzük, hogy levegyük a zöldterület-kezelés terhét a válláról. Nagy teljesítményű traktorunkkal gyorsan és hatékonyan tesszük rendbe a kiterjedt területeket, míg a kényesebb, szűkebb részeken precíz, kézi fűnyírást alkalmazunk. Emellett tudjuk, hogy egy aszályos időszakban a vágás nem elég: vállaljuk facsemeték és díszkertek rendszeres, szakszerű öntözését is. Vágunk és életben tartunk – Önnek pedig nincs más dolga, mint élvezni a rendezett környezetet.</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-stone-50 rounded-2xl p-8 border border-stone-100 hover:border-emerald-100 hover:shadow-lg hover:shadow-emerald-900/5 transition-all"
                      >
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6">
                          {feature.icon}
                        </div>
                        <h3 className="font-display text-xl font-bold text-stone-900 mb-3">{feature.title}</h3>
                        <p className="text-stone-600 leading-relaxed">{feature.description}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>
            );

          case 'contact':
            return (
              <section id="kapcsolat" key={section.id} className="py-24 bg-emerald-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/pattern/1920/1080')] opacity-10 mix-blend-overlay object-cover"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                  <div className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">

                    {/* Contact Info */}
                    <div className="bg-stone-950 text-white p-6 sm:p-10 lg:p-16 lg:w-2/5 flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>

                      <div className="relative z-10">
                        <h3 className="font-display text-3xl font-bold mb-2">Lépjen velünk kapcsolatba!</h3>
                        <p className="text-stone-400 mb-12">Kérjen ingyenes helyszíni felmérést és árajánlatot. 24 órán belül válaszolunk megkeresésére.</p>

                        <div className="space-y-8">
                          <div className="flex items-start gap-4">
                            <div className="bg-stone-800 p-3 rounded-full text-emerald-400">
                              <Phone className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-sm text-stone-400 mb-1">Telefonszám</p>
                              <a href="tel:+36202090955" className="font-medium text-lg hover:text-emerald-400 transition-colors">+36 20 20 90 955</a>
                            </div>
                          </div>

                          <div className="flex items-start gap-4">
                            <div className="bg-stone-800 p-3 rounded-full text-emerald-400">
                              <Mail className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-sm text-stone-400 mb-1">E-mail cím</p>
                              <a href="mailto:info@zold-mezo.hu" className="font-medium text-lg hover:text-emerald-400 transition-colors">info@zold-mezo.hu</a>
                            </div>
                          </div>

                          <div className="flex items-start gap-4">
                            <div className="bg-stone-800 p-3 rounded-full text-emerald-400">
                              <MapPin className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-sm text-stone-400 mb-1">Kiszállási terület</p>
                              <p className="font-medium text-lg">Országos</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Form & Calculator */}
                    <div className="p-4 sm:p-10 lg:p-16 lg:w-3/5 bg-white">
                      <div className="mb-10">
                        <h2 className="font-display text-3xl font-bold text-stone-900 mb-4">Árkalkulátor és Árajánlatkérés</h2>
                        <p className="text-stone-600 text-lg">
                          Számolja ki hozzávetőleges díjunkat, majd küldje el ajánlatkérését egyetlen lépésben! A kalkulált ár tájékoztató jellegű, a végleges árajánlatot minden esetben helyszíni szemle után adjuk meg.
                        </p>
                      </div>

                      <div className="bg-stone-50 p-4 sm:p-8 rounded-2xl border-stone-200 sm:border">
                        <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
                          <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                          Kalkuláció
                        </h3>
                        <PriceCalculator
                          onCalculate={handleCalculate}
                          onServiceChange={handleServiceLabelChange}
                          activeServices={services}
                        />

                        <hr className="border-stone-200 my-8" />

                        <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
                          <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                          Személyes adatok
                        </h3>
                        <form className="space-y-6" onSubmit={handleSubmitQuote}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-2">Név / Cégnév</label>
                              <input
                                type="text"
                                id="name"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white text-stone-900"
                                placeholder="Kovács János"
                                required
                              />
                            </div>
                            <div>
                              <label htmlFor="phone" className="block text-sm font-medium text-stone-700 mb-2">Telefonszám</label>
                              <input
                                type="tel"
                                id="phone"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white text-stone-900"
                                placeholder="+36 30 000 0000"
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-6">
                            <div>
                              <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-2">E-mail cím (opcionális)</label>
                              <input
                                type="email"
                                id="email"
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white text-stone-900"
                                placeholder="pelda@email.hu"
                              />
                              <p className="text-[10px] text-stone-500 mt-2 italic flex items-center gap-1">
                                <Mail className="w-3 h-3 text-emerald-600" /> Tipp: Adj meg egy email címet, hogy elküldhessük a kész munkáról készült Before-After fotókat és a számlát!
                              </p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <label className="block text-sm font-medium text-stone-700">A hét mely napján felelne meg a munka?</label>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => toggleDay('a hét bármely napján')}
                                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${preferredDays.includes('a hét bármely napján')
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'bg-white border-stone-200 text-stone-600 hover:border-emerald-300'
                                  }`}
                              >
                                A hét bármely napján
                              </button>
                              {['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'].map(day => (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => toggleDay(day)}
                                  className={`w-10 h-10 rounded-xl border text-sm font-medium transition-all flex items-center justify-center ${preferredDays.includes(day)
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'bg-white border-stone-200 text-stone-600 hover:border-emerald-300'
                                    }`}
                                >
                                  {day}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-stone-700 mb-2">Fotók csatolása (opcionális, max 10 db)</label>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                              {selectedImages.map((file, idx) => (
                                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt="preview"
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                              {selectedImages.length < 10 && (
                                <label className="aspect-square rounded-lg border-2 border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-400 hover:border-emerald-400 hover:text-emerald-500 cursor-pointer transition-all">
                                  <UploadCloud className="w-6 h-6" />
                                  <span className="text-[10px] mt-1 font-medium">Feltöltés</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    multiple
                                    onChange={handleImageSelect}
                                  />
                                </label>
                              )}
                            </div>
                            <p className="text-[10px] text-stone-500 italic">Tipp: Fotózd le a munkaterületet, hogy pontosabb becslést adhassunk!</p>
                          </div>

                          <div>
                            <label htmlFor="service" className="block text-sm font-medium text-stone-700 mb-2">Érdeklődött szolgáltatás</label>
                            <select
                              id="service"
                              value={contactService}
                              onChange={(e) => setContactService(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white text-stone-900"
                            >
                              <option value="">Válasszon szolgáltatást...</option>
                              {services.map(s => (
                                <option key={s.id} value={s.id}>{s.title}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label htmlFor="message" className="block text-sm font-medium text-stone-700 mb-2">Üzenet, egyedi igények</label>
                            <textarea
                              id="message"
                              rows={4}
                              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white resize-none text-stone-900"
                              placeholder="Kérem írja le röviden a feladatot..."
                              value={contactMessage}
                              onChange={(e) => {
                                setContactMessage(e.target.value);
                                setUserEditedMessage(true);
                              }}
                            ></textarea>
                          </div>

                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-xl transition-colors shadow-lg shadow-emerald-600/30 disabled:opacity-50 flex items-center justify-center gap-3"
                          >
                            {isSubmitting ? (
                              <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Küldés folyamatban...
                              </>
                            ) : 'Ajánlatkérés elküldése'}
                          </button>

                          {submissionStatus === 'success' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-sm text-center">
                              Sikeresen megkaptuk az ajánlatkérésedet! Hamarosan keresni fogunk a megadott elérhetőségeken.
                            </motion.div>
                          )}
                          {submissionStatus === 'error' && (
                            <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm text-center">
                              Hiba történt a küldés során. Kérjük próbáld meg később vagy keress minket telefonon!
                            </div>
                          )}
                          <p className="text-xs text-stone-600 text-center mt-4">
                            Az űrlap elküldésével elfogadja az <Link to="/adatkezeles" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">adatkezelési tájékoztatót</Link>.
                          </p>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );

          case 'custom':
            return (
              <section
                key={section.id}
                className={`py-20 ${section.bgColor || 'bg-white'} ${section.textColor || 'text-stone-900'}`}
              >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  {section.title && (
                    <div className="text-center max-w-2xl mx-auto mb-12">
                      <h2 className="font-display text-3xl md:text-4xl font-bold">{section.title}</h2>
                    </div>
                  )}
                  <div className="prose prose-lg max-w-4xl mx-auto text-inherit opacity-90" style={{ whiteSpace: 'pre-line' }}>
                    {section.content}
                  </div>
                </div>
              </section>
            );

          default:
            return null;
        }
      })}

      {/* Footer */}
      <footer className="bg-stone-950 py-12 border-t border-stone-900 text-stone-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div
            className="flex items-center cursor-pointer transition-transform hover:scale-105"
            onClick={scrollToTop}
          >
            <img
              src="/logo.png"
              alt="ZÖLDMEZŐ Logo"
              className="h-20 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="text-sm text-center md:text-left">
            &copy; {new Date().getFullYear()} ZÖLDMEZŐ - Ipari fűnyírás és területgondozás. Minden jog fenntartva.
          </div>

          <div className="flex flex-wrap gap-4 md:gap-6 text-sm justify-center md:justify-end mt-4 md:mt-0">
            <Link to="/adatkezeles" className="hover:text-white transition-colors">Adatkezelési tájékoztató</Link>
            <Link to="/aszf" className="hover:text-white transition-colors">ÁSZF</Link>
            <Link to="/impresszum" className="hover:text-white transition-colors">Impresszum</Link>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {showEmailWarning && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden border border-stone-100"
            >
              <div className="bg-amber-50 p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-amber-100 relative z-10">
                  <Mail className="w-10 h-10 text-amber-500" />
                </div>
                <h3 className="font-display text-2xl font-bold text-stone-900 mb-3 relative z-10">Biztosan email cím nélkül küldi el?</h3>
                <p className="text-stone-600 leading-relaxed text-sm relative z-10">
                  Email cím megadásával tudunk küldeni Önnek egy professzionális **"Előtte-Utána" összefoglalót** a kész munkáról, valamint a **hivatalos számlát** is ezen keresztül juttatjuk el.
                </p>
              </div>
              <div className="p-8 flex flex-col gap-3">
                <button
                  onClick={() => setShowEmailWarning(false)}
                  className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
                >
                  Vissza, megadom az emailt
                </button>
                <button
                  onClick={() => handleSubmitQuote()}
                  className="w-full bg-stone-100 text-stone-600 font-bold py-4 rounded-xl hover:bg-stone-200 transition-colors"
                >
                  Küldés email nélkül
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showCookieBanner && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-[90] bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-stone-200/80 flex flex-col gap-4"
          >
            <div className="flex gap-4 items-start">
              <div className="bg-emerald-50 p-2.5 rounded-xl shrink-0 text-emerald-600">
                <Cookie className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-bold text-stone-900 text-base">Sütik (cookie) használata</h4>
                <p className="text-stone-600 text-xs leading-relaxed">
                  Weboldalunk sütiket használ a jobb felhasználói élmény biztosítása és látogatottsági statisztikák gyűjtése céljából. Az oldal további böngészésével hozzájárul a sütik használatához.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <Link 
                to="/adatkezeles" 
                className="text-stone-500 hover:text-stone-800 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
              >
                Tájékoztató
              </Link>
              <button
                onClick={handleAcceptCookies}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
              >
                Elfogadom
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll to Top Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: showScrollTop ? 1 : 0, scale: showScrollTop ? 1 : 0.8 }}
        transition={{ duration: 0.2 }}
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 z-50 p-3 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 hover:shadow-xl transition-all ${showScrollTop ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-label="Ugrás az oldal tetejére"
      >
        <ArrowUp className="w-6 h-6" />
      </motion.button>
    </div>
  );
}
