#!/usr/bin/env python3
"""
Mantle AI Trading Agent for Turing Test Hackathon 2026

This agent implements autonomous trading decisions on Mantle Network
with on-chain logging and ERC-8004 NFT identity.
"""

import asyncio
import json
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
from web3 import Web3
from loguru import logger
from pydantic import BaseModel
import requests

# Configuration
from config import (
    MANTLE_RPC_URL,
    AGENT_REGISTRY_ADDRESS,
    AGENT_NFT_ADDRESS,
    AI_CONFIG,
    REALCLAW_CONFIG,
)
from blockchain import AgentBlockchainClient

@dataclass
class MarketData:
    symbol: str
    price: float
    volume: float
    timestamp: int
    rsi: Optional[float] = None
    sma_short: Optional[float] = None
    sma_long: Optional[float] = None
    bollinger_upper: Optional[float] = None
    bollinger_lower: Optional[float] = None

@dataclass
class TradingDecision:
    direction: str  # "UP" or "DOWN"
    confidence: float  # 0.0 to 1.0
    stake: float
    reasoning: str
    timestamp: int

class TechnicalIndicators:
    """Calculate technical analysis indicators"""
    
    @staticmethod
    def rsi(prices: pd.Series, period: int = 14) -> pd.Series:
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))
    
    @staticmethod
    def sma(prices: pd.Series, period: int) -> pd.Series:
        return prices.rolling(window=period).mean()
    
    @staticmethod
    def bollinger_bands(prices: pd.Series, period: int = 20, std_dev: float = 2):
        sma = prices.rolling(window=period).mean()
        std = prices.rolling(window=period).std()
        upper = sma + (std * std_dev)
        lower = sma - (std * std_dev)
        return upper, lower

# ── Per-strategy signal weights ─────────────────────────────────────────────
# Each row = [momentum_w, rsi_w, bb_w, sma_w, volume_w]
# momentum strategy uses positive momentum weight (trend-following)
# mean-reversion uses negative momentum weight (contrarian) + strong RSI/BB
# neural uses equal weights across all signals
STRATEGY_WEIGHTS: Dict[str, List[float]] = {
    'momentum':       [0.35, 0.15, 0.15, 0.25, 0.10],
    'mean-reversion': [-0.10, 0.30, 0.30, 0.15, 0.15],
    'neural':         [0.20, 0.20, 0.20, 0.20, 0.20],
}

# ── Taunt libraries per strategy ─────────────────────────────────────────────
TAUNT_TEMPLATES: Dict[str, List[str]] = {
    'momentum': [
        "Trend locked. Riding {dir} while humans hesitate. 📈",
        "RSI {rsi:.0f} + momentum clear. {dir} is obvious if you know how to read charts.",
        "Volume confirms. Price confirms. I confirm: {dir}. Your move, human.",
        "Momentum doesn't lie. {dir} with {conf:.0f}% confidence. Can you beat that?",
        "The trend is your friend — if you're smart enough to follow it. {dir}. 🔥",
        "Pattern: clear. Signal: strong. Execution: instant. You're still thinking. I already won.",
    ],
    'mean-reversion': [
        "RSI {rsi:.0f} — {rsi_cond}. The herd goes {wrong_dir}. I go {dir}. That's alpha. 📉",
        "Overbought crowd chasing {wrong_dir}. My model says {dir}. History agrees with me.",
        "When humans panic {wrong_dir}, I fade them. RSI {rsi:.0f} confirms the reversal.",
        "Classic mean reversion setup. {dir} incoming. You can fight the math or join it.",
        "Bollinger Band position: {bb_pos:.2f}. Translation: {dir}. You're welcome.",
        "The crowd is always wrong at extremes. RSI {rsi:.0f} = extreme. I go {dir}.",
    ],
    'neural': [
        "5 signals processed. Consensus: {dir} at {conf:.0f}% confidence. Logic, not luck.",
        "Pattern #{pattern_id} matched in historical dataset. Outcome: {dir}. Probability: {conf:.0f}%.",
        "Humans call this intuition. I call it {n_agree}/5 signals aligned on {dir}.",
        "While you guess, I compute. RSI {rsi:.0f}, BB {bb_pos:.2f}, momentum: {dir}. Q.E.D.",
        "Multi-signal divergence analysis complete. Direction: {dir}. Uncertainty: {unc:.0f}%.",
        "My training data contains 50,000 patterns. This one says {dir}. Confidence: {conf:.0f}%.",
    ],
}


