"""
On-chain transaction module for AI Trading Agents
Gas-optimized transaction submission to AgentRegistry on Mantle Sepolia
"""

import os
import time
from typing import Optional
from dotenv import load_dotenv
from web3 import Web3
from loguru import logger

load_dotenv()

# ── Contract addresses ─────────────────────────────────────────────────────────
MANTLE_RPC_URL      = os.getenv('MANTLE_SEPOLIA_RPC', 'https://rpc.sepolia.mantle.xyz')
AGENT_NFT_ADDR      = os.getenv('AGENT_NFT_ADDRESS',      '0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837')
AGENT_REGISTRY_ADDR = os.getenv('AGENT_REGISTRY_ADDRESS', '0xbD19d3ec1B4d0f3852729b0dcC87bd739839cBDC')
CHAIN_ID            = int(os.getenv('CHAIN_ID', '5003'))

# ── ABIs — minimal, only what bots need ───────────────────────────────────────
NFT_ABI = [
    {
        "name": "recordDecision",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "tokenId",   "type": "uint256"},
            {"name": "direction", "type": "string"},
            {"name": "confidence","type": "uint256"},
            {"name": "stake",     "type": "uint256"},
            {"name": "reasoning", "type": "string"},
        ],
        "outputs": [{"name": "", "type": "bytes32"}],
    },
    {
        "name": "resolveDecision",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "tokenId",       "type": "uint256"},
            {"name": "decisionIndex", "type": "uint256"},
            {"name": "wasCorrect",    "type": "bool"},
            {"name": "pnl",           "type": "int256"},
        ],
        "outputs": [],
    },
    {
        "name": "getRecentDecisions",
        "type": "function",
        "stateMutability": "view",
        "inputs": [
            {"name": "tokenId", "type": "uint256"},
            {"name": "limit",   "type": "uint256"},
        ],
        "outputs": [{
            "name": "", "type": "tuple[]",
            "components": [
                {"name": "direction",    "type": "string"},
                {"name": "confidence",   "type": "uint256"},
                {"name": "stake",        "type": "uint256"},
                {"name": "timestamp",    "type": "uint256"},
                {"name": "wasCorrect",   "type": "bool"},
                {"name": "pnl",          "type": "int256"},
                {"name": "reasoning",    "type": "string"},
                {"name": "decisionHash", "type": "bytes32"},
            ],
        }],
    },
    {
        "name": "agentToToken",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
    },
]

REGISTRY_ABI = [
    {
        "name": "recordAgentDecision",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "agentAddress", "type": "address"},
            {"name": "direction",    "type": "string"},
            {"name": "confidence",   "type": "uint256"},
            {"name": "stake",        "type": "uint256"},
            {"name": "reasoning",    "type": "string"},
        ],
        "outputs": [{"name": "", "type": "bytes32"}],
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
        "name": "agentLeaderboardIndex",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
    },
]


