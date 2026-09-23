import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * PIN Security utility functions
 * Uses SHA-256 hash with user salt for secure storage
 * Synchronizes with Firestore and localStorage
 */

export function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Hash PIN using SHA-256 with user salt
 */
export async function hashPin(pin: string, salt: string = 'financepro_salt_'): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    return btoa(salt + pin);
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + pin);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return bufferToBase64Url(hashBuffer);
}

/**
 * Save user PIN to storage and cloud sync
 */
export async function saveSecurityPin(userId: string, pin: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const hash = await hashPin(pin, userId);
  
  try {
    localStorage.setItem(`financepro_pin_hash_${userId}`, hash);
    localStorage.setItem(`financepro_has_pin_${userId}`, 'true');
    localStorage.setItem(`financepro_pin_enabled_${userId}`, 'true');
  } catch (e) {
    console.warn('Could not save PIN in localStorage:', e);
  }

  // Backup / sync to Firestore users collection
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      pinHash: hash,
      pinUpdatedAt: Date.now(),
    });
  } catch (e) {
    // If user document update fails silently continue with local storage
  }
}

/**
 * Verify user PIN
 */
export async function verifySecurityPin(userId: string, enteredPin: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    let savedHash = localStorage.getItem(`financepro_pin_hash_${userId}`);
    
    // If not in localStorage, attempt sync from Firestore
    if (!savedHash) {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists() && userDoc.data()?.pinHash) {
          savedHash = userDoc.data().pinHash;
          localStorage.setItem(`financepro_pin_hash_${userId}`, savedHash!);
          localStorage.setItem(`financepro_has_pin_${userId}`, 'true');
        }
      } catch (e) {}
    }

    if (!savedHash) return false;
    const computedHash = await hashPin(enteredPin, userId);
    return savedHash === computedHash;
  } catch (e) {
    return false;
  }
}

/**
 * Check if user has already set up a PIN
 */
export function hasSecurityPin(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !!localStorage.getItem(`financepro_has_pin_${userId}`);
  } catch (e) {
    return false;
  }
}

/**
 * PIN protection is mandatory on every system access
 */
export function isPinProtectionEnabled(_userId?: string): boolean {
  return true;
}

/**
 * Helper to sync PIN existence from Firestore if fresh device
 */
export async function syncPinFromCloud(userId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists() && userDoc.data()?.pinHash) {
      const hash = userDoc.data().pinHash;
      localStorage.setItem(`financepro_pin_hash_${userId}`, hash);
      localStorage.setItem(`financepro_has_pin_${userId}`, 'true');
      return true;
    }
  } catch (e) {}
  return hasSecurityPin(userId);
}
