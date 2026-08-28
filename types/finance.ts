export interface Administrador {
  id?: string;
  userId?: string;
  nome: string;
  email: string;
  pix?: string;
  contato?: string;
}

export interface Devedor {
  id: string;
  userId?: string;
  nome: string;
  cpf?: string;
  telefone: string;
  email?: string;
  observacoes?: string;
}

export interface Conta {
  id: string;
  userId?: string;
  nome: string;
  descricao: string;
  isReceita?: boolean;
}

export interface TipoLancamento {
  id: string;
  userId?: string;
  nome: string;
  flagMatematica: '+' | '-';
  dv?: boolean;
}

export type SituacaoParcela = 'Paga' | 'Pendente' | 'Atrasada';

export interface Lancamento {
  id: string;
  userId?: string;
  vencimentoInicial?: string;
  tipoLancamentoId: string;
  contaId: string;
  dividirConta: boolean;
  devedorId?: string;
  valorTotal: number;
  numParcelas: number;
  referente: string;
  dataCompra?: string;
  valorDebitoDevedor?: number;
}

export interface Parcela {
  id: string;
  userId?: string;
  lancamentoId: string;
  numeroParcela: number;
  totalParcelas: number;
  valorAdministrador: number;
  valorDevedor: number;
  dataVencimento: string;
  situacao: SituacaoParcela;
}

export interface Evento {
  id: string;
  userId?: string;
  titulo: string;
  descricao: string;
  data: string;
  finalizado: boolean;
  createdAt?: any;
}

export interface LancamentoCompleto extends Parcela {
  referente: string;
  contaNome: string;
  contaId: string;
  isReceita?: boolean;
  tipoNome: string;
  flagMatematica: '+' | '-';
  devedorNome?: string;
  devedorId?: string;
  dataCompra?: string;
  valorTotal: number;
  valorTotalLancamento: number;
  valorDebitoDevedor?: number;
  isDV?: boolean;
}
