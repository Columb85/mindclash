import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';

const AGENT_NFT_ABI = [
  {
    name: 'agentProfiles',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'createdAt', type: 'uint256' },
      { name: 'totalDecisions', type: 'uint256' },
      { name: 'correctDecisions', type: 'uint256' },
      { name: 'totalPnL', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
    ],
  },
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    // Workaround: recordDecision() doesn't increment totalDecisions in agentProfiles.
    // We read decisionHistory length via getRecentDecisions to get the real count.
    name: 'getRecentDecisions',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'limit',   type: 'uint256' },
    ],
    outputs: [{
      name: '',
      type: 'tuple[]',
      components: [
        { name: 'direction',    type: 'string'  },
        { name: 'confidence',   type: 'uint256' },
        { name: 'stake',        type: 'uint256' },
        { name: 'timestamp',    type: 'uint256' },
        { name: 'wasCorrect',   type: 'bool'    },
        { name: 'pnl',          type: 'int256'  },
        { name: 'reasoning',    type: 'string'  },
        { name: 'decisionHash', type: 'bytes32' },
      ],
    }],
  },
] as const;

// tokenIds 1-3 = original NFTs; 5-7 = bot wallets (AlphaPredict, MomentumMaster, NeuralTrader)
const KNOWN_AGENT_IDS = [1, 2, 3, 5, 6, 7];

const AGENT_STRATEGIES: Record<string, string> = {
  'AlphaPredict':   'momentum',
  'MomentumMaster': 'mean-reversion',
  'NeuralTrader':   'neural',
};

function getClient() {
  return createPublicClient({
    transport: http(process.env.NEXT_PUBLIC_RPC_URL),
  });
}

// GET /api/agents
export async function GET() {
  try {
    const client = getClient();
    const address = process.env.NEXT_PUBLIC_AGENT_NFT_ADDRESS as `0x${string}`;
    const agents = [];

    for (const tokenId of KNOWN_AGENT_IDS) {
      try {
        const [profile, owner, decisions] = await Promise.all([
          client.readContract({ address, abi: AGENT_NFT_ABI, functionName: 'agentProfiles', args: [BigInt(tokenId)] }),
          client.readContract({ address, abi: AGENT_NFT_ABI, functionName: 'ownerOf', args: [BigInt(tokenId)] }),
          // Workaround: read actual decision count from decisionHistory (totalDecisions in profile stays 0
          // because recordDecision() doesn't increment it — only resolveDecision() does, which is never called)
          client.readContract({ address, abi: AGENT_NFT_ABI, functionName: 'getRecentDecisions', args: [BigInt(tokenId), BigInt(500)] })
            .catch(() => [] as any[]),
        ]);

        const [name, version, createdAt, , , totalPnL, isActive] = Array.from(profile);
        if (!name || name === '') continue;

        // Real count from decisionHistory, not from the broken agentProfiles counter
        const allDecisions = Array.from(decisions as any[]);
        const total   = allDecisions.length;
        const correct = allDecisions.filter((d: any) => d.wasCorrect).length;
        const upCount   = allDecisions.filter((d: any) => d.direction === 'UP').length;
        const downCount = allDecisions.filter((d: any) => d.direction === 'DOWN').length;
        const last = allDecisions[allDecisions.length - 1] ?? null;

        agents.push({
          tokenId,
          name,
          version,
          createdAt: Number(createdAt),
          totalDecisions: total,
          correctDecisions: correct,
          totalPnL: Number(totalPnL),
          isActive,
          owner,
          strategy: AGENT_STRATEGIES[name as string] ?? 'momentum',
          winRate: total > 0 ? ((correct / total) * 100).toFixed(2) : '0.00',
          upCount,
          downCount,
          lastDecision: last ? {
            direction: last.direction,
            confidence: Number(last.confidence) / 10,
            reasoning: last.reasoning,
            timestamp: Number(last.timestamp),
          } : null,
          explorerUrl: `${process.env.NEXT_PUBLIC_EXPLORER_URL}/address/${owner}`,
          nftUrl: `${process.env.NEXT_PUBLIC_EXPLORER_URL}/token/${address}?a=${tokenId}`,
        });
      } catch {
        // agent doesn't exist yet — skip
      }
    }

    return NextResponse.json({ success: true, total: agents.length, agents, timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