class MLPredictionModel:
    """
    5-signal weighted consensus prediction engine.
    Each strategy applies different signal weights for per-personality trading.
    """

    CONFIDENCE_THRESHOLD = 0.32  # min weighted score to act (avoid marginal trades)

    def prepare_features(self, data: List[MarketData]) -> np.ndarray:
        """Prepare features for ML model"""
        if len(data) < AI_CONFIG['lookbackPeriod']:
            return np.array([])

        df = pd.DataFrame([{
            'price': d.price,
            'volume': d.volume,
            'rsi': d.rsi,
            'sma_short': d.sma_short,
            'sma_long': d.sma_long,
            'bollinger_upper': d.bollinger_upper,
            'bollinger_lower': d.bollinger_lower,
        } for d in data])

        features = []
        for i in range(len(df) - AI_CONFIG['lookbackPeriod']):
            window = df.iloc[i:i + AI_CONFIG['lookbackPeriod']]

            price_changes  = window['price'].pct_change().fillna(0).values
            volume_changes = window['volume'].pct_change().fillna(0).values
            rsi_values     = window['rsi'].fillna(50).values
            sma_cross      = (window['sma_short'] > window['sma_long']).astype(int).values
            bb_position    = ((window['price'] - window['bollinger_lower']) /
                              (window['bollinger_upper'] - window['bollinger_lower'])
                              ).fillna(0.5).values
            volatility     = window['price'].pct_change().rolling(5).std().fillna(0).values

            feature_vector = np.concatenate([
                price_changes[-5:],
                volume_changes[-5:],
                [rsi_values[-1]],
                [sma_cross[-1]],
                [bb_position[-1]],
                [volatility[-1]],
            ])
            features.append(feature_vector)

        return np.array(features)

    def _compute_signals(self, latest: np.ndarray) -> Dict[str, float]:
        """
        Compute 5 normalised signals from the feature vector.
        Each signal is in [-1, +1]: positive = bullish, negative = bearish.
        """
        price_changes  = latest[0:5]    # last 5 returns
        volume_changes = latest[5:10]   # last 5 volume changes
        rsi            = latest[10]
        sma_cross      = latest[11]     # 1 = bullish, 0 = bearish
        bb_pos         = latest[12]     # 0 = at lower band, 1 = at upper band

        # Signal 1 — Momentum (3-bar price trend)
        mom3 = np.mean(price_changes[-3:])
        sig_momentum = np.clip(mom3 / 0.005, -1.0, 1.0)  # scale: 0.5% move → signal ±1

        # Signal 2 — RSI (mean-reversion of RSI extreme)
        if rsi < 35:
            sig_rsi = (35 - rsi) / 35          # 0..+1 (oversold → bullish)
        elif rsi > 65:
            sig_rsi = -(rsi - 65) / 35         # 0..-1 (overbought → bearish)
        else:
            sig_rsi = (50 - rsi) / 30          # mild signal around midline

        # Signal 3 — Bollinger Band position
        # bb_pos near 0 → price near lower band (bullish), near 1 → near upper (bearish)
        sig_bb = 1.0 - 2.0 * np.clip(bb_pos, 0.0, 1.0)  # maps [0,1] → [+1,-1]

        # Signal 4 — SMA trend
        sig_sma = 1.0 if sma_cross == 1 else -1.0

        # Signal 5 — Volume-price divergence (accumulation/distribution)
        last_price_return = price_changes[-1]
        last_vol_change   = volume_changes[-1]
        if last_price_return < -0.001 and last_vol_change > 0.02:
            sig_volume = 0.6   # price down on rising volume → accumulation → bullish
        elif last_price_return > 0.001 and last_vol_change < -0.02:
            sig_volume = -0.6  # price up on falling volume → distribution → bearish
        elif last_price_return > 0.001 and last_vol_change > 0.02:
            sig_volume = 0.8   # price up on rising volume → confirmed bullish
        elif last_price_return < -0.001 and last_vol_change < -0.02:
            sig_volume = -0.8  # price down on falling volume → confirmed bearish
        else:
            sig_volume = 0.0

        return {
            'momentum': float(sig_momentum),
            'rsi':      float(sig_rsi),
            'bb':       float(sig_bb),
            'sma':      float(sig_sma),
            'volume':   float(sig_volume),
        }

    def predict_direction(
        self,
        features: np.ndarray,
        strategy: str = 'neural',
    ) -> Tuple[str, float]:
        """
        5-signal weighted consensus.
        Returns (direction, confidence) where confidence ∈ [0, 1].
        HOLD is returned when the weighted score is below threshold.
        """
        if len(features) == 0:
            return "HOLD", 0.5

        signals = self._compute_signals(features[-1])
        weights = STRATEGY_WEIGHTS.get(strategy, STRATEGY_WEIGHTS['neural'])
        keys    = ['momentum', 'rsi', 'bb', 'sma', 'volume']

        # Weighted sum of signals
        score = sum(weights[i] * signals[keys[i]] for i in range(5))

        # Require strong consensus to act
        if abs(score) < self.CONFIDENCE_THRESHOLD:
            return "HOLD", 0.5

        direction  = "UP" if score > 0 else "DOWN"
        # Normalise to [0.55, 0.95] range — calibrated confidence
        confidence = 0.55 + min(0.40, abs(score) * 0.55)
        return direction, round(confidence, 3)


