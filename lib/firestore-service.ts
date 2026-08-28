import { 
  collection, 
  addDoc, 
  getDoc, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  deleteDoc, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { 
  Administrador, 
  Devedor, 
  Conta, 
  TipoLancamento, 
  Lancamento, 
  Parcela,
  SituacaoParcela,
  Evento
} from '@/types/finance';
import { addMonths, format } from 'date-fns';

enum OperationType {
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
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const FirestoreService = {
  // Admin
  getAdmin: async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return null;
    const path = `users/${uid}`;
    try {
      const d = await getDoc(doc(db, 'users', uid));
      return d.exists() ? ({ id: d.id, ...d.data() } as Administrador) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },
  setAdmin: async (admin: Administrador) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      await setDoc(doc(db, 'users', uid), { ...admin, userId: uid });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  },

  // Debtors
  getDevedores: (callback: (data: Devedor[]) => void) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return () => {};
    const q = query(collection(db, 'debtors'), where('userId', '==', uid));
    return onSnapshot(q, (s) => {
      callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Devedor)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'debtors');
    });
  },
  addDebtor: async (data: Omit<Devedor, 'id'>) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      await addDoc(collection(db, 'debtors'), { ...data, userId: uid });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'debtors');
    }
  },
  updateDebtor: async (id: string, data: Partial<Devedor>) => {
    const path = `debtors/${id}`;
    try {
      await updateDoc(doc(db, 'debtors', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  deleteDebtor: async (id: string) => {
    const path = `debtors/${id}`;
    try {
      await deleteDoc(doc(db, 'debtors', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Accounts
  getContas: (callback: (data: Conta[]) => void) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return () => {};
    const q = query(collection(db, 'accounts'), where('userId', '==', uid));
    return onSnapshot(q, (s) => {
      callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Conta)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'accounts');
    });
  },
  addAccount: async (data: Omit<Conta, 'id'>) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      await addDoc(collection(db, 'accounts'), { ...data, userId: uid });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'accounts');
    }
  },
  updateAccount: async (id: string, data: Partial<Conta>) => {
    const path = `accounts/${id}`;
    try {
      await updateDoc(doc(db, 'accounts', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  deleteAccount: async (id: string) => {
    const path = `accounts/${id}`;
    try {
      await deleteDoc(doc(db, 'accounts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Types
  getTipos: (callback: (data: TipoLancamento[]) => void) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return () => {};
    const q = query(collection(db, 'launchTypes'), where('userId', '==', uid));
    return onSnapshot(q, (s) => {
      callback(s.docs.map(d => ({ id: d.id, ...d.data() } as TipoLancamento)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'launchTypes');
    });
  },
  addType: async (data: Omit<TipoLancamento, 'id'>) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      await addDoc(collection(db, 'launchTypes'), { ...data, userId: uid });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'launchTypes');
    }
  },
  updateType: async (id: string, data: Partial<TipoLancamento>) => {
    const path = `launchTypes/${id}`;
    try {
      await updateDoc(doc(db, 'launchTypes', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  deleteType: async (id: string) => {
    const path = `launchTypes/${id}`;
    try {
      await deleteDoc(doc(db, 'launchTypes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Transactions & Installments
  getLancamentos: (callback: (data: Lancamento[]) => void) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return () => {};
    const q = query(collection(db, 'transactions'), where('userId', '==', uid));
    return onSnapshot(q, (s) => {
      callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Lancamento)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });
  },
  getParcelas: (callback: (data: Parcela[]) => void) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return () => {};
    const q = query(collection(db, 'parcelas'), where('userId', '==', uid));
    return onSnapshot(q, (s) => {
      callback(s.docs.map(d => ({ id: d.id, ...d.data() } as Parcela)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'parcelas');
    });
  },

  addLancamento: async (lancamento: Omit<Lancamento, 'id'>, firstVencimento: string) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const lRef = await addDoc(collection(db, 'transactions'), { ...lancamento, userId: uid });
      const id = lRef.id;

      const tipoDoc = await getDoc(doc(db, 'launchTypes', lancamento.tipoLancamentoId));
      const tipoData = tipoDoc.data() as TipoLancamento;
      const isDV = tipoData?.dv === true;

      const valorParcelaTotal = lancamento.valorTotal / lancamento.numParcelas;
      
      let valorAdmin: number;
      let valorDevedor: number;

      if (isDV) {
        valorAdmin = 0;
        valorDevedor = tipoData.flagMatematica === '+' ? -valorParcelaTotal : valorParcelaTotal;
      } else if (lancamento.dividirConta && lancamento.devedorId) {
        if (lancamento.valorDebitoDevedor && lancamento.valorDebitoDevedor > 0) {
          valorDevedor = lancamento.valorDebitoDevedor / lancamento.numParcelas;
          valorAdmin = (lancamento.valorTotal - lancamento.valorDebitoDevedor) / lancamento.numParcelas;
        } else {
          valorDevedor = valorParcelaTotal / 2;
          valorAdmin = valorParcelaTotal / 2;
        }
      } else {
        valorAdmin = valorParcelaTotal;
        valorDevedor = 0;
      }

      for (let i = 0; i < lancamento.numParcelas; i++) {
        const vencimento = addMonths(new Date(firstVencimento + 'T12:00:00'), i);
        await addDoc(collection(db, 'parcelas'), {
          userId: uid,
          lancamentoId: id,
          numeroParcela: i + 1,
          totalParcelas: lancamento.numParcelas,
          valorAdministrador: valorAdmin,
          valorDevedor: valorDevedor,
          dataVencimento: format(vencimento, 'yyyy-MM-dd'),
          situacao: 'Pendente'
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions/parcelas');
    }
  },

  updateParcelaSituacao: async (parcelaId: string, situacao: SituacaoParcela) => {
    const path = `parcelas/${parcelaId}`;
    try {
      await updateDoc(doc(db, 'parcelas', parcelaId), { situacao });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  updateLancamento: async (id: string, lancamento: Omit<Lancamento, 'id'>, firstVencimento: string) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      // 1. Update the main transaction
      await updateDoc(doc(db, 'transactions', id), lancamento);

      // 2. Delete existing installments
      const q = query(collection(db, 'parcelas'), where('lancamentoId', '==', id));
      const s = await getDocs(q);
      const deleteBatch = s.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deleteBatch);

      // 3. Create new installments
      const tipoDoc = await getDoc(doc(db, 'launchTypes', lancamento.tipoLancamentoId));
      const tipoData = tipoDoc.data() as TipoLancamento;
      const isDV = tipoData?.dv === true;

      const valorParcelaTotal = lancamento.valorTotal / lancamento.numParcelas;
      
      let valorAdmin: number;
      let valorDevedor: number;

      if (isDV) {
        valorAdmin = 0;
        valorDevedor = tipoData.flagMatematica === '+' ? -valorParcelaTotal : valorParcelaTotal;
      } else if (lancamento.dividirConta && lancamento.devedorId) {
        if (lancamento.valorDebitoDevedor && lancamento.valorDebitoDevedor > 0) {
          valorDevedor = lancamento.valorDebitoDevedor / lancamento.numParcelas;
          valorAdmin = (lancamento.valorTotal - lancamento.valorDebitoDevedor) / lancamento.numParcelas;
        } else {
          valorDevedor = valorParcelaTotal / 2;
          valorAdmin = valorParcelaTotal / 2;
        }
      } else {
        valorAdmin = valorParcelaTotal;
        valorDevedor = 0;
      }

      for (let i = 0; i < lancamento.numParcelas; i++) {
        const vencimento = addMonths(new Date(firstVencimento + 'T12:00:00'), i);
        await addDoc(collection(db, 'parcelas'), {
          userId: uid,
          lancamentoId: id,
          numeroParcela: i + 1,
          totalParcelas: lancamento.numParcelas,
          valorAdministrador: valorAdmin,
          valorDevedor: valorDevedor,
          dataVencimento: format(vencimento, 'yyyy-MM-dd'),
          situacao: 'Pendente'
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'transactions/parcelas');
    }
  },

  deleteLancamento: async (id: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const pathL = `transactions/${id}`;
    const pathP = 'parcelas';
    try {
      // Delete all parcelas first
      const q = query(collection(db, pathP), where('lancamentoId', '==', id));
      const s = await getDocs(q);
      const batch = s.docs.map(d => deleteDoc(d.ref));
      await Promise.all(batch);
      await deleteDoc(doc(db, 'transactions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${pathL}/${pathP}`);
    }
  },

  // Agenda Events
  getEventos: (callback: (eventos: Evento[]) => void) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return () => {};
    const q = query(collection(db, 'events'), where('userId', '==', uid));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evento)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });
  },

  addEvento: async (data: Omit<Evento, 'id'>) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await addDoc(collection(db, 'events'), {
        ...data,
        userId: uid,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'events');
    }
  },

  updateEvento: async (id: string, data: Partial<Evento>) => {
    try {
      const ref = doc(db, 'events', id);
      await updateDoc(ref, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'events');
    }
  },

  deleteEvento: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'events');
    }
  }
};
