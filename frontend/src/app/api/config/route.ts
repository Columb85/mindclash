import { NextResponse } from 'next/server';

// GET /api/config — returns network and contract addresses
// Runs server-side on Vercel, no private data exposed
export async function GET() {
  return NextResponse.json({
    network: {
      chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '5003'),
      rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
      explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL,
    },
    contracts: {
      agentNFT:      process.env.NEXT_PUBLIC_AGENT_NFT_ADDRESS,
      agentRegistry: process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS,
      roundEngine:   process.env.NEXT_PUBLIC_ROUND_ENGINE_ADDRESS,
      treasury:      process.env.NEXT_PUBLIC_TREASURY_ADDRESS,
      clashToken:    process.env.NEXT_PUBLIC_CLASH_TOKEN_ADDRESS,
      oracleAdapter: process.env.NEXT_PUBLIC_ORACLE_ADAPTER_ADDRESS,
    },
    timestamp: Date.now(),
  });
}