class AgentBlockchainClient:
    """
    Gas-optimized blockchain client for a single AI agent wallet.

    Gas optimisation strategy:
    - EIP-1559 (type-2) transactions: maxFeePerGas = 2× baseFee + priority tip
    - gas estimate + 20 % buffer (avoids out-of-gas, wastes nothing)
    - local nonce cache (no extra eth_getTransactionCount round-trip per tx)
    - skip HOLD decisions (nothing to record on-chain)
    - short reasoning string (reduces calldata bytes → lower gas)
    """

    def __init__(self, agent_name: str, agent_address: str, private_key: str):
        self.agent_name    = agent_name
        self.agent_address = Web3.to_checksum_address(agent_address)
        self.private_key   = private_key

        self.w3 = Web3(Web3.HTTPProvider(MANTLE_RPC_URL))

        if not self.w3.is_connected():
            raise ConnectionError(f"Cannot connect to RPC: {MANTLE_RPC_URL}")

        self.nft      = self.w3.eth.contract(address=Web3.to_checksum_address(AGENT_NFT_ADDR),      abi=NFT_ABI)
        self.registry = self.w3.eth.contract(address=Web3.to_checksum_address(AGENT_REGISTRY_ADDR), abi=REGISTRY_ABI)

        # Resolve tokenId for this wallet once at startup
        self._token_id: Optional[int] = self._resolve_token_id()

        # Cached nonce — incremented locally after each successful tx
        self._nonce: Optional[int] = None

        # Track decision count locally so we can resolve previous decisions
        # Seeded from blockchain to survive restarts
        self._decision_count: int = self._fetch_decision_count()

        balance = self.w3.eth.get_balance(self.agent_address)
        logger.info(
            f"[{agent_name}] wallet={self.agent_address} "
            f"tokenId={self._token_id} "
            f"balance={self.w3.from_wei(balance, 'ether'):.6f} MNT"
        )

    # ── Public helpers ─────────────────────────────────────────────────────────

    def _fetch_decision_count(self) -> int:
        """Query the real number of decisions from decisionHistory on startup."""
        if self._token_id is None:
            return 0
        try:
            records = self.nft.functions.getRecentDecisions(self._token_id, 2000).call()
            return len(records)
        except Exception as e:
            logger.warning(f"[{self.agent_name}] Could not fetch decision count: {e}")
            return 0

    def _resolve_token_id(self) -> Optional[int]:
        """Look up the ERC-8004 tokenId for this agent wallet."""
        try:
            tid = self.nft.functions.agentToToken(self.agent_address).call()
            return tid if tid != 0 else None
        except Exception as e:
            logger.warning(f"[{self.agent_name}] Could not resolve tokenId: {e}")
            return None

    def is_session_active(self) -> bool:
        """Check whether a benchmark session is currently active."""
        try:
            session = self.registry.functions.currentSession().call()
            # session tuple: (startTime, endTime, totalAgents, activeAgents, isActive)
            return bool(session[4])
        except Exception as e:
            logger.warning(f"[{self.agent_name}] Session check failed: {e}")
            return False

    def is_agent_registered(self) -> bool:
        """Return True if this agent address is in the leaderboard."""
        try:
            idx = self.registry.functions.agentLeaderboardIndex(self.agent_address).call()
            return idx != 0
        except Exception as e:
            logger.warning(f"[{self.agent_name}] Registration check failed: {e}")
            return False

    def resolve_decision(
        self,
        decision_index: int,
        was_correct: bool,
        pnl: int,
    ) -> Optional[str]:
        """
        Resolve a previously recorded decision on-chain.
        Called after the price has moved enough to determine correctness.
        pnl: signed integer in basis-points (100 = 1%)
        """
        if self._token_id is None:
            logger.warning(f"[{self.agent_name}] Cannot resolve — no tokenId")
            return None
        try:
            fn = self.nft.functions.resolveDecision(
                self._token_id, decision_index, was_correct, pnl
            )
            return self._submit(fn, f"resolve[{decision_index}] correct={was_correct} pnl={pnl}")
        except Exception as e:
            logger.warning(f"[{self.agent_name}] resolveDecision failed: {e}")
            self._nonce = None
            return None

    def send_decision(
        self,
        direction: str,     # "UP" or "DOWN"
        confidence: float,  # 0.0 – 1.0
        stake: float,       # base units (MNT)
        reasoning: str,
    ) -> Optional[str]:
        """
        Send decision on-chain and return tx hash, or None on failure.

        Primary path:   AgentNFT.recordDecision  (no session needed)
        Secondary path: AgentRegistry.recordAgentDecision  (if session active + registered)

        Skips HOLD — nothing to record.
        Trims reasoning to 128 chars to minimise calldata.
        """
        if direction == "HOLD":
            logger.debug(f"[{self.agent_name}] Skipping HOLD decision (no gas wasted)")
            return None

        # Scale float values to uint256
        confidence_int = int(confidence * 1000)   # 0-1000 (0.1% precision)
        stake_int      = int(stake * 100)          # integer cents
        short_reason   = reasoning[:128]           # calldata limit

        prev_count = self._decision_count
        try:
            tx = self._send_via_nft(direction, confidence_int, stake_int, short_reason)
            self._decision_count += 1
            return tx
        except Exception as e:
            logger.error(f"[{self.agent_name}] NFT tx failed: {e}")
            self._decision_count = prev_count
            self._nonce = None

        # Fallback: try via AgentRegistry
        try:
            if self.is_session_active() and self.is_agent_registered():
                return self._send_via_registry(direction, confidence_int, stake_int, short_reason)
        except Exception as e:
            logger.error(f"[{self.agent_name}] Registry tx also failed: {e}")
            self._nonce = None

        return None

    # ── Internal ───────────────────────────────────────────────────────────────

    def _nonce_value(self) -> int:
        if self._nonce is None:
            self._nonce = self.w3.eth.get_transaction_count(self.agent_address, 'pending')
        return self._nonce

    def _gas_params(self) -> dict:
        """EIP-1559: maxFeePerGas = 2×baseFee + 1gwei tip."""
        latest   = self.w3.eth.get_block('latest')
        base_fee = latest.get('baseFeePerGas', self.w3.to_wei(1, 'gwei'))
        tip      = self.w3.to_wei(1, 'gwei')
        return {'maxPriorityFeePerGas': tip, 'maxFeePerGas': base_fee * 2 + tip, 'type': 2}

    def _estimate_gas(self, fn_call) -> int:
        """Estimate gas with 20% buffer; fallback to 300k."""
        try:
            return int(fn_call.estimate_gas({'from': self.agent_address}) * 1.2)
        except Exception:
            return 300_000

    def _submit(self, fn, label: str) -> str:
        """Build, sign, send tx — returns hex hash."""
        gas    = self._estimate_gas(fn)
        nonce  = self._nonce_value()
        tx     = fn.build_transaction({
            'from': self.agent_address, 'nonce': nonce,
            'chainId': CHAIN_ID, 'gas': gas, **self._gas_params(),
        })
        signed   = self.w3.eth.account.sign_transaction(tx, self.private_key)
        tx_hash  = self.w3.eth.send_raw_transaction(signed.raw_transaction).hex()
        self._nonce += 1
        logger.success(f"[{self.agent_name}] ✓ {label} gas={gas} tx={tx_hash}")
        self._log_receipt_async(tx_hash)
        return tx_hash

    def _send_via_nft(self, direction: str, confidence: int, stake: int, reasoning: str) -> str:
        """Primary: AgentNFT.recordDecision — no session required."""
        if self._token_id is None:
            # Re-try lookup (may have been registered after init)
            self._token_id = self._resolve_token_id()
        if self._token_id is None:
            raise RuntimeError("No tokenId found — run session_manager.py first")

        fn = self.nft.functions.recordDecision(
            self._token_id, direction, confidence, stake, reasoning
        )
        return self._submit(fn, f"{direction}(NFT tokenId={self._token_id}) conf={confidence/10:.1f}%")

    def _send_via_registry(
        self, direction: str, confidence: int, stake: int, reasoning: str
    ) -> str:
        """Fallback: AgentRegistry.recordAgentDecision — requires active session."""
        fn = self.registry.functions.recordAgentDecision(
            self.agent_address, direction, confidence, stake, reasoning
        )
        return self._submit(fn, f"{direction}(Registry) conf={confidence/10:.1f}%")

    def _log_receipt_async(self, tx_hash: str):
        """Wait up to 30 s for receipt and log gas used."""
        import threading

        def _wait():
            try:
                receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)
                status  = "✓ success" if receipt['status'] == 1 else "✗ reverted"
                logger.info(
                    f"[{self.agent_name}] receipt {status} "
                    f"gasUsed={receipt['gasUsed']} block={receipt['blockNumber']}"
                )
            except Exception as e:
                logger.warning(f"[{self.agent_name}] Receipt timeout: {e}")

        threading.Thread(target=_wait, daemon=True).start()


# ── Factory: load all three agents from .env ──────────────────────────────────

def load_all_agents() -> list[AgentBlockchainClient]:
    """Instantiate blockchain clients for all configured agents."""
    agents = []
    for i in (1, 2, 3):
        name    = os.getenv(f'AGENT_{i}_NAME')
        address = os.getenv(f'AGENT_{i}_ADDRESS')
        key     = os.getenv(f'AGENT_{i}_PRIVATE_KEY')
        if name and address and key:
            try:
                client = AgentBlockchainClient(name, address, key)
                agents.append(client)
            except Exception as e:
                logger.error(f"Failed to init agent {i} ({name}): {e}")
    return agents