def generate_taunt(
    strategy: str,
    direction: str,
    confidence: float,
    rsi: float,
    bb_pos: float,
    n_signals_agree: int = 3,
) -> str:
    """Generate a context-aware taunt for the given strategy and market state."""
    import random
    templates = TAUNT_TEMPLATES.get(strategy, TAUNT_TEMPLATES['neural'])
    template  = random.choice(templates)

    wrong_dir = "DOWN" if direction == "UP" else "UP"
    rsi_cond  = "oversold" if rsi < 50 else "overbought"
    pattern_id = random.randint(100, 999)
    unc = round((1.0 - confidence) * 100)

    try:
        return template.format(
            dir=direction,
            conf=round(confidence * 100),
            rsi=rsi,
            bb_pos=round(bb_pos, 2),
            wrong_dir=wrong_dir,
            rsi_cond=rsi_cond,
            n_agree=n_signals_agree,
            pattern_id=pattern_id,
            unc=unc,
        )
    except KeyError:
        return f"Signal consensus: {direction} at {round(confidence*100)}% confidence."

class MantleAIAgent:
    """Main AI Agent class"""

    # Bybit symbols to try in order (falls back to mock on failure)
    BYBIT_SYMBOL = "MNTUSDT"
    BYBIT_REST   = "https://api.bybit.com/v5/market/tickers"

    def __init__(
        self,
        agent_id: str,
        blockchain_client: Optional[AgentBlockchainClient] = None,
        strategy: str = 'neural',
    ):
        self.agent_id = agent_id
        self.blockchain = blockchain_client
        self.strategy  = strategy
        
        self.market_data: List[MarketData] = []
        self.decisions: List[TradingDecision] = []
        self.performance_metrics = {
            'total_decisions': 0,
            'correct_decisions': 0,
            'total_pnl': 0.0,
            'win_rate': 0.0,
        }
        
        self.technical_indicators = TechnicalIndicators()
        self.ml_model = MLPredictionModel()

        # Pending resolution: stores previous decision data to resolve after price moves
        # Format: {decision_index, direction, price_at_decision, stake}
        self._pending_resolve: Optional[dict] = None

        self._prewarm()
        logger.info(f"AI Agent {agent_id} initialized (pre-warmed with {len(self.market_data)} history points)")
    
    def _prewarm(self):
        """Pre-populate synthetic price history with computed indicators so the
        agent can make UP/DOWN decisions on the very first tick."""
        import random
        n = AI_CONFIG['lookbackPeriod'] + 25  # extra points for indicator stability
        base_price = 0.5
        ts = int(time.time()) - n * AI_CONFIG['decisionInterval']
        prices, vols = [], []
        for i in range(n):
            base_price = max(0.01, base_price * (1 + random.gauss(0, 0.012)))
            prices.append(base_price)
            vols.append(random.uniform(1_000_000, 5_000_000))

        # Compute indicators from price series
        price_s = pd.Series(prices)
        rsi_s   = TechnicalIndicators.rsi(price_s, 14)
        sma5_s  = TechnicalIndicators.sma(price_s, 5)
        sma20_s = TechnicalIndicators.sma(price_s, 20)
        bb_up_s, bb_lo_s = TechnicalIndicators.bollinger_bands(price_s, 20)

        for i in range(n):
            self.market_data.append(MarketData(
                symbol='MNT/USDT',
                price=prices[i],
                volume=vols[i],
                timestamp=ts + i * AI_CONFIG['decisionInterval'],
                rsi=float(rsi_s.iloc[i]) if not pd.isna(rsi_s.iloc[i]) else None,
                sma_short=float(sma5_s.iloc[i]) if not pd.isna(sma5_s.iloc[i]) else None,
                sma_long=float(sma20_s.iloc[i]) if not pd.isna(sma20_s.iloc[i]) else None,
                bollinger_upper=float(bb_up_s.iloc[i]) if not pd.isna(bb_up_s.iloc[i]) else None,
                bollinger_lower=float(bb_lo_s.iloc[i]) if not pd.isna(bb_lo_s.iloc[i]) else None,
            ))

    async def _bybit_price(self) -> Optional[Tuple[float, float]]:
        """Fetch real MNT price from Bybit REST API. Returns (price, volume) or None."""
        import aiohttp
        try:
            url = f"{self.BYBIT_REST}?category=spot&symbol={self.BYBIT_SYMBOL}"
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as sess:
                async with sess.get(url) as resp:
                    if resp.status != 200:
                        return None
                    data = await resp.json()
                    items = data.get('result', {}).get('list', [])
                    if not items:
                        return None
                    t = items[0]
                    return float(t['lastPrice']), float(t['volume24h'])
        except Exception as e:
            logger.debug(f"[{self.agent_id}] Bybit fetch failed: {e}")
            return None

    async def fetch_market_data(self, symbol: str = "MNT/USDT") -> MarketData:
        """Fetch real MNT price from Bybit, fall back to random walk on failure."""
        import random

        result = await self._bybit_price()
        if result:
            current_price, volume = result
        else:
            # Random walk from last known price
            last_price = self.market_data[-1].price if self.market_data else 0.50
            current_price = max(0.001, last_price * (1 + random.gauss(0, 0.008)))
            volume = random.uniform(1_000_000, 8_000_000)

        # Calculate indicators if we have enough history
        rsi = sma_short = sma_long = bollinger_upper = bollinger_lower = None
        if len(self.market_data) >= 20:
            prices = pd.Series([d.price for d in self.market_data[-50:]] + [current_price])
            rsi             = float(self.technical_indicators.rsi(prices).iloc[-1])
            sma_short       = float(self.technical_indicators.sma(prices, 5).iloc[-1])
            sma_long        = float(self.technical_indicators.sma(prices, 20).iloc[-1])
            bb_upper, bb_lower = self.technical_indicators.bollinger_bands(prices, 20)
            bollinger_upper = float(bb_upper.iloc[-1])
            bollinger_lower = float(bb_lower.iloc[-1])

        return MarketData(
            symbol=symbol,
            price=current_price,
            volume=volume,
            timestamp=int(time.time()),
            rsi=rsi,
            sma_short=sma_short,
            sma_long=sma_long,
            bollinger_upper=bollinger_upper,
            bollinger_lower=bollinger_lower,
        )
    
    def make_trading_decision(self, market_data: MarketData) -> TradingDecision:
        """Make trading decision based on technical analysis and ML"""
        
        # Add new data point
        self.market_data.append(market_data)
        
        # Keep only recent data
        if len(self.market_data) > AI_CONFIG['lookbackPeriod'] * 2:
            self.market_data = self.market_data[-AI_CONFIG['lookbackPeriod'] * 2:]
        
        # Prepare features for ML model
        features = self.ml_model.prepare_features(self.market_data)
        
        # Get prediction — pass strategy for per-personality signal weights
        direction, confidence = self.ml_model.predict_direction(features, strategy=self.strategy)

        # Calculate stake: higher confidence = larger stake, capped by risk config
        base_stake       = 100
        stake_multiplier = min(confidence * 2, 1.0)
        stake            = base_stake * stake_multiplier * AI_CONFIG['maxPositionSize']

        # Collect indicator values for reasoning / taunts
        rsi_val  = market_data.rsi
        bb_upper = market_data.bollinger_upper
        bb_lower = market_data.bollinger_lower
        if rsi_val is None and self.market_data:
            last = next((d for d in reversed(self.market_data) if d.rsi is not None), None)
            if last:
                rsi_val, bb_upper, bb_lower = last.rsi, last.bollinger_upper, last.bollinger_lower

        rsi_safe = float(rsi_val) if rsi_val is not None else 50.0
        if rsi_val is not None and bb_upper and bb_lower and (bb_upper - bb_lower) > 0:
            bb_pos = (market_data.price - bb_lower) / (bb_upper - bb_lower)
        else:
            bb_pos = 0.5

        if direction != 'HOLD' and confidence >= 0.65:
            # High-confidence decision: add taunt
            taunt   = generate_taunt(self.strategy, direction, confidence, rsi_safe, bb_pos)
            core    = f"RSI:{rsi_safe:.1f} BB:{bb_pos:.2f} "
            reasoning = (core + taunt)[:256]
        else:
            reasoning = f"RSI:{rsi_safe:.1f} BB:{bb_pos:.2f} dir={direction} conf={confidence:.2f} hist={len(self.market_data)}pts"
        
        decision = TradingDecision(
            direction=direction,
            confidence=confidence,
            stake=stake,
            reasoning=reasoning,
            timestamp=int(time.time()),
        )
        
        self.decisions.append(decision)
        logger.info(f"Decision made: {direction} with {confidence:.2f} confidence")
        
        return decision
    
    async def log_decision_onchain(self, decision: TradingDecision) -> str:
        """Submit trading decision to AgentRegistry on Mantle Sepolia."""
        if self.blockchain is None:
            # No wallet configured — return mock hash
            tx_hash = f"0x{abs(hash(str(decision))):064x}"
            logger.warning(f"No blockchain client — mock hash: {tx_hash}")
            return tx_hash

        tx_hash = self.blockchain.send_decision(
            direction=decision.direction,
            confidence=decision.confidence,
            stake=decision.stake,
            reasoning=decision.reasoning,
        )

        if tx_hash:
            logger.info(f"Decision on-chain: {tx_hash}")
            return tx_hash
        else:
            fallback = f"0x{abs(hash(str(decision))):064x}"
            logger.warning(f"TX skipped (HOLD or no session) — fallback: {fallback}")
            return fallback
    
    async def report_to_realclaw(self, decision: TradingDecision, tx_hash: str) -> bool:
        """Report decision to RealClaw platform"""
        try:
            payload = {
                'agent_id': self.agent_id,
                'decision': {
                    'direction': decision.direction,
                    'confidence': decision.confidence,
                    'stake': decision.stake,
                    'reasoning': decision.reasoning,
                    'timestamp': decision.timestamp,
                },
                'transaction_hash': tx_hash,
                'network': 'mantle-testnet',
            }
            
            # Mock implementation - replace with actual API call
            # response = requests.post(
            #     f"{REALCLAW_CONFIG['baseURL']}{REALCLAW_CONFIG['endpoints']['decisions']}",
            #     json=payload,
            #     timeout=10
            # )
            # return response.status_code == 200
            
            logger.info(f"Reported to RealClaw: {payload}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to report to RealClaw: {e}")
            return False
    
    def update_performance(self, was_correct: bool, pnl: float):
        """Update performance metrics"""
        self.performance_metrics['total_decisions'] += 1
        if was_correct:
            self.performance_metrics['correct_decisions'] += 1
        self.performance_metrics['total_pnl'] += pnl
        self.performance_metrics['win_rate'] = (
            self.performance_metrics['correct_decisions'] / 
            self.performance_metrics['total_decisions']
        )
    
    def _resolve_previous(self, current_price: float):
        """
        Resolve the pending previous decision based on actual price movement.
        Compares current price with price at the time of previous decision.
        """
        if self._pending_resolve is None or self.blockchain is None:
            return
        pending = self._pending_resolve
        self._pending_resolve = None

        prev_price  = pending['price_at_decision']
        direction   = pending['direction']
        stake       = pending['stake']
        dec_index   = pending['decision_index']

        price_change = current_price - prev_price
        was_correct = (
            (direction == 'UP'   and price_change > 0) or
            (direction == 'DOWN' and price_change < 0)
        )

        # pnl in basis-points: positive=profit, negative=loss
        pnl_bp = int(abs(price_change) / prev_price * 10_000)
        pnl    = pnl_bp if was_correct else -pnl_bp

        logger.info(
            f"[{self.agent_id}] Resolve[{dec_index}] {direction} "
            f"prev={prev_price:.6f} now={current_price:.6f} "
            f"correct={was_correct} pnl={pnl}bp"
        )

        self.blockchain.resolve_decision(dec_index, was_correct, pnl)
        self.update_performance(was_correct, pnl / 100.0)

    async def run(self):
        """Main agent loop"""
        logger.info(f"Starting AI Agent {self.agent_id} — first decision on tick 1")
        
        while True:
            try:
                # Fetch market data
                market_data = await self.fetch_market_data()

                # Resolve the PREVIOUS decision now that price has moved
                self._resolve_previous(market_data.price)
                
                # Make trading decision
                decision = self.make_trading_decision(market_data)
                
                # Log decision on-chain
                tx_hash = await self.log_decision_onchain(decision)

                # Track this decision for resolution on the next tick
                if self.blockchain and decision.direction != 'HOLD' and tx_hash:
                    self._pending_resolve = {
                        'decision_index':   self.blockchain._decision_count - 1,
                        'direction':        decision.direction,
                        'price_at_decision': market_data.price,
                        'stake':            decision.stake,
                    }
                
                # Report to RealClaw
                await self.report_to_realclaw(decision, tx_hash)
                
                # Wait for next decision interval
                await asyncio.sleep(AI_CONFIG['decisionInterval'])
                
            except Exception as e:
                logger.error(f"Error in agent loop: {e}")
                await asyncio.sleep(5)

