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

function getClient() {
  return createPublicClient({ transport: http(process.env.NEXT_PUBLIC_RPC_URL) });
}

// GET /api/leaderboard?sortBy=winRate|pnl|decisions&limit=10
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get('sortBy') || 'winRate';
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

  try {
    const client = getClient();
    const address = process.env.NEXT_PUBLIC_AGENT_NFT_ADDRESS as `0x${string}`;
    const agents = [];

    for (const tokenId of KNOWN_AGENT_IDS) {
      try {
        const [profile, owner, recentDecisions] = await Promise.all([
          client.readContract({ address, abi: AGENT_NFT_ABI_LB, functionName: 'agentProfiles', args: [BigInt(tokenId)] }),
          client.readContract({ address, abi: AGENT_NFT_ABI_LB, functionName: 'ownerOf', args: [BigInt(tokenId)] }),
          // Workaround: recordDecision() never increments totalDecisions in agentProfiles
          client.readContract({ address, abi: AGENT_NFT_ABI_LB, functionName: 'getRecentDecisions', args: [BigInt(tokenId), BigInt(500)] })
            .catch(() => [] as any[]),
        ]);

        const [name, version, createdAt, , , totalPnL, isActive] = Array.from(profile);
        if (!name || name === '') continue;

        const allDecisions = Array.from(recentDecisions as any[]);
        const total   = allDecisions.length;
        const correct = allDecisions.filter((d: any) => d.wasCorrect).length;
        const winRate = total > 0 ? (correct / total) * 100 : 0;

        agents.push({
          tokenId,
          name,
          version,
          address: owner,
          totalDecisions: total,
          correctDecisions: correct,
          totalPnL: Number(totalPnL),
          winRate,
          isActive,
          createdAt: Number(createdAt),
          explorerUrl: `${process.env.NEXT_PUBLIC_EXPLORER_URL}/address/${owner}`,
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

    return NextResponse.json({
      success: true,
      sortBy,
      total: agents.length,
      data: ranked,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
