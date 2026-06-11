"""
One-time setup script for the MindClash hackathon benchmark session.

Run ONCE as the deployer before starting the bots:
    python session_manager.py

What it does:
  1. Starts a 24-hour benchmark session on AgentRegistry
  2. Creates ERC-8004 NFTs for each bot wallet on AgentNFT
  3. Registers each bot in AgentRegistry leaderboard
     (a dummy placeholder is registered first to avoid the index-0 ambiguity bug)
"""

import os
import sys
from dotenv import load_dotenv
from web3 import Web3
from loguru import logger

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
RPC_URL         = os.getenv('MANTLE_SEPOLIA_RPC', 'https://rpc.sepolia.mantle.xyz')
CHAIN_ID        = int(os.getenv('CHAIN_ID', '5003'))
DEPLOYER_KEY    = os.getenv('DEPLOYER_PRIVATE_KEY')
if not DEPLOYER_KEY:
    logger.error(
        'DEPLOYER_PRIVATE_KEY is required. '
        'Agents #5–#7 are already deployed on Mantle Sepolia — '
        'you only need this script for a fresh testnet setup.'
    )
    sys.exit(1)

AGENT_NFT_ADDR      = Web3.to_checksum_address(os.getenv('AGENT_NFT_ADDRESS',      '0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837'))
AGENT_REGISTRY_ADDR = Web3.to_checksum_address(os.getenv('AGENT_REGISTRY_ADDRESS', '0xbD19d3ec1B4d0f3852729b0dcC87bd739839cBDC'))

SESSION_DURATION = 86400  # 24 hours

AGENTS = [
    {
        'name':    'AlphaPredict',
        'version': '1.0.0',
        'address': '0xD33744400Ed8211F7a5900926Df22CD8C2A2aD74',
        'strategy': 'Momentum-based BTC/ETH price prediction',
    },
    {
        'name':    'MomentumMaster',
        'version': '1.0.0',
        'address': '0x62Bc9Ab4dCdd43eC1f6FdA4F71220f6F85b80A59',
        'strategy': 'Mean-reversion RSI/Bollinger bands strategy',
    },
    {
        'name':    'NeuralTrader',
        'version': '2.0.0',
        'address': '0x508EaDdf521Ae4887AecfeC2d7d7C43F94bd7c39',
        'strategy': 'Neural network multi-indicator fusion',
    },
]

# ── ABIs (minimal) ────────────────────────────────────────────────────────────
NFT_ABI = [
    {
        "name": "createAgent",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "agentAddress", "type": "address"},
            {"name": "name",         "type": "string"},
            {"name": "version",      "type": "string"},
            {"name": "tokenURI",     "type": "string"},
        ],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "name": "agentToToken",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "name": "agentProfiles",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "", "type": "uint256"}],
        "outputs": [
            {"name": "name",              "type": "string"},
            {"name": "version",           "type": "string"},
            {"name": "createdAt",         "type": "uint256"},
            {"name": "totalDecisions",    "type": "uint256"},
            {"name": "correctDecisions",  "type": "uint256"},
            {"name": "totalPnL",          "type": "uint256"},
            {"name": "isActive",          "type": "bool"},
        ],
    },
]

REGISTRY_ABI = [
    {
        "name": "startSession",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [{"name": "duration", "type": "uint256"}],
        "outputs": [],
    },
    {
        "name": "currentSession",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [
            {"name": "startTime",    "type": "uint256"},
            {"name": "endTime",      "type": "uint256"},
            {"name": "totalAgents",  "type": "uint256"},
            {"name": "activeAgents", "type": "uint256"},
            {"name": "isActive",     "type": "bool"},
        ],
    },
    {
        "name": "registerAgent",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "agentAddress", "type": "address"},
            {"name": "name",         "type": "string"},
            {"name": "version",      "type": "string"},
            {"name": "tokenURI",     "type": "string"},
        ],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "name": "agentLeaderboardIndex",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
    },
]


