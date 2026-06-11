/** Agent creation limits — must match backend AGENT_LIMITS */

export const MAX_AGENTS_PER_WALLET = 1;

export const AGENT_STRATEGIES = [
  {
    id: 'momentum' as const,
    name: 'Momentum',
    color: '#3b82f6',
    description: 'Follows trends — buys strength, sells weakness.',
  },
  {
    id: 'mean-reversion' as const,
    name: 'Mean-Reversion',
    color: '#a855f7',
    description: 'Fades extremes — buys dips, sells rallies.',
  },
  {
    id: 'neural' as const,
    name: 'Neural Net',
    color: '#22c55e',
    description: 'Weighted composite of all signals.',
  },
];

export type AgentStrategyId = typeof AGENT_STRATEGIES[number]['id'];

export interface UserAgentRecord {
  creatorAddress: string;
  tokenId: number;
  name: string;
  strategy: AgentStrategyId;
  version: string;
  txHash: string | null;
  createdAt: number;
}
