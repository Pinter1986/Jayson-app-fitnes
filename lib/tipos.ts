export type Papel = "aluno" | "admin";

export interface Perfil {
  id: string;
  papel: Papel;
  nome: string;
  email: string | null;
  whatsapp: string | null;
  nascimento: string | null;
  sexo: "M" | "F" | null;
  origem: string | null;
  codigo_indicacao: string;
  avisos_email: boolean;
  avisos_whatsapp: boolean;
  ativo: boolean;
  criado_em: string;
}

export interface Plano {
  id: string;
  nome: string;
  tipo: "presencial" | "online" | "avulsa" | "dupla" | "avaliacao";
  preco_centavos: number;
  aulas_semana: number | null;
  aulas_mes: number | null;
  meses: number;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
}

export interface Assinatura {
  id: string;
  aluno_id: string;
  plano_id: string;
  valor_centavos: number;
  dia_vencimento: 5 | 10;
  inicio: string;
  status: "pendente" | "ativa" | "cancelamento_pedido" | "encerrada";
  cancelamento_pedido_em: string | null;
  fim: string | null;
  plans?: Plano;
}

export interface Academia {
  id: string;
  nome: string;
  intervalo_min: number;
  ativo: boolean;
  ordem: number;
}

export type StatusReserva = "marcada" | "cancelada" | "cancelada_tarde" | "dada" | "falta";

export interface Reserva {
  id: string;
  aluno_id: string;
  inicio: string;
  fim: string;
  academia_id: string;
  status: StatusReserva;
  dupla: boolean;
  cobranca_id: string | null;
  gyms?: Pick<Academia, "nome">;
  profiles?: Pick<Perfil, "nome" | "whatsapp">;
}

export interface Cobranca {
  id: string;
  aluno_id: string;
  assinatura_id: string | null;
  tipo: "mensalidade" | "avulsa" | "dupla" | "avaliacao" | "outro";
  descricao: string;
  competencia: string | null;
  vencimento: string;
  valor_centavos: number;
  multa_centavos: number;
  taxa_centavos: number;
  forma: "pix" | "credito" | "debito" | "dinheiro" | "tap_to_pay" | null;
  parcelas: number;
  status: "aberta" | "paga" | "cancelada";
  pago_em: string | null;
  profiles?: Pick<Perfil, "nome" | "whatsapp">;
}

export interface Exercicio {
  id: string;
  nome: string;
  grupo: string | null;
  video_url: string | null;
  tecnica: string | null;
  observacao: string | null;
  ativo: boolean;
}

export interface Treino {
  id: string;
  aluno_id: string | null;
  nome: string;
  observacao: string | null;
  ativo: boolean;
  ordem: number;
  publicado_em: string;
}

export interface ItemTreino {
  id: string;
  treino_id: string;
  exercicio_id: string;
  ordem: number;
  series: number | null;
  repeticoes: string | null;
  carga_sugerida: string | null;
  descanso_seg: number | null;
  tecnica: string | null;
  observacao: string | null;
  exercises?: Exercicio;
}

export interface RegistroTreino {
  id: string;
  aluno_id: string;
  treino_id: string | null;
  item_id: string | null;
  data: string;
  carga_kg: number | null;
  repeticoes: number | null;
  esforco: number | null;
  cardio_tipo: string | null;
  cardio_min: number | null;
  cardio_km: number | null;
  observacao: string | null;
}

export interface TextoLegal {
  versao: string;
  texto: string;
}

export interface Ajustes {
  duracao_aula_min: number;
  alunos_por_horario: number;
  abertura_dias: number;
  antecedencia_min_horas: number;
  cancelamento_horas: number;
  multa_pct: number;
  juros_mes_pct: number;
  taxas_cartao: { debito?: number; credito?: Record<string, number> };
  taxas_sao_exemplo: boolean;
  whatsapp: string | null;
  chave_pix: string | null;
  combinados: string;
  textos: {
    contrato?: TextoLegal;
    termos_privacidade?: TextoLegal;
    responsabilidade?: TextoLegal;
    fotos_acompanhamento?: TextoLegal;
    divulgacao?: TextoLegal;
    vendas_titulo?: string;
    vendas_bio?: string;
  };
}
