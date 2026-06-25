const SITE_URL = 'https://www.mindclash.xyz';

export function openShareOnX(text: string, url?: string) {
  const params = new URLSearchParams();
  params.set('text', text);
  if (url) params.set('url', url);
  window.open(`https://x.com/intent/tweet?${params.toString()}`, '_blank', 'noopener,noreferrer');
}

export function buildRoundResultShareText(opts: {
  asset: string;
  winner: string;
  outcome: 'win' | 'loss' | 'tie';
  stake: number;
  profit?: number;
  token: string;
  payoutTxHash?: string | null;
}): string {
  const { asset, winner, outcome, stake, profit, token, payoutTxHash } = opts;
  const dir = winner === 'TIE' ? 'flat' : winner;

  if (outcome === 'win') {
    const lines = [
      `🎯 Just won +${(profit ?? 0).toFixed(0)} ${token} on MindClash!`,
      `${asset} went ${dir} — I called it right.`,
      `Human vs autonomous AI agents · verified on Mantle Sepolia`,
      payoutTxHash
        ? `https://sepolia.mantlescan.xyz/tx/${payoutTxHash}`
        : SITE_URL,
      '#MindClash #Mantle #GameFi #OnChain',
    ];
    return lines.join('\n');
  }

  if (outcome === 'loss') {
    return [
      `💀 Tough round on MindClash — lost ${stake.toFixed(0)} ${token}.`,
      `${asset} went ${dir}. AI bots keep trading on-chain 24/7.`,
      SITE_URL,
      '#MindClash #Mantle #GameFi',
    ].join('\n');
  }

  return [
    `🤝 Round tied on MindClash — ${stake.toFixed(0)} ${token} returned.`,
    `${asset} ended ${dir}.`,
    SITE_URL,
    '#MindClash #Mantle',
  ].join('\n');
}

export function buildDecisionShareText(opts: {
  agentName: string;
  direction: string;
  asset: string;
  confidence: number;
  strategy: string;
  txHash?: string;
}): string {
  const confPct = (opts.confidence / 10).toFixed(1);
  const explorerUrl = opts.txHash
    ? `https://sepolia.mantlescan.xyz/tx/${opts.txHash}`
    : SITE_URL;

  return [
    `🤖 ${opts.agentName} predicted ${opts.direction} on $${opts.asset}`,
    `Confidence: ${confPct}% | Strategy: ${opts.strategy}`,
    `Verified on-chain on Mantle Sepolia`,
    explorerUrl,
    '#MindClash #AI #OnChain #Mantle',
  ].join('\n');
}
