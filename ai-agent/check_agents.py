"""Quick status check for all agents."""
import os
from dotenv import load_dotenv
from web3 import Web3
from blockchain import AgentBlockchainClient, AGENT_NFT_ADDR

load_dotenv()

PROFILES_ABI = [{
    "name": "agentProfiles", "type": "function", "stateMutability": "view",
    "inputs": [{"name": "", "type": "uint256"}],
    "outputs": [
        {"name": "name",             "type": "string"},
        {"name": "version",          "type": "string"},
        {"name": "createdAt",        "type": "uint256"},
        {"name": "totalDecisions",   "type": "uint256"},
        {"name": "correctDecisions", "type": "uint256"},
        {"name": "totalPnL",         "type": "uint256"},
        {"name": "isActive",         "type": "bool"},
    ],
}]

print("\n=== Agent Status ===\n")
for i in (1, 2, 3):
    name = os.getenv(f'AGENT_{i}_NAME')
    addr = os.getenv(f'AGENT_{i}_ADDRESS')
    key  = os.getenv(f'AGENT_{i}_PRIVATE_KEY')
    c    = AgentBlockchainClient(name, addr, key)
    bal  = c.w3.from_wei(c.w3.eth.get_balance(c.agent_address), 'ether')
    decisions = 0
    if c._token_id:
        nft_full = c.w3.eth.contract(address=Web3.to_checksum_address(AGENT_NFT_ADDR), abi=PROFILES_ABI)
        profile   = nft_full.functions.agentProfiles(c._token_id).call()
        decisions = profile[3]  # totalDecisions
    print(f"  {name:<20} tokenId={c._token_id}  decisions={decisions}  balance={bal:.4f} MNT")

print()
