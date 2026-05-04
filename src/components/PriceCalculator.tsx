import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Trees, Sprout, Scissors, Droplets, MapPin, Calculator as CalcIcon, HardHat, Car, Check, ChevronRight, CheckCircle2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { CalculatorSettings, defaultCalculatorSettings } from '../types';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import { trackEvent } from '../services/AnalyticsService';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapFocus({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

// OSRM Base URL & Fót Base Coordinates (approx: Fót, Ibolya utca)
const FOT_LON = 19.1914;
const FOT_LAT = 47.6133;

function unitLabel(serviceType: string, wateringType: string): string {
  switch (serviceType) {
    case 'funyiras':
    case 'kaszo':
      return 'Ft/m²';
    case 'locsolas':
      return wateringType === 'fak' ? 'Ft/fa' : 'Ft/m²';
    case 'soveny':
      return 'Ft/fm';
    default:
      return 'Ft/m²';
  }
}

interface CalculatorProps {
  onCalculate: (price: number | null, details: any) => void;
  onServiceChange?: (serviceLabel: string) => void;
  activeServices?: any[];
}

export default function PriceCalculator({ onCalculate, onServiceChange, activeServices = [] }: CalculatorProps) {
  const [settings, setSettings] = useState<CalculatorSettings>(defaultCalculatorSettings);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'calculator'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings({ ...defaultCalculatorSettings, ...docSnap.data() });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/calculator');
    });
    return () => unsubscribe();
  }, []);

  // Szolgáltatás kiválasztás
  const availableServices = useMemo(() => {
    const opts = [];
    const titles = activeServices.map(s => (s.title || '').toLowerCase());
    const hasFunyiras = titles.some(t => t.includes('fűnyírás') || t.includes('traktor') || t.includes('tologat'));
    const hasKaszo = titles.some(t => t.includes('kasz') || t.includes('bozót'));
    const hasSoveny = titles.some(t => t.includes('sövény'));
    const hasLocsolas = titles.some(t => t.includes('locsol') || t.includes('öntöz'));

    // Ha semmi nincs aktiválva, defaultokat használunk
    if (activeServices.length === 0 || hasFunyiras || hasKaszo) {
      const s = activeServices.find(s => (s.title || '').toLowerCase().includes('fűvágás') || (s.title || '').toLowerCase().includes('traktor') || (s.title || '').toLowerCase().includes('tologat'));
      opts.push({
        id: 'fuvagas',
        label: 'Fűvágás',
        icon: s?.iconUrl ? <img src={s.iconUrl} className="w-14 h-14 object-contain" alt="" /> : <Sprout className="w-10 h-10" />
      });
    }
    if (activeServices.length === 0 || hasLocsolas) {
      const s = activeServices.find(s => (s.title || '').toLowerCase().includes('locsol') || (s.title || '').toLowerCase().includes('öntöz'));
      opts.push({
        id: 'locsolas',
        label: 'Locsolás (hamarosan)',
        icon: s?.iconUrl ? <img src={s.iconUrl} className="w-14 h-14 object-contain" alt="" /> : <Droplets className="w-10 h-10" />
      });
    }
    if (activeServices.length === 0 || hasSoveny) {
      const s = activeServices.find(s => (s.title || '').toLowerCase().includes('sövény'));
      opts.push({
        id: 'soveny',
        label: 'Sövénynyírás',
        icon: s?.iconUrl ? <img src={s.iconUrl} className="w-14 h-14 object-contain" alt="" /> : <Scissors className="w-10 h-10" />
      });
    }

    return opts.map(opt => {
      const promo = settings.promotions?.[opt.id];
      return {
        ...opt,
        promo: (promo && promo.isActive) ? promo : null
      };
    });
  }, [activeServices, settings.promotions]);

  const [serviceType, setServiceType] = useState<string>('fuvagas');

  useEffect(() => {
    if (availableServices.length > 0 && !availableServices.find(s => s.id === serviceType)) {
      setServiceType(availableServices[0].id);
    }
  }, [availableServices, serviceType]);

  const promo = settings.promotions?.[serviceType];
  const isPromoActive = promo && promo.isActive;

  // Alap paraméterek
  const [areaSize, setAreaSize] = useState<string>('');

  // Terep tulajdonságok
  const [obstacles, setObstacles] = useState<'könnyű' | 'kevés' | 'sok'>('könnyű');
  const [segmentation, setSegmentation] = useState<'egybefüggő' | 'kissé' | 'nagyon'>('egybefüggő');
  const [slope, setSlope] = useState<'sima' | 'enyhe' | 'meredek'>('sima');

  const [grassHeight, setGrassHeight] = useState<'normal' | 'magas'>('normal');
  const [frequency, setFrequency] = useState<'egyszeri' | 'havi_egy' | 'havi_tobb'>('egyszeri');

  // Sövénynyírás
  const [hedgeLength, setHedgeLength] = useState<number | ''>('');
  const [hedgeHeight, setHedgeHeight] = useState<number | ''>('');
  const [hedgeWidth, setHedgeWidth] = useState<number | ''>('');

  // Locsolás
  const [wateringType, setWateringType] = useState<'fak' | 'disznovenyek'>('fak');
  const [wateringCount, setWateringCount] = useState<number | ''>('');
  const [wateringArea, setWateringArea] = useState<number | ''>('');

  const [locationType, setLocationType] = useState<'fot_kozel' | 'tavolabb'>('tavolabb'); // Csak távolabb maradt (összevont)
  const [address, setAddress] = useState('');
  const [distanceKm, setDistanceKm] = useState<number | ''>('');
  const [isRouting, setIsRouting] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [manualDistance, setManualDistance] = useState(false);
  const [targetCoords, setTargetCoords] = useState<[number, number] | null>(null);
  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);

  // Autocomplete support
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isManualInput, setIsManualInput] = useState(false);

  useEffect(() => {
    if (!isManualInput || address.length < 3) {
      if (address.length < 3) setAddressSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      fetchSuggestions(address);
    }, 1000); // Nominatim policy: max 1 req/sec

    return () => clearTimeout(timer);
  }, [address, isManualInput]);

  const fetchSuggestions = async (query: string) => {
    try {
      // Use Photon (komoot) instead of Nominatim for better CORS support
      // Removed lang=hu because Photon only supports en, de, fr, it officially. 
      // Without it, it defaults to the local language (Hungarian in HU).
      const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);

      if (!res.ok) return;

      const data = await res.json();

      // Map Photon GeoJSON to our format
      const suggestions = data.features.map((f: any) => {
        const p = f.properties;
        const labelParts = [];
        if (p.postcode) labelParts.push(p.postcode);
        if (p.city) labelParts.push(p.city);
        if (p.street) {
          labelParts.push(p.street + (p.housenumber ? ` ${p.housenumber}` : ''));
        } else if (p.name && p.name !== p.city) {
          labelParts.push(p.name);
        }

        return {
          display_name: labelParts.join(', '),
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0]
        };
      });

      setAddressSuggestions(suggestions);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  useEffect(() => {
    if (grassHeight === 'magas') {
      setFrequency('egyszeri');
    }
  }, [grassHeight]);

  const searchAddress = (query: string) => {
    setAddress(query);
    setIsManualInput(true);
  };

  const selectAddress = (item: any) => {
    setIsManualInput(false);
    setAddress(item.display_name);
    setAddressSuggestions([]);
    setShowSuggestions(false);
    calculateRoute(item.display_name, item.lat, item.lon);
  };

  // Eredmények
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [unitPrice, setUnitPrice] = useState<number | null>(null);
  const [usedMachine, setUsedMachine] = useState<'traktor' | 'tologatos' | null>(null);
  const [dispatchSurcharge, setDispatchSurcharge] = useState(0);
  const [minPriceApplied, setMinPriceApplied] = useState(false);

  // Útvonaltervezés Geocoding + OSRM
  const calculateRoute = async (customAddr?: string, lat?: number, lon?: number) => {
    const targetAddr = customAddr || address;
    if (!targetAddr || targetAddr.trim().length < 3) return;
    setIsRouting(true);
    setRouteError('');
    setRoutePolyline([]);
    try {
      let tLon = lon;
      let tLat = lat;

      if (!tLon || !tLat) {
        // 1. Geocoding using Photon
        const geoRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(targetAddr)}&limit=1`);

        if (!geoRes.ok) {
          throw new Error('Hiba történt a cím keresésekor. Próbáld meg később vagy add meg kézzel!');
        }

        const geoData = await geoRes.json();
        if (!geoData.features || geoData.features.length === 0) {
          throw new Error('Nem található a megadott cím. Próbáld kézzel megadni a kilométert!');
        }
        tLon = geoData.features[0].geometry.coordinates[0];
        tLat = geoData.features[0].geometry.coordinates[1];
      }

      setTargetCoords([Number(tLat), Number(tLon!)]);

      // 2. Routing (OSRM)
      const routeRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${FOT_LON},${FOT_LAT};${tLon},${tLat}?overview=full&geometries=geojson`);
      const routeData = await routeRes.json();

      if (routeData.code !== 'Ok' || !routeData.routes || routeData.routes.length === 0) {
        throw new Error('Nem sikerült útvonalat tervezni.');
      }

      const distanceInMeters = routeData.routes[0].distance;
      const calcKm = Math.ceil(distanceInMeters / 1000); // Felfelé kerekítve teljes km-re
      setDistanceKm(calcKm);
      setManualDistance(false);

      if (routeData.routes[0].geometry) {
        setRoutePolyline(routeData.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]));
      }

    } catch (err: any) {
      setRouteError(err.message || 'Hiba történt az útvonaltervezés közben.');
      setManualDistance(true);
    } finally {
      setIsRouting(false);
    }
  };

  const calculatePrice = useCallback(() => {
    if (slope === 'meredek' && (settings.excludeAllOnSteepSlope ?? true)) {
      setEstimatedPrice(null);
      setUnitPrice(null);
      onCalculate(null, getDetails());
      return;
    }

    // Results
    let actPrice = 0;
    let actMinPrice = 0;
    let calculatedUnitPrice: number | null = null;
    let currentUsedMachine: 'traktor' | 'tologatos' | null = null;
    let minPriceApplied = false;

    let surchargePercent = 0;
    if (obstacles === 'kevés') surchargePercent += (settings.surchargeObstacleFew ?? 20);
    if (obstacles === 'sok') surchargePercent += (settings.surchargeObstacleMany ?? 40);
    if (segmentation === 'kissé') surchargePercent += (settings.surchargeSegmentedSlightly ?? 20);
    if (segmentation === 'nagyon') surchargePercent += (settings.surchargeSegmentedVery ?? 40);
    if (slope === 'enyhe') surchargePercent += (settings.surchargeSlopeSlight ?? 20);

    const surchargeMultiplier = 1 + (surchargePercent / 100);

    if (serviceType === 'fuvagas') {
      const parseArea = (val: string) => {
        if (!val) return 0;
        let cleaned = val.replace(/\s/g, '');
        if (cleaned.includes(',') && cleaned.includes('.')) {
          cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
        } else if (cleaned.includes('.') && /^\d+\.\d{3}$/.test(cleaned)) {
          cleaned = cleaned.replace(/\./g, '');
        } else {
          cleaned = cleaned.replace(/,/g, '.');
        }
        return Number(cleaned) || 0;
      };

      const area = parseArea(areaSize);
      if (!area || area <= 0) { setEstimatedPrice(null); return; }

      let grassMultiplier = grassHeight === 'magas' ? (settings.multiplierHighGrass || 2) : 1;

      const getTierPrice = (tiers: { limit: number, price: number }[] = [], defaultPrice: number) => {
        let matchingPrice = defaultPrice;
        if (!tiers || tiers.length === 0) return defaultPrice;
        const matchedTier = tiers.find(t => t.limit === -1 || area <= t.limit);
        if (matchedTier) matchingPrice = matchedTier.price;
        else matchingPrice = tiers[tiers.length - 1]?.price || defaultPrice;
        return matchingPrice;
      };

      let tologBase = getTierPrice(settings.tologatosPriceTiers, 45);
      let trakBase = getTierPrice(settings.traktorPriceTiers, 10);

      if (frequency === 'havi_egy' && settings.frequencyDiscountSettings?.monthly1?.type === 'fixed') {
        tologBase = settings.frequencyDiscountSettings.monthly1.value;
        trakBase = settings.frequencyDiscountSettings.monthly1.value;
      } else if (frequency === 'havi_tobb' && settings.frequencyDiscountSettings?.monthlyMore?.type === 'fixed') {
        tologBase = settings.frequencyDiscountSettings.monthlyMore.value;
        trakBase = settings.frequencyDiscountSettings.monthlyMore.value;
      }

      const tologatosPrice = area * tologBase * surchargeMultiplier * grassMultiplier;
      const tologatosMin = settings.tologatosMinPrice || 15000;
      const finalTologatosPrice = Math.max(tologatosPrice, tologatosMin);

      const traktorPrice = area * trakBase * surchargeMultiplier * grassMultiplier;
      const traktorMin = settings.traktorMinPrice || 30000;
      const finalTraktorPrice = Math.max(traktorPrice, traktorMin);

      // Döntés a gépről
      const isTraktorExcluded = 
        (segmentation === 'nagyon' && (settings.excludeTraktorOnVerySegmented ?? true)) || 
        (obstacles === 'sok' && (settings.excludeTraktorOnManyObstacles ?? true)) ||
        (slope === 'meredek' && (settings.excludeAllOnSteepSlope ?? true));

      // A tologatós NINCS kizárva csak mert nagy a terület, HA a traktor ki van zárva akadályok miatt
      const isTologatosExcluded = 
        grassHeight === 'magas' || 
        (area > (settings.tologatosMaxArea ?? 2500) && segmentation !== 'nagyon' && !isTraktorExcluded) ||
        (slope === 'meredek' && (settings.excludeAllOnSteepSlope ?? true));

      if (isTraktorExcluded && isTologatosExcluded) {
        setEstimatedPrice(null);
        return;
      }

      if (!isTologatosExcluded && (isTraktorExcluded || finalTologatosPrice <= finalTraktorPrice)) {
        currentUsedMachine = 'tologatos';
        actPrice = tologatosPrice;
        actMinPrice = tologatosMin;
        calculatedUnitPrice = tologBase * surchargeMultiplier * grassMultiplier;
      } else {
        currentUsedMachine = 'traktor';
        actPrice = traktorPrice;
        actMinPrice = traktorMin;
        calculatedUnitPrice = trakBase * surchargeMultiplier * grassMultiplier;
      }

    } else if (serviceType === 'locsolas') {
      if (wateringType === 'fak') {
        const db = Number(wateringCount);
        if (!db || db <= 0) { setEstimatedPrice(null); return; }
        let baseTreePrice = settings.wateringTreePrice1 || 400;
        if (db > 100 && db <= 500) baseTreePrice = settings.wateringTreePrice2 || 300;
        else if (db > 500) baseTreePrice = settings.wateringTreePrice3 || 200;

        actPrice = db * baseTreePrice * surchargeMultiplier;
        actMinPrice = settings.wateringMinPrice || 20000;
        calculatedUnitPrice = baseTreePrice * surchargeMultiplier;
      } else {
        const area = Number(wateringArea);
        if (!area || area <= 0) { setEstimatedPrice(null); return; }
        let basePlantPrice = settings.wateringPlantPrice1 || 65;
        if (area > 100 && area <= 500) basePlantPrice = settings.wateringPlantPrice2 || 50;
        else if (area > 500) basePlantPrice = settings.wateringPlantPrice3 || 40;

        actPrice = area * basePlantPrice * surchargeMultiplier;
        actMinPrice = settings.wateringMinPrice || 20000;
        calculatedUnitPrice = basePlantPrice * surchargeMultiplier;
      }
    } else if (serviceType === 'soveny') {
      const hl = Number(hedgeLength);
      const hh = Number(hedgeHeight);
      if (!hl || !hh || hl <= 0 || hh <= 0) { setEstimatedPrice(null); return; }
      const hw = Number(hedgeWidth) || 1;
      const volume = hl * hh * hw;
      
      let baseSovenyPrice = settings.hedgeTrimmingBasePrice || 800;
      if (frequency === 'havi_egy' && settings.frequencyDiscountSettings?.monthly1?.type === 'fixed') {
        baseSovenyPrice = settings.frequencyDiscountSettings.monthly1.value;
      } else if (frequency === 'havi_tobb' && settings.frequencyDiscountSettings?.monthlyMore?.type === 'fixed') {
        baseSovenyPrice = settings.frequencyDiscountSettings.monthlyMore.value;
      }

      actPrice = volume * baseSovenyPrice * surchargeMultiplier;
      actMinPrice = settings.hedgeTrimmingMinPrice || 15000;
      calculatedUnitPrice = hh * hw * baseSovenyPrice * surchargeMultiplier;
    }

    // Frekvencia kedvezmény
    const freqConfig1 = settings.frequencyDiscountSettings?.monthly1 || { type: 'percent', value: settings.discountRegularPercent || 10 };
    const freqConfigMore = settings.frequencyDiscountSettings?.monthlyMore || { type: 'percent', value: settings.discountFrequentPercent || 15 };

    if (frequency === 'havi_egy') {
      if (freqConfig1.type === 'percent') {
        actPrice *= (1 - freqConfig1.value / 100);
      } 
    } else if (frequency === 'havi_tobb') {
      if (freqConfigMore.type === 'percent') {
        actPrice *= (1 - freqConfigMore.value / 100);
      }
    }

    // Belső fix ktg
    const internalCostsTotal = (settings.serviceCosts?.[serviceType] || [])
      .reduce((sum, cost) => sum + (Number(cost.value) || 0), 0);
    actPrice += internalCostsTotal;

    // Távolságdíj (Kiszállás)
    let dispatchFeeExtra = 0;
    if (distanceKm && typeof distanceKm === 'number' && distanceKm > 0) {
      const freeKm = settings.distanceFreeKm ?? 0;
      const zone1Limit = settings.distanceLimit1 ?? 30;
      const feeZone1 = settings.distanceLimit1FeePerKm ?? 400;
      const feeZone2 = settings.distanceLimit2FeePerKm ?? 300;

      const zone1Dist = Math.min(distanceKm, zone1Limit);
      const billableZone1 = Math.max(0, zone1Dist - freeKm);
      if (billableZone1 > 0) {
        const zone1MinRaise = billableZone1 * feeZone1;
        actMinPrice += zone1MinRaise;
        dispatchFeeExtra += zone1MinRaise;
      }

      if (distanceKm > zone1Limit) {
        const overLimit1Dist = distanceKm - zone1Limit;
        const zone2Fee = overLimit1Dist * feeZone2;
        actPrice += zone2Fee;
        actMinPrice += zone2Fee;
        dispatchFeeExtra += zone2Fee;
      }
    }

    // Check if min price is applied
    if (actPrice < actMinPrice) {
      minPriceApplied = true;
    }

    const unroundedFinal = Math.max(actPrice, actMinPrice);

    // Dinamikus kerekítés
    const threshold = settings.roundingThreshold ?? 50000;
    const step = (unroundedFinal > threshold)
      ? (settings.roundingStepHigh ?? 1000)
      : (settings.roundingStepLow ?? 500);

    const finalPrice = Math.round(unroundedFinal / step) * step;

    setEstimatedPrice(finalPrice);
    setUnitPrice(calculatedUnitPrice ? Math.round(calculatedUnitPrice * 2) / 2 : null);
    setUsedMachine(currentUsedMachine);
    setMinPriceApplied(minPriceApplied);

    // Kiszámítjuk a tényleges kiszállási felárat a kijelzéshez
    const priceWithoutDistance = Math.max(actPrice - (distanceKm && distanceKm > (settings.distanceLimit1 ?? 30) ? (distanceKm - (settings.distanceLimit1 ?? 30)) * (settings.distanceLimit2FeePerKm ?? 300) : 0), actMinPrice - dispatchFeeExtra);
    const roundedWithoutDistance = Math.round(priceWithoutDistance / step) * step;
    setDispatchSurcharge(Math.max(0, finalPrice - roundedWithoutDistance));

    onCalculate(finalPrice, {
      ...getDetails(),
      minPriceApplied
    });
  }, [
    serviceType, areaSize, obstacles, segmentation, slope, grassHeight, frequency,
    hedgeLength, hedgeHeight, hedgeWidth, wateringType, wateringCount, wateringArea,
    locationType, distanceKm, settings
  ]);

  useEffect(() => {
    calculatePrice();
  }, [calculatePrice]);

  // Analytics: Track service selection
  useEffect(() => {
    trackEvent('calculator_step', { step: 'service_select', value: serviceType });
  }, [serviceType]);

  // Analytics: Track result
  useEffect(() => {
    if (estimatedPrice !== null && estimatedPrice > 0) {
      trackEvent('calculator_result', { 
        serviceType, 
        price: estimatedPrice,
        area: areaSize || wateringArea || hedgeLength,
        location: address
      });
    }
  }, [estimatedPrice]);

  const getDetails = () => ({
    locationType, distanceKm, offsetSurcharge: dispatchSurcharge, promotion: isPromoActive ? promo : null
  });

  const OptionButton = ({
    active, onClick, label, icon, subLabel, difficulty = 'easy'
  }: {
    active: boolean, onClick: () => void, label: string, icon?: React.ReactNode, subLabel?: string, difficulty?: 'easy' | 'medium' | 'hard'
  }) => {
    const activeColors = {
      easy: 'border-emerald-600 bg-emerald-50/50 text-emerald-900 ring-emerald-600',
      medium: 'border-amber-400 bg-amber-50/50 text-amber-900 ring-amber-400',
      hard: 'border-orange-500 bg-orange-50/50 text-orange-900 ring-orange-500'
    };

    return (
      <button
        onClick={onClick}
        className={`relative flex items-center justify-center flex-col gap-1.5 md:gap-2 p-2.5 sm:p-4 rounded-2xl border-2 transition-all overflow-hidden ${active
            ? `${activeColors[difficulty]} shadow-sm ring-1 ring-offset-1`
            : 'border-stone-200 bg-white text-stone-600 hover:border-emerald-400 hover:bg-stone-50/50'
          }`}
      >
        {active && (
          <div className={`absolute top-2 right-2 flex items-center justify-center rounded-full p-0.5 ${
            difficulty === 'easy' ? 'bg-emerald-500' : difficulty === 'medium' ? 'bg-amber-500' : 'bg-orange-500'
          } text-white`}>
            <Check className="w-3 h-3" />
          </div>
        )}
        {icon && (
          <div className={`${active ? (difficulty === 'easy' ? 'text-emerald-600 icon-emerald' : difficulty === 'medium' ? 'text-amber-600 icon-amber' : 'text-orange-600 icon-orange') : 'text-stone-400 icon-stone'} transition-all duration-300 [&_img]:w-14 [&_img]:h-14`}>
            {icon}
          </div>
        )}
        <div className="text-center w-full">
          <span className="block font-semibold text-sm leading-tight text-center">{label}</span>
          {subLabel && <span className={`block text-xs mt-1 text-center ${active ? 'opacity-80' : 'text-stone-400'}`}>{subLabel}</span>}
        </div>
      </button>
    );
  };

  const ServiceOptionButton = ({
    active, onClick, label, icon, promo
  }: {
    active: boolean, onClick: () => void, label: string, icon?: React.ReactNode, promo?: any
  }) => (
    <button
      onClick={onClick}
      className={`relative flex items-center justify-center flex-col gap-1.5 md:gap-2 p-2.5 sm:p-4 rounded-2xl border-2 transition-all ${active
          ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 shadow-sm ring-1 ring-emerald-600 ring-offset-1'
          : 'border-stone-200 bg-white text-stone-600 hover:border-emerald-400 hover:bg-stone-50/50'
        }`}
    >
      {active && (
        <div className="absolute top-2 right-2 flex items-center justify-center bg-emerald-500 text-white rounded-full p-0.5">
          <Check className="w-3 h-3" />
        </div>
      )}
      {promo && (
        <div className="absolute -top-2 -left-2 z-10">
          <motion.div 
            initial={{ scale: 0.8, rotate: -5 }} animate={{ scale: 1, rotate: -10 }}
            className="bg-amber-500 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg border border-white"
          >
            AKCIÓ!
          </motion.div>
        </div>
      )}
      {icon && (
        <div className={`${active ? 'text-emerald-600 icon-emerald' : 'text-stone-400 icon-stone'} transition-all duration-300 [&_img]:w-14 [&_img]:h-14`}>
          {icon}
        </div>
      )}
      <div className="text-center w-full">
        <span className="block font-semibold text-sm leading-tight text-center">{label}</span>
        {promo?.message && <span className="block text-[10px] mt-1 text-amber-600 font-bold leading-none animate-pulse">{promo.message}</span>}
      </div>
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 bg-white min-h-[600px] rounded-3xl p-0 sm:p-4 md:p-8 sm:shadow-sm sm:border border-stone-200">

      {/* 1. Szolgáltatás típusa */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm">1</span>
          Mire van szükséged?
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {availableServices.map(s => (
            <ServiceOptionButton
              key={s.id}
              active={serviceType === s.id}
              onClick={() => {
                setServiceType(s.id);
                if (onServiceChange) onServiceChange(s.label);
              }}
              label={s.label}
              icon={s.icon}
              promo={s.promo}
            />
          ))}
        </div>
      </div>

      {/* 2. Méretek */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm">2</span>
          Mekkora a terület?
        </h3>

        {/* Fűvágás */}
        {serviceType === 'fuvagas' && (
          <div className="bg-stone-50 p-4 sm:p-6 rounded-2xl border border-stone-100">
            <div className="max-w-sm">
              <label className="block text-sm font-medium text-stone-700 mb-2">Terület mérete (m²)</label>
              <div className="relative">
                <input
                  type="text" placeholder="pl. 1.200"
                  value={areaSize}
                  onChange={(e) => setAreaSize(e.target.value)}
                  className="w-full text-lg md:text-xl font-bold px-3 py-3 sm:px-4 sm:py-4 rounded-xl border border-stone-200 pr-12 sm:pr-16 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 font-medium">m²</span>
              </div>
              {(() => {
                const numericArea = Number(areaSize.replace(/\s/g, '').replace(/\.(?=\d{3}$)/g, '').replace(/,/g, '.'));
                if (numericArea >= 10000) {
                  return <p className="text-xs text-stone-500 mt-2 flex items-center gap-1"><InfoIcon /> ≈ {(numericArea / 10000).toLocaleString('hu-HU', { maximumFractionDigits: 2 })} hektár</p>;
                }
                return null;
              })()}
            </div>
          </div>
        )}

        {/* Locsolás */}
        {serviceType === 'locsolas' && (
          <div className="bg-stone-50 p-4 sm:p-6 rounded-2xl border border-stone-100 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex items-center gap-3 cursor-pointer bg-white p-3 rounded-xl border border-stone-200 flex-1 hover:border-emerald-300 transition-colors">
                <input type="radio" checked={wateringType === 'fak'} onChange={() => setWateringType('fak')} className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 border-stone-300" />
                <span className="font-medium text-stone-700">Fák, facsemeték</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer bg-white p-3 rounded-xl border border-stone-200 flex-1 hover:border-emerald-300 transition-colors">
                <input type="radio" checked={wateringType === 'disznovenyek'} onChange={() => setWateringType('disznovenyek')} className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 border-stone-300" />
                <span className="font-medium text-stone-700">Díszkertek, ágyások, pázsit (m²)</span>
              </label>
            </div>
            <div className="max-w-sm">
              <label className="block text-sm font-medium text-stone-700 mb-2">{wateringType === 'fak' ? 'Fák száma (db)' : 'Terület mérete (m²)'}</label>
              <input
                type="number" min="1" placeholder={wateringType === 'fak' ? "pl. 150" : "pl. 200"}
                value={wateringType === 'fak' ? (wateringCount || '') : (wateringArea || '')}
                onChange={(e) => wateringType === 'fak' ? setWateringCount(e.target.value ? Number(e.target.value) : '') : setWateringArea(e.target.value ? Number(e.target.value) : '')}
                className="w-full text-lg md:text-xl font-bold px-3 py-3 sm:px-4 sm:py-4 rounded-xl border border-stone-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm"
              />
            </div>
          </div>
        )}

        {/* Sövénynyírás */}
        {serviceType === 'soveny' && (
          <div className="bg-stone-50 p-4 sm:p-6 rounded-2xl border border-stone-100 grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Hossz (m)</label>
              <div className="relative">
                <input type="number" min="1" placeholder="pl. 20" value={hedgeLength} onChange={(e) => setHedgeLength(e.target.value ? Number(e.target.value) : '')}
                  className="w-full text-lg px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Magasság (m)</label>
              <div className="relative">
                <input type="number" min="0.1" step="0.1" placeholder="pl. 1.8" value={hedgeHeight} onChange={(e) => setHedgeHeight(e.target.value ? Number(e.target.value) : '')}
                  className="w-full text-lg px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Vastagság (m)</label>
              <div className="relative">
                <input type="number" min="0.1" step="0.1" placeholder="Kb. 1m" value={hedgeWidth} onChange={(e) => setHedgeWidth(e.target.value ? Number(e.target.value) : '')}
                  className="w-full text-lg px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Terepviszonyok (Csak Fűvágás esetén releváns nagyrészt) */}
      {serviceType === 'fuvagas' && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm">3</span>
            Milyenek a terepviszonyok?
          </h3>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Akadályok */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
              <label className="block text-sm font-semibold text-stone-700 mb-3 text-center">Akadályok száma</label>
              <div className="flex flex-col gap-2">
                <OptionButton active={obstacles === 'könnyű'} onClick={() => setObstacles('könnyű')} label="Nincs / Könnyű" difficulty="easy" />
                <OptionButton active={obstacles === 'kevés'} onClick={() => setObstacles('kevés')} label="Kevés akadály" subLabel="Kerülgetős, pl. bokrok" difficulty="medium" />
                <OptionButton active={obstacles === 'sok'} onClick={() => setObstacles('sok')} label="Sok akadály" subLabel="Sűrűn beültetett" difficulty="hard" />
              </div>
            </div>

            {/* Tagoltság */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
              <label className="block text-sm font-semibold text-stone-700 mb-3 text-center">Terület tagoltsága</label>
              <div className="flex flex-col gap-2">
                <OptionButton active={segmentation === 'egybefüggő'} onClick={() => setSegmentation('egybefüggő')} label="Egybefüggő" difficulty="easy" />
                <OptionButton active={segmentation === 'kissé'} onClick={() => setSegmentation('kissé')} label="Kissé tagolt" subLabel="Osztott terület" difficulty="medium" />
                <OptionButton active={segmentation === 'nagyon'} onClick={() => setSegmentation('nagyon')} label="Nagyon tagolt" subLabel="Sok kis részlet" difficulty="hard" />
              </div>
            </div>

            {/* Lejtés */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
              <label className="block text-sm font-semibold text-stone-700 mb-3 text-center">Terület dőlésszöge</label>
              <div className="flex flex-col gap-2">
                <OptionButton active={slope === 'sima'} onClick={() => setSlope('sima')} label="Sima felület" difficulty="easy" />
                <OptionButton active={slope === 'enyhe'} onClick={() => setSlope('enyhe')} label="Enyhén lejtős" difficulty="medium" />
                <OptionButton active={slope === 'meredek'} onClick={() => setSlope('meredek')} label="Meredek / Rézsű" subLabel="Figyelem!" difficulty="hard" />
              </div>
            </div>
          </div>

          <div className="space-y-3 px-0 sm:px-2">
            <label className="flex items-center gap-3 cursor-pointer p-3 sm:p-4 bg-stone-50 rounded-xl border border-stone-200 hover:bg-emerald-50 hover:border-emerald-200 transition-colors">
              <input type="checkbox" checked={grassHeight === 'magas'} onChange={(e) => setGrassHeight(e.target.checked ? 'magas' : 'normal')} className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 border-stone-300 rounded" />
              <span className="font-medium text-stone-800">Nagyon magas / elhanyagolt fű (két vágás szükséges)</span>
            </label>
          </div>
        </div>
      )}

      {/* 4. Rendszeresség */}
      {grassHeight !== 'magas' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm">4</span>
            Milyen gyakran lenne szükség a munkára?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
            <OptionButton active={frequency === 'egyszeri'} onClick={() => setFrequency('egyszeri')} label="Egyszeri alkalom" />
            <OptionButton 
              active={frequency === 'havi_egy'} 
              onClick={() => setFrequency('havi_egy')} 
              label="Havi 1 alkalom" 
              subLabel={
                (settings.frequencyDiscountSettings?.monthly1?.type === 'fixed') 
                  ? `${settings.frequencyDiscountSettings.monthly1.value} Ft/m²` 
                  : `-${settings.frequencyDiscountSettings?.monthly1?.value || settings.discountRegularPercent || 10}% kedvezmény`
              } 
            />
            <OptionButton 
              active={frequency === 'havi_tobb'} 
              onClick={() => setFrequency('havi_tobb')} 
              label="Havi többször" 
              subLabel={
                (settings.frequencyDiscountSettings?.monthlyMore?.type === 'fixed') 
                  ? `${settings.frequencyDiscountSettings.monthlyMore.value} Ft/m²` 
                  : `-${settings.frequencyDiscountSettings?.monthlyMore?.value || settings.discountFrequentPercent || 15}% kedvezmény`
              } 
            />
          </div>
        </div>
      )}

      {/* 5. Távolság és Kiszállás */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm">5</span>
          Kiszállási információk
        </h3>
        <div className="bg-stone-50 p-4 sm:p-6 rounded-2xl border border-stone-100 space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-stone-700 mb-2">Add meg a pontos címet vagy települést:</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => searchAddress(e.target.value)}
                  onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="pl. Gödöllő, Szabadság út"
                  className="flex-1 px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <button onClick={() => calculateRoute()} disabled={isRouting} className="w-full sm:w-auto bg-stone-900 text-white px-6 py-3 md:py-2 rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 font-medium">
                  {isRouting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <MapPin className="w-5 h-5" />}
                  {distanceKm ? 'Újraszámítás' : 'Küldés'}
                </button>
              </div>

              {/* Autocomplete suggestions */}
              <AnimatePresence>
                {showSuggestions && addressSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-50 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden"
                  >
                    {addressSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectAddress(item)}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-stone-50 border-b border-stone-100 last:border-0"
                      >
                        {item.display_name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {routeError && <p className="text-red-500 text-sm font-medium">{routeError}</p>}

            {distanceKm && (
              <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <Car className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-stone-600">Számított távolság:</p>
                  <p className="text-lg font-bold text-emerald-700">{distanceKm} km</p>
                </div>
              </div>
            )}

            {/* Optional Map */}
            {settings.showMap && targetCoords && (
              <div className="h-[300px] w-full rounded-2xl overflow-hidden border border-stone-200 shadow-inner relative z-10">
                <MapContainer
                  center={[FOT_LAT, FOT_LON]}
                  zoom={10}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <Marker position={[FOT_LAT, FOT_LON]} />
                  <Marker position={targetCoords} />
                  {routePolyline.length > 0 && (
                    <Polyline positions={routePolyline} color="#10b981" weight={4} opacity={0.7} />
                  )}
                  <MapFocus center={targetCoords} />
                </MapContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Eredmény */}
      {slope === 'meredek' ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 p-6 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-center flex flex-col items-center gap-3">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <div>
            <p className="font-bold text-lg mb-1">Meredek rézsű kezelése</p>
            <p className="text-red-700 text-sm max-w-lg mx-auto">Jelenleg a meredek rézsűk nyírását gépi okokból nem tudjuk elvállalni. Későbbiekben damilos fűkaszával tervezzük ezen területek kezelését is. Megértését köszönjük!</p>
          </div>
        </motion.div>
      ) : estimatedPrice !== null && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 md:p-8 pb-6 bg-emerald-600 text-white rounded-3xl text-center shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <CalcIcon className="w-48 h-48 -mr-10 -mt-10" />
          </div>
          <div className="relative z-10 w-full">
            <p className="text-emerald-50 text-sm font-medium mb-2 uppercase tracking-widest opacity-80">Indikátoros Kalkulált Ár</p>
            <div className="text-3xl md:text-5xl font-display font-extrabold mb-2 tracking-tight flex flex-col items-center">
              <span>~ {estimatedPrice.toLocaleString('hu-HU')} Ft</span>
              {minPriceApplied && (
                <span className="text-xs md:text-sm bg-white/20 px-3 py-1 rounded-full mt-2 font-bold uppercase tracking-wider">
                  Minimális vállalási ár
                </span>
              )}
              {isPromoActive && promo.message && (
                <span className="text-xs md:text-sm bg-white/20 px-3 py-1 rounded-full mt-2 font-bold animate-pulse">
                  {promo.message}
                </span>
              )}
            </div>
            
            {settings.showUnitPricePerService?.[serviceType] && unitPrice && !minPriceApplied && (
              <p className="text-emerald-100 font-medium mb-3">~ {unitPrice.toLocaleString('hu-HU', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} {unitLabel(serviceType, wateringType)}</p>
            )}

            <div className="max-w-md mx-auto mt-6 space-y-2">
              {serviceType === 'fuvagas' && usedMachine && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-center gap-2 text-xs md:text-sm bg-emerald-700/50 py-3 px-4 rounded-2xl backdrop-blur-sm border border-emerald-500/20 shadow-inner">
                    {usedMachine === 'traktor' ? <Car className="w-5 h-5 text-emerald-300" /> : <HardHat className="w-5 h-5 text-amber-300" />}
                    <div className="text-left">
                      <p className="font-bold">{usedMachine === 'traktor' ? 'Traktoros fűnyírás' : 'Tologatós fűnyírás'}</p>
                      <p className="opacity-80 text-[11px] leading-tight mt-0.5">
                        {usedMachine === 'traktor' 
                          ? 'A terület mérete alapján gépi nyírásra alkalmas.' 
                          : 'A terepviszonyok (akadályok, tagoltság) vagy a terület mérete miatt kézi/tologatós fűnyírás szükséges, ami időigényesebb folyamat.'}
                      </p>
                    </div>
                  </div>
                  {segmentation === 'nagyon' && usedMachine === 'tologatos' && (settings.forceTologatosOnVerySegmented ?? true) && (
                    <div className="flex items-center justify-center gap-2 text-xs md:text-sm bg-emerald-700/30 text-emerald-100 py-2 px-4 rounded-full backdrop-blur-sm border border-emerald-500/20 italic">
                      <HardHat className="w-4 h-4" />
                      <span>Nagyon tagolt terep miatt ezt a területet csak <strong>tologatós fűnyíróval</strong> tudjuk vállalni.</span>
                    </div>
                  )}
                  {grassHeight === 'magas' && settings.showDoubleCutText !== false && (
                    <div className="flex items-center justify-center gap-2 text-xs md:text-sm bg-yellow-500/20 text-yellow-200 py-2 px-4 rounded-full backdrop-blur-sm border border-yellow-500/30">
                      <AlertCircle className="w-4 h-4" />
                      <span>Elhanyagolt, magas fű esetén a területen <strong>dupla vágás szükséges</strong>, az ár viszont általában csak kisebb mértékben emelkedik.</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-xs md:text-sm bg-emerald-700/50 py-2 px-4 rounded-full backdrop-blur-sm">
                <MapPin className="w-4 h-4" />
                <span>
                  {locationType === 'fot_kozel' || (distanceKm && distanceKm <= (settings.distanceFreeKm ?? 10))
                    ? 'A kiszállásnak nincs felára (az első 10 km ingyenes).'
                    : (settings.showDistanceFeeExplicitly && dispatchSurcharge > 0
                      ? `Kiszállási felár a megadott távolságra: ~${dispatchSurcharge.toLocaleString('hu-HU')} Ft.`
                      : 'A kiszállás extra költségeit a kalkulált ár / minimum díj tartalmazza.')}
                </span>
              </div>
            </div>

            <p className="text-emerald-100/70 text-xs mt-6 mx-auto max-w-xl leading-relaxed">
              * A feltüntetett ár tájékoztató jellegű és nem minősül hivatalos ajánlattételnek. Szerződéskötés előtt a helyszínen pontos felmérést végzünk.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

const InfoIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);