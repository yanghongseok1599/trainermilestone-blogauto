import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { FitnessCategory } from '@/types';

// Types
export interface BusinessInfo {
  category: FitnessCategory;
  businessName: string;
  mainKeyword: string;
  subKeywords: string[];
  tailKeywords: string[];
  targetAudience: string;
  uniquePoint: string;
  attributes: Record<string, string>;
  customAttributes: string[];
}

export interface Preset {
  id: string;
  name: string;
  category: FitnessCategory;
  businessName: string;
  mainKeyword: string;
  subKeywords: string[];
  tailKeywords: string[];
  targetAudience: string;
  uniquePoint: string;
  attributes: Record<string, string>;
  customAttributes: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Save business info to Firestore
export async function saveBusinessInfo(userId: string, data: BusinessInfo): Promise<void> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');
  const docRef = doc(db, 'users', userId, 'businessInfo', 'current');
  await setDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// Load business info from Firestore
export async function loadBusinessInfo(userId: string): Promise<BusinessInfo | null> {
  if (!db) return null;
  const docRef = doc(db, 'users', userId, 'businessInfo', 'current');
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      category: data.category || '헬스장',
      businessName: data.businessName || '',
      mainKeyword: data.mainKeyword || '',
      subKeywords: data.subKeywords || ['', '', ''],
      tailKeywords: data.tailKeywords || ['', '', ''],
      targetAudience: data.targetAudience || '',
      uniquePoint: data.uniquePoint || '',
      attributes: data.attributes || {},
      customAttributes: data.customAttributes || [],
    };
  }
  return null;
}

// Save preset to Firestore
export async function savePreset(userId: string, preset: Omit<Preset, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');
  const presetId = crypto.randomUUID();
  const docRef = doc(db, 'users', userId, 'presets', presetId);
  await setDoc(docRef, {
    ...preset,
    id: presetId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return presetId;
}

// Load all presets from Firestore
export async function loadPresets(userId: string): Promise<Preset[]> {
  if (!db) return [];
  const presetsRef = collection(db, 'users', userId, 'presets');
  const q = query(presetsRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);

  const presets: Preset[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    presets.push({
      id: doc.id,
      name: data.name,
      category: data.category,
      businessName: data.businessName,
      mainKeyword: data.mainKeyword,
      subKeywords: data.subKeywords || ['', '', ''],
      tailKeywords: data.tailKeywords || ['', '', ''],
      targetAudience: data.targetAudience,
      uniquePoint: data.uniquePoint,
      attributes: data.attributes || {},
      customAttributes: data.customAttributes || [],
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    });
  });

  return presets;
}

// Delete preset from Firestore
export async function deletePreset(userId: string, presetId: string): Promise<void> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');
  const docRef = doc(db, 'users', userId, 'presets', presetId);
  await deleteDoc(docRef);
}

// Save API key (encrypted storage recommended in production)
export async function saveApiSettings(userId: string, apiProvider: string, apiKey: string): Promise<void> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');
  const docRef = doc(db, 'users', userId, 'settings', 'api');
  await setDoc(docRef, {
    apiProvider,
    apiKey, // In production, encrypt this
    updatedAt: serverTimestamp(),
  });
}

// Load API settings
export async function loadApiSettings(userId: string): Promise<{ apiProvider: string; apiKey: string } | null> {
  if (!db) return null;
  const docRef = doc(db, 'users', userId, 'settings', 'api');
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      apiProvider: data.apiProvider || 'gemini',
      apiKey: data.apiKey || '',
    };
  }
  return null;
}