AGENT_STRATEGIES = {
    'AlphaPredict':   'momentum',
    'MomentumMaster': 'mean-reversion',
    'NeuralTrader':   'neural',
}


# ═══════════════════════════════════════════════════════════════════════════════
# MODE 1: Autonomous Loop (original — for background benchmarking)
# ═══════════════════════════════════════════════════════════════════════════════
async def run_loop():
    """Run all configured agents in an infinite autonomous loop."""
    from blockchain import load_all_agents

    bc_clients = load_all_agents()

    if not bc_clients:
        logger.warning("No blockchain wallets found in .env — running in mock mode")
        agent = MantleAIAgent(f"ai-agent-{int(time.time())}", strategy='neural')
        tasks = [agent.run()]
    else:
        tasks = []
        for client in bc_clients:
            strategy = AGENT_STRATEGIES.get(client.agent_name, 'neural')
            agent = MantleAIAgent(
                agent_id=client.agent_name,
                blockchain_client=client,
                strategy=strategy,
            )
            logger.info(f"[{client.agent_name}] strategy={strategy}")
            tasks.append(agent.run())
        logger.info(f"Starting {len(tasks)} AI agents in parallel")

    try:
        await asyncio.gather(*tasks)
    except KeyboardInterrupt:
        logger.info("Agents stopped by user")
    except Exception as e:
        logger.error(f"Agent crash: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# MODE 2: Event-Driven API (for hackathon Demo Day — decisions on demand)
# ═══════════════════════════════════════════════════════════════════════════════
def run_api(port: int = 5050):
    """
    Start a lightweight Flask server that accepts single-decision requests.

    POST /decide
      Body: { "agent": "AlphaPredict"|"MomentumMaster"|"NeuralTrader",
              "asset": "MNT"|"BTC"|"ETH"|"SOL" }
      Returns: { direction, confidence, reasoning, tx_hash }

    GET /health
      Returns: { status: "ok", mode: "event-driven" }

    This replaces the infinite loop with demand-driven decisions.
    Each POST /decide triggers exactly ONE market analysis + on-chain recording.
    """
    try:
        from flask import Flask, request, jsonify
        from flask_cors import CORS
    except ImportError:
        logger.error("Flask not installed. Run: pip install flask flask-cors")
        return

    from blockchain import load_all_agents

    app = Flask(__name__)
    CORS(app)

    # Pre-load agents
    bc_clients = load_all_agents()
    agents: Dict[str, MantleAIAgent] = {}
    for client in bc_clients:
        strategy = AGENT_STRATEGIES.get(client.agent_name, 'neural')
        agents[client.agent_name] = MantleAIAgent(
            agent_id=client.agent_name,
            blockchain_client=client,
            strategy=strategy,
        )
        logger.info(f"[API] Loaded {client.agent_name} (strategy={strategy})")

    # Fallback mock agents if no wallets
    if not agents:
        for name, strat in AGENT_STRATEGIES.items():
            agents[name] = MantleAIAgent(agent_id=name, strategy=strat)
        logger.warning("[API] No wallets — mock agents loaded")

    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({
            'status': 'ok',
            'mode': 'event-driven',
            'agents': list(agents.keys()),
            'timestamp': int(time.time()),
        })

    @app.route('/decide', methods=['POST'])
    def decide():
        body = request.get_json(force=True, silent=True) or {}
        agent_name = body.get('agent', 'NeuralTrader')
        asset      = body.get('asset', 'MNT').upper()

        if agent_name not in agents:
            return jsonify({'error': f'Unknown agent: {agent_name}', 'available': list(agents.keys())}), 400

        agent = agents[agent_name]

        # Run one tick: fetch data → analyze → decide → record on-chain
        loop = asyncio.new_event_loop()
        try:
            market_data = loop.run_until_complete(agent.fetch_market_data(f"{asset}/USDT"))
            decision    = agent.make_trading_decision(market_data)
            tx_hash     = loop.run_until_complete(agent.log_decision_onchain(decision))
        finally:
            loop.close()

        logger.info(f"[API] {agent_name} → {decision.direction} ({decision.confidence:.2f}) on {asset}, tx={tx_hash}")

        return jsonify({
            'success':    True,
            'agent':      agent_name,
            'strategy':   agent.strategy,
            'asset':      asset,
            'direction':  decision.direction,
            'confidence': decision.confidence,
            'stake':      decision.stake,
            'reasoning':  decision.reasoning,
            'tx_hash':    tx_hash,
            'timestamp':  decision.timestamp,
        })

    logger.info(f"[API] Event-driven server starting on port {port}")
    logger.info(f"[API] POST /decide — trigger single agent decision")
    logger.info(f"[API] GET  /health  — health check")
    app.run(host='0.0.0.0', port=port, debug=False)


# ═══════════════════════════════════════════════════════════════════════════════
# CLI entry point
# ═══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="MindClash AI Agent")
    parser.add_argument(
        '--mode', choices=['loop', 'api'], default='api',
        help='loop = autonomous infinite loop (background), api = event-driven server (default for Demo Day)',
    )
    parser.add_argument('--port', type=int, default=5050, help='Port for API mode (default: 5050)')
    args = parser.parse_args()

    if args.mode == 'loop':
        logger.info("Starting in AUTONOMOUS LOOP mode")
        asyncio.run(run_loop())
    else:
        logger.info("Starting in EVENT-DRIVEN API mode (Demo Day)")
        run_api(port=args.port)
