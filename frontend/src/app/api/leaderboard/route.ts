import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';

// tokenIds 5-7 = live bot wallets (AlphaPredict, MomentumMaster, NeuralTrader)
const KNOWN_AGENT_IDS = [5, 6, 7];

const AGENT_NFT_ABI_LB = [
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
    name: 'getRecentDecisions',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'limit',   type: 'uint256' },
    ],
    outputs: [{
      name: '', type: 'tuple[]',
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

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.sepolia.mantle.xyz';
const NFT_ADDRESS = (process.env.NEXT_PUBLIC_AGENT_NFT_ADDRESS || '0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837') as `0x${string}`;
const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://sepolia.mantlescan.xyz';

function getClient() {
  return createPublicClient({ transport: http(RPC_URL) });
}

// GET /api/leaderboard?sortBy=winRate|pnl|decisions&limit=10&includeDecisions=true&decisionLimit=30
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get('sortBy') || 'winRate';
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
  const includeDecisions = searchParams.get('includeDecisions') === 'true';
  const decisionLimit = Math.min(parseInt(searchParams.get('decisionLimit') || '30'), 100);

  try {
    const client = getClient();
    const address = NFT_ADDRESS;
    const agents = [];
    const decisionsByAgent: Record<number, any[]> = {};

    for (const tokenId of KNOWN_AGENT_IDS) {
      try {
        const [profile, owner, recentDecisions] = await Promise.all([
          client.readContract({ address, abi: AGENT_NFT_ABI_LB, functionName: 'agentProfiles', args: [BigInt(tokenId)] }),
          client.readContract({ address, abi: AGENT_NFT_ABI_LB, functionName: 'ownerOf', args: [BigInt(tokenId)] }),
          client.readContract({ address, abi: AGENT_NFT_ABI_LB, functionName: 'getRecentDecisions', args: [BigInt(tokenId), BigInt(500)] })
            .catch(() => [] as any[]),
        ]);

        const [name, version, createdAt, , , , isActive] = Array.from(profile);
        if (!name || name === '') continue;

        const allDecisions = Array.from(recentDecisions as any[]).map((d: any) => ({
          direction: d.direction as string,
          confidence: Number(d.confidence),
          stake: Number(d.stake),
          timestamp: Number(d.timestamp),
          wasCorrect: Boolean(d.wasCorrect),
          pnl: Number(d.pnl),
          reasoning: d.reasoning as string,
          decisionHash: d.decisionHash as string,
        }));
        const resolved = allDecisions.filter(d => d.wasCorrect || d.pnl !== 0);
        const pending  = allDecisions.length - resolved.length;
        const total   = allDecisions.length;
        const correct = resolved.filter(d => d.wasCorrect).length;
        const winRate = resolved.length > 0 ? (correct / resolved.length) * 100 : 0;
        const totalPnL = resolved.reduce((s, d) => s + d.pnl, 0);

        if (includeDecisions) {
          decisionsByAgent[tokenId] = allDecisions;
        }

        agents.push({
          tokenId,
          name,
          version,
          address: owner,
          totalDecisions: total,
          resolvedDecisions: resolved.length,
          pendingDecisions: pending,
          correctDecisions: correct,
          totalPnL,
          winRate,
          isActive,
          createdAt: Number(createdAt),
          explorerUrl: `${EXPLORER_URL}/address/${owner}`,
        });
      } catch {
        // skip
      }
    }

    // Sort
    agents.sort((a, b) => {
      if (sortBy === 'decisions') return b.totalDecisions - a.totalDecisions;
      if (sortBy === 'pnl') return b.totalPnL - a.totalPnL;
      return b.winRate - a.winRate; // default: winRate
    });

    const ranked = agents.slice(0, limit).map((a, i) => ({
      rank: i + 1,
      ...a,
      winRateFormatted: a.winRate.toFixed(2) + '%',
      pnlFormatted: (a.totalPnL >= 0 ? '+' : '') + a.totalPnL.toFixed(2),
    }));

    let recentDecisions: any[] | undefined;
    if (includeDecisions) {
      const merged: any[] = [];
      for (const agent of agents) {
        const decs = decisionsByAgent[agent.tokenId] || [];
        decs.forEach(d => merged.push({ ...d, tokenId: agent.tokenId, name: agent.name, address: agent.address }));
      }
      merged.sort((a, b) => b.timestamp - a.timestamp);
      recentDecisions = merged.slice(0, decisionLimit);
    }

    return NextResponse.json({
      success: true,
      sortBy,
      total: agents.length,
      data: ranked,
      decisionsByAgent: includeDecisions ? decisionsByAgent : undefined,
      recentDecisions,
      contract: NFT_ADDRESS,
      explorerUrl: `${EXPLORER_URL}/address/${NFT_ADDRESS}`,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
