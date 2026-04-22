import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, onSnapshot, query, orderBy, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Check connection
export async function testConnection() {
  try {
    await getDoc(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}

// Initial Data Setup
export async function initializeDefaultData() {
  try {
    const settingsRef = doc(db, 'settings', 'site');
    const settingsSnap = await getDoc(settingsRef);
    
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, {
        showHero: true,
        showFeatures: true,
        showServices: true,
        showContact: true,
        heroTitle: "Professzionális Zöldterület Kezelés",
        heroSubtitle: "Ipari fűnyírás, fűkaszálás, sövénynyírás és ágdarálás. Megbízható gépparkkal, precíz munkavégzéssel állunk rendelkezésére cégek és magánszemélyek részére egyaránt.",
        heroDescription: ""
      });
    }

    const servicesRef = collection(db, 'services');
    const servicesSnap = await getDocs(servicesRef);
    
    if (servicesSnap.empty) {
      const defaultServices = [
        {
          id: 'funyiras-traktorral',
          title: 'Fűnyírás traktorral',
          description: 'Nagyobb területek, ipari parkok, önkormányzati telkek gyors és hatékony fűnyírása nagy teljesítményű traktorral.',
          iconName: 'Leaf',
          image: '/traktor.jpg',
          isActive: true,
          order: 1
        },
        {
          id: 'funyiras-tologatos',
          title: 'Fűnyírás tologatós fűnyíróval',
          description: 'Kisebb kertek, szűkebb területek és precízebb munkát igénylő pázsitok gondozása professzionális tologatós fűnyíróval.',
          iconName: 'Leaf',
          image: '/tologatós.jpg',
          isActive: true,
          order: 2
        },
        {
          id: 'fukaszalas',
          title: 'Fűkaszálás',
          description: 'Elhanyagolt, gazos, nehezen megközelíthető területek tisztítása, bozótirtás professzionális fűkaszákkal.',
          iconName: 'Axe',
          image: '/fukaszalas.jpg',
          isActive: true,
          order: 3
        },
        {
          id: 'sovenynyiras',
          title: 'Sövénynyírás',
          description: 'Sövények, bokrok formára nyírása, ifjítása, kerítések melletti zöldsávok esztétikus karbantartása.',
          iconName: 'Scissors',
          image: '/sovenynyiras.jpg',
          isActive: true,
          order: 4
        },
        {
          id: 'agdaralas',
          title: 'Ágdarálás',
          description: 'A levágott gallyak, ágak helyszíni darálása, komposztálásra előkészítése vagy igény szerinti elszállítása.',
          iconName: 'TreePine',
          image: '/agdaralas.jpg',
          isActive: true,
          order: 5
        }
      ];

      for (const service of defaultServices) {
        await setDoc(doc(servicesRef, service.id), service);
      }
    }
  } catch (error) {
    console.error("Error initializing default data:", error);
  }
}
