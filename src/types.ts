export interface CustomBlock {
  id: string;
  type: 'custom';
  title: string;
  content: string;
  bgColor: string;
  textColor: string;
}

export interface QuoteImage {
  url: string;
  type: 'before' | 'after';
  uploadedAt: any;
}

export interface QuoteRequest {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceType: string;
  calculatedPrice: number | null;
  details: CalculatorDetails;
  message: string;
  status: 'pending' | 'accepted' | 'completed' | 'rejected';
  images: QuoteImage[];
  preferredDays: string[];
  createdAt: any;
  completedAt?: any;
}

export interface CalculatorDetails {
  serviceType: string;
  areaSize: number | '';
  terrain: string;
  grassHeight: string;
  frequency: string;
  location: string;
  distance: number | '';
  settlement?: string;
  hedgeLength: number | '';
  hedgeHeight: number | '';
  hedgeWidth: number | '';
  wateringType: string;
  wateringCount: number | '';
  wateringArea: number | '';
}

export type SectionBlock =
  | { id: string; type: 'hero'; isVisible: boolean }
  | { id: string; type: 'features'; isVisible: boolean }
  | { id: string; type: 'services'; isVisible: boolean }
  | { id: string; type: 'contact'; isVisible: boolean }
  | (CustomBlock & { isVisible: boolean });

export interface SiteSettings {
  heroTitle: string;
  heroSubtitle: string;
  aboutText: string;
  servicesText: string;
  contactEmail: string;
  contactPhone: string;
  secondaryContactEmail?: string;
  showHero: boolean;
  showAbout: boolean;
  showServices: boolean;
  showGallery: boolean;
  showContact: boolean;
  showFeatures?: boolean;
  primaryColor: string;
  servicesLayout?: 'grid' | 'list';
  servicesListStartSide?: 'left' | 'right';
  sections?: SectionBlock[];
}

export interface CalculatorSettings {
  // Fűnyírás – traktor
  traktorMinPrice: number;
  traktorPriceTiers: { limit: number, price: number }[];
  traktorExcludedTerrains: string[];

  // Fűnyírás – tologatós
  tologatosMinPrice: number;
  tologatosPriceTiers: { limit: number, price: number }[];

  // Fűkaszálás (későbbre)
  kaszoMinPrice: number;
  kaszoBasePrice: number;

  // Sövénynyírás
  hedgeTrimmingMinPrice: number;
  hedgeTrimmingBasePrice: number;

  // Locsolás - Fák
  wateringMinPrice: number; // Ezt használjuk mindkettőhöz
  wateringTreePrice1: number;     // 1-100 db
  wateringTreePrice2: number;     // 101-500 db
  wateringTreePrice3: number;     // 501+ db

  // Locsolás - Díszkert
  wateringPlantPrice1: number;    // 1-100 m²
  wateringPlantPrice2: number;    // 101-500 m²
  wateringPlantPrice3: number;    // 501+ m²

  // Felárak (%)
  surchargeObstacleFew: number;       // Kevés akadály (+20%)
  surchargeObstacleMany: number;      // Sok akadály (+40%)
  surchargeSegmentedSlightly: number; // Kissé tagolt (+20%)
  surchargeSegmentedVery: number;     // Nagyon tagolt (+40%)
  surchargeSlopeSlight: number;       // Enyhe lejtés (+20%)
  multiplierHighGrass?: number;       // Magas fű szorzó
  showDoubleCutText?: boolean;        // Magas fű felirat be/ki

  // Rendszeresség kedvezmények (%-ban)
  discountRegularPercent: number;   // havi 1x kedvezmény
  discountFrequentPercent: number;  // havi többszöri kedvezmény