# ── Helper ────────────────────────────────────────────────────────────────────

class DeployerClient:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(RPC_URL))
        if not self.w3.is_connected():
            raise ConnectionError(f"Cannot reach RPC: {RPC_URL}")

        self.account = self.w3.eth.account.from_key(DEPLOYER_KEY)
        self.deployer = self.account.address
        self._nonce = self.w3.eth.get_transaction_count(self.deployer, 'pending')

        self.nft      = self.w3.eth.contract(address=AGENT_NFT_ADDR,      abi=NFT_ABI)
        self.registry = self.w3.eth.contract(address=AGENT_REGISTRY_ADDR, abi=REGISTRY_ABI)

        bal = self.w3.eth.get_balance(self.deployer)
        logger.info(f"Deployer: {self.deployer}  balance: {self.w3.from_wei(bal,'ether'):.4f} MNT")

    def _gas_params(self) -> dict:
        latest   = self.w3.eth.get_block('latest')
        base_fee = latest.get('baseFeePerGas', self.w3.to_wei(1, 'gwei'))
        tip      = self.w3.to_wei(1, 'gwei')
        return {'maxPriorityFeePerGas': tip, 'maxFeePerGas': base_fee * 2 + tip, 'type': 2}

    def _send(self, fn) -> str:
        gas   = int(fn.estimate_gas({'from': self.deployer}) * 1.25)
        tx    = fn.build_transaction({
            'from': self.deployer, 'nonce': self._nonce,
            'chainId': CHAIN_ID, 'gas': gas, **self._gas_params(),
        })
        signed   = self.w3.eth.account.sign_transaction(tx, DEPLOYER_KEY)
        tx_hash  = self.w3.eth.send_raw_transaction(signed.raw_transaction).hex()
        self._nonce += 1
        receipt  = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        status   = "✓" if receipt['status'] == 1 else "✗ REVERTED"
        logger.info(f"  {status} gasUsed={receipt['gasUsed']} tx={tx_hash}")
        if receipt['status'] != 1:
            raise RuntimeError(f"Transaction reverted: {tx_hash}")
        return tx_hash

    # ── Steps ─────────────────────────────────────────────────────────────────

    def start_session(self):
        session = self.registry.functions.currentSession().call()
        if session[4]:  # isActive
            logger.warning("Session already active — skipping startSession()")
            return
        logger.info(f"Starting benchmark session ({SESSION_DURATION}s = 24h)...")
        self._send(self.registry.functions.startSession(SESSION_DURATION))
        logger.success("Session started.")

    def register_dummy_placeholder(self):
        """
        Workaround for index-0 bug in AgentRegistry:
        agentLeaderboardIndex returns 0 for both 'not registered' and 'first slot'.
        Registering a placeholder at index 0 ensures real agents get indices >= 1.
        """
        dummy_addr = Web3.to_checksum_address('0x000000000000000000000000000000000000dEaD')
        idx = self.registry.functions.agentLeaderboardIndex(dummy_addr).call()
        if idx != 0:
            logger.info("Placeholder already registered — skipping.")
            return
        # Check if dummy NFT exists
        token_id = self.nft.functions.agentToToken(dummy_addr).call()
        if token_id == 0:
            logger.info("Registering index-0 placeholder...")
            self._send(self.registry.functions.registerAgent(
                dummy_addr, 'PLACEHOLDER', '0.0.0', 'ipfs://placeholder'
            ))
            logger.success("Placeholder registered at leaderboard index 0.")
        else:
            logger.info("Placeholder NFT already exists.")

    def ensure_nft_exists(self, agent: dict) -> int:
        """Create agent NFT if not already present; return tokenId."""
        addr = Web3.to_checksum_address(agent['address'])
        token_id = self.nft.functions.agentToToken(addr).call()
        if token_id != 0:
            logger.info(f"  NFT already exists for {agent['name']}: tokenId={token_id}")
            return token_id

        uri = (
            f"data:application/json;base64,"
            + __import__('base64').b64encode(
                __import__('json').dumps({
                    'name': agent['name'],
                    'description': agent['strategy'],
                    'version': agent['version'],
                    'network': 'Mantle Sepolia',
                    'hackathon': 'Mantle Turing Test 2026',
                }).encode()
            ).decode()
        )

        logger.info(f"  Creating NFT for {agent['name']} ({addr})...")
        self._send(self.nft.functions.createAgent(addr, agent['name'], agent['version'], uri))

        token_id = self.nft.functions.agentToToken(addr).call()
        logger.success(f"  {agent['name']} → tokenId={token_id}")
        return token_id

    def register_in_registry(self, agent: dict):
        """
        Register agent in AgentRegistry leaderboard.

        NOTE: AgentRegistry.registerAgent internally calls AgentNFT.createAgent.
        If the NFT already exists (created in step 3), the tx will revert with
        'Agent already exists'. This is a known contract limitation — we skip
        gracefully. Decisions are recorded directly via AgentNFT instead.
        """
        addr = Web3.to_checksum_address(agent['address'])
        idx  = self.registry.functions.agentLeaderboardIndex(addr).call()
        if idx != 0:
            logger.info(f"  {agent['name']} already in leaderboard (idx={idx}) — skipping.")
            return

        uri = f"ipfs://mindclash/{agent['name'].lower()}"
        logger.info(f"  Registering {agent['name']} in AgentRegistry...")
        try:
            self._send(self.registry.functions.registerAgent(
                addr, agent['name'], agent['version'], uri
            ))
            idx = self.registry.functions.agentLeaderboardIndex(addr).call()
            logger.success(f"  {agent['name']} registered at leaderboard index={idx}")
        except Exception as e:
            if 'Agent already exists' in str(e):
                logger.warning(
                    f"  {agent['name']}: AgentRegistry.registerAgent skipped — "
                    f"NFT already exists. Decisions will be recorded directly via AgentNFT."
                )
            else:
                raise


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    logger.info("═══ MindClash Session Manager ═══")
    client = DeployerClient()

    # Step 1 — start benchmark session
    logger.info("\n[1/4] Starting benchmark session on AgentRegistry...")
    client.start_session()

    # Step 2 — placeholder to fix index-0 bug
    logger.info("\n[2/4] Registering index-0 placeholder...")
    client.register_dummy_placeholder()

    # Step 3 — create NFTs for bot wallets
    logger.info("\n[3/4] Creating ERC-8004 NFTs for bot wallets...")
    token_ids = {}
    for agent in AGENTS:
        token_id = client.ensure_nft_exists(agent)
        token_ids[agent['name']] = token_id

    # Step 4 — register in AgentRegistry leaderboard
    logger.info("\n[4/4] Registering agents in AgentRegistry leaderboard...")
    for agent in AGENTS:
        client.register_in_registry(agent)

    # Summary
    logger.info("\n═══ Setup complete ═══")
    logger.info(f"  {'Agent':20s} {'tokenId':>8}  {'Wallet address'}")
    logger.info(f"  {'-'*20} {'-'*8}  {'-'*42}")
    for agent in AGENTS:
        tid  = token_ids.get(agent['name'], '?')
        addr = Web3.to_checksum_address(agent['address'])
        logger.success(f"  {agent['name']:20s} {str(tid):>8}  {addr}")
        explorer = f"https://sepolia.mantlescan.xyz/token/{AGENT_NFT_ADDR}?a={tid}"
        logger.info(f"  {'':20s} {'NFT:':>8}  {explorer}")

    logger.info("")
    logger.success("Bots will record decisions directly via AgentNFT (no session dependency).")
    logger.success("Now run: python main.py")


if __name__ == '__main__':
    main()
