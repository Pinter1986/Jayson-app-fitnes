// Gráfico de linha simples em SVG (sem biblioteca)
export default function Grafico({ pontos, unidade = "" }: { pontos: { rotulo: string; valor: number }[]; unidade?: string }) {
  if (pontos.length < 2) return null;
  const L = 300, A = 90, M = 8;
  const valores = pontos.map((p) => p.valor);
  const min = Math.min(...valores), max = Math.max(...valores);
  const faixa = max - min || 1;
  const xy = pontos.map((p, i) => [M + (i * (L - 2 * M)) / (pontos.length - 1), A - M - ((p.valor - min) * (A - 2 * M)) / faixa]);
  const ultimo = pontos[pontos.length - 1];
  return (
    <figure>
      <svg viewBox={`0 0 ${L} ${A}`} className="h-24 w-full" role="img" aria-label={`De ${pontos[0].valor}${unidade} para ${ultimo.valor}${unidade}`}>
        <polyline points={xy.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {xy.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill="var(--accent)" />
        ))}
      </svg>
      <figcaption className="flex justify-between text-xs text-muted">
        <span>{pontos[0].rotulo}: {pontos[0].valor}{unidade}</span>
        <span>{ultimo.rotulo}: {ultimo.valor}{unidade}</span>
      </figcaption>
    </figure>
  );
}