  // Távolságdíj
  distanceFreeKm: number;            // Ingyenes km limit (pl. 10)
  distanceLimit1: number;            // Első zóna határa (pl. 50 km)
  distanceLimit1FeePerKm: number;    // Díj az első zónában (pl. 400, és csak a minimumot növeli!)
  distanceLimit2FeePerKm: number;    // Díj a második zónában (pl. 300)
  showDistanceFeeExplicitly: boolean;// true: külön sorban is jelezhetjük a díjat, ha a felhasználó akarja

  // Megjelenítés
  showUnitPricePerService: Partial<Record<string, boolean>>; // service type → egységár megj.
  showMap?: boolean; // Térkép megjelenítése a kalkulátorban

  // Kerekítés
  roundingThreshold?: number; // Pl. 50000
  roundingStepLow?: number;   // Pl. 500
  roundingStepHigh?: number;  // Pl. 1000

  // Belső költségek szolgáltatásonként
  serviceCosts?: Record<string, { label: string, value: number }[]>;
  prohibitedOptions?: Record<string, string[]>;
}

export const defaultCalculatorSettings: CalculatorSettings = {
  traktorMinPrice: 30000,
  traktorPriceTiers: [
    { limit: 5000, price: 10 },
    { limit: 10000, price: 9 },
    { limit: 50000, price: 8 },
    { limit: -1, price: 7 }
  ],
  traktorExcludedTerrains: [],

  tologatosMinPrice: 15000,
  tologatosPriceTiers: [
    { limit: 500, price: 45 },
    { limit: 1000, price: 35 },
    { limit: -1, price: 28 }
  ],

  kaszoMinPrice: 20000,
  kaszoBasePrice: 12,

  hedgeTrimmingMinPrice: 15000,
  hedgeTrimmingBasePrice: 800,

  wateringMinPrice: 20000,
  wateringTreePrice1: 400,
  wateringTreePrice2: 300,
  wateringTreePrice3: 200,

  wateringPlantPrice1: 65,
  wateringPlantPrice2: 50,
  wateringPlantPrice3: 40,

  surchargeObstacleFew: 20,
  surchargeObstacleMany: 40,
  surchargeSegmentedSlightly: 20,
  surchargeSegmentedVery: 40,
  surchargeSlopeSlight: 20,
  multiplierHighGrass: 2,
  showDoubleCutText: true,

  discountRegularPercent: 10,
  discountFrequentPercent: 15,

  distanceFreeKm: 0,
  distanceLimit1: 30,
  distanceLimit1FeePerKm: 400,
  distanceLimit2FeePerKm: 300,
  showDistanceFeeExplicitly: true,
  showMap: false,

  roundingThreshold: 50000,
  roundingStepLow: 500,
  roundingStepHigh: 1000,

  showUnitPricePerService: {
    traktor: true,
    tologatos: true,
    kaszo: true,
    locsolas: true,
    soveny: false,
  },
  prohibitedOptions: {},
  serviceCosts: {},
};

export const defaultSettings: SiteSettings = {
  heroTitle: "Professzionális Zöldterület Kezelés",
  heroSubtitle: "Fűnyírás, bozótirtás, fakivágás és teljeskörű kertgondozás magánszemélyeknek és cégeknek egyaránt.",
  aboutText: "A Kaszáló egy megbízható és tapasztalt csapat, amely elkötelezett a zöldterületek szakszerű karbantartása iránt. Legyen szó egy kis kertről vagy több hektáros ipari területről, modern gépparkunkkal és szakértelmünkkel minden feladatot gyorsan és precízen végzünk el. Célunk, hogy környezetét ápolttá és élhetővé tegyük.",
  servicesText: "Kínálatunkban minden megtalálható, amire a zöldterületek karbantartásához szükség lehet. Modern gépparkkal és tapasztalt szakemberekkel állunk rendelkezésére.",
  contactEmail: "info@zold-mezo.hu",
  contactPhone: "+36 20 20 90 955",
  showHero: true,
  showAbout: true,
  showServices: true,
  showGallery: true,
  showContact: true,
  primaryColor: "emerald-600"
};
