import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, setDoc, getDoc } from 'firebase/firestore';

export type EventType = 'page_view' | 'calculator_step' | 'calculator_result' | 'quote_intent' | 'form_submit';

export const trackEvent = async (type: EventType, details: any = {}) => {
  try {
    // 1. Log individual event
    await addDoc(collection(db, 'analytics'), {
      type,
      details,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
      sessionId: getSessionId()
    });

    // 2. Update daily aggregates for faster dashboard loading
    // NOTE: This requires 'write' permissions for the 'stats' collection.
    // Recommended Firestore Rule:
    // match /stats/{date} {
    //   allow read: if request.auth != null && request.auth.token.admin == true;
    //   allow create, update: if true; // Or use a more restrictive approach with Cloud Functions
    // }
    try {
      const today = new Date().toISOString().split('T')[0];
      const statsRef = doc(db, 'stats', today);
      
      const statsDoc = await getDoc(statsRef);
      if (!statsDoc.exists()) {
        await setDoc(statsRef, {
          date: today,
          page_views: type === 'page_view' ? 1 : 0,
          calculator_interactions: type === 'calculator_step' ? 1 : 0,
          results_calculated: type === 'calculator_result' ? 1 : 0,
          quote_intents: type === 'quote_intent' ? 1 : 0,
          form_submissions: type === 'form_submit' ? 1 : 0
        });
      } else {
        const field = getFieldName(type);
        if (field) {
          await updateDoc(statsRef, {
            [field]: increment(1)
          });
        }
      }
    } catch (statsError) {
      // Silently fail or log a more specific warning for aggregates
      // This often happens due to missing 'update' permissions for unauthenticated users
      console.warn('Daily stats aggregation skipped (likely permission issue). Individual events are still logged.');
    }
  } catch (error) {
    console.error('Error logging individual event:', error);
  }
};

const getFieldName = (type: EventType) => {
  switch (type) {
    case 'page_view': return 'page_views';
    case 'calculator_step': return 'calculator_interactions';
    case 'calculator_result': return 'results_calculated';
    case 'quote_intent': return 'quote_intents';
    case 'form_submit': return 'form_submissions';
    default: return null;
  }
};

const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};
