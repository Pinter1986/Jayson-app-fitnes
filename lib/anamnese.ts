// Perguntas da anamnese. Substituir pelas do formulário atual do Jayson (Google Forms) quando ele enviar.

// PAR-Q: questionário de prontidão para atividade física
export const PARQ = [
  "Algum médico já disse que você tem problema de coração e que só deve fazer atividade física recomendada por médico?",
  "Você sente dor no peito quando faz atividade física?",
  "No último mês, você sentiu dor no peito sem estar fazendo atividade física?",
  "Você perde o equilíbrio por tontura ou já perdeu a consciência?",
  "Você tem problema ósseo ou articular que pode piorar com atividade física?",
  "Algum médico receita remédio para sua pressão ou coração?",
  "Você sabe de algum outro motivo que impeça você de fazer atividade física?",
];

export const PERGUNTAS = [
  { id: "objetivo", rotulo: "Qual o seu principal objetivo?", tipo: "texto" },
  { id: "historico", rotulo: "Já treinou antes? Há quanto tempo e com que frequência?", tipo: "texto" },
  { id: "lesoes", rotulo: "Tem ou teve alguma lesão, dor ou cirurgia?", tipo: "texto" },
  { id: "medicamentos", rotulo: "Usa algum medicamento contínuo?", tipo: "texto" },
  { id: "doencas", rotulo: "Tem alguma condição de saúde (diabetes, hipertensão, outra)?", tipo: "texto" },
  { id: "sono", rotulo: "Como é o seu sono?", tipo: "texto" },
  { id: "alimentacao", rotulo: "Como é a sua alimentação hoje?", tipo: "texto" },
  { id: "disponibilidade", rotulo: "Quais dias e horários você prefere treinar?", tipo: "texto" },
] as const;
