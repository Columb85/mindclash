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
] as const;

function getClient() {
  return createPublicClient({ transport: http(process.env.NEXT_PUBLIC_RPC_URL) });
}

// GET /api/agents/[id]
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const tokenId = parseInt(params.id);
  if (isNaN(tokenId) || tokenId < 1) {
    return NextResponse.json({ error: 'Invalid token ID' }, { status: 400 });
  }

  try {
    const client = getClient();
    const address = process.env.NEXT_PUBLIC_AGENT_NFT_ADDRESS as `0x${string}`;

    const [profile, owner] = await Promise.all([
      client.readContract({ address, abi: AGENT_NFT_ABI, functionName: 'agentProfiles', args: [BigInt(tokenId)] }),
      client.readContract({ address, abi: AGENT_NFT_ABI, functionName: 'ownerOf', args: [BigInt(tokenId)] }),
    ]);

    const [name, version, createdAt, totalDecisions, correctDecisions, totalPnL, isActive] = profile as unknown as any[];
    if (!name || name === '') {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const total = Number(totalDecisions);
    const correct = Number(correctDecisions);

    return NextResponse.json({
      success: true,
      data: {
        tokenId,
        name,
        version,
        createdAt: Number(createdAt),
        totalDecisions: total,
        correctDecisions: correct,
        totalPnL: totalPnL.toString(),
        isActive,
        owner,
        winRate: total > 0 ? ((correct / total) * 100).toFixed(2) : '0.00',
        explorerUrl: `${process.env.NEXT_PUBLIC_EXPLORER_URL}/address/${owner}`,
        nftUrl: `${process.env.NEXT_PUBLIC_EXPLORER_URL}/token/${address}?a=${tokenId}`,
      },
      timestamp: Date.now(),
    });
  } catch (error: any) {
    if (error.message?.includes('nonexistent') || error.message?.includes('invalid token')) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
