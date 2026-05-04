"""
RealClaw API Integration for Mantle AI Trading Agent
Connects to RealClaw platform for DeFi protocol access on Mantle
"""

import requests
from typing import Dict, List, Optional
from dataclasses import dataclass
from loguru import logger

@dataclass
class DeFiProtocol:
    name: str
    address: str
    tvl: float
    apy: float

@dataclass
class TradingPair:
    symbol: str
    price: float
    volume_24h: float
    liquidity: float
    protocol: str

class RealClawClient:
    """
    Client for RealClaw API integration
    Documentation: https://docs.byreal.io/realclaw/what-is-realclaw
    """
    
    def __init__(self, api_key: str, base_url: str = "https://api.byreal.io/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        })
    
    def get_mantle_protocols(self) -> List[DeFiProtocol]:
        """
        Get list of DeFi protocols on Mantle Network
        Includes: Merchant Moe, Agni Finance, Fluxion
        """
        try:
            response = self.session.get(
                f"{self.base_url}/protocols",
                params={"chain": "mantle"}
            )
            response.raise_for_status()
            
            protocols = []
            for proto in response.json().get("data", []):
                protocols.append(DeFiProtocol(
                    name=proto["name"],
                    address=proto["address"],
                    tvl=proto["tvl"],
                    apy=proto.get("apy", 0)
                ))
            
            logger.info(f"Fetched {len(protocols)} Mantle protocols")
            return protocols
            
        except Exception as e:
            logger.error(f"Failed to fetch Mantle protocols: {e}")
            return []
    
    def get_trading_pairs(self, protocol: str = "merchant-moe") -> List[TradingPair]:
        """
        Get available trading pairs from a specific protocol
        """
        try:
            response = self.session.get(
                f"{self.base_url}/pairs",
                params={
                    "chain": "mantle",
                    "protocol": protocol
                }
            )
            response.raise_for_status()
            
            pairs = []
            for pair in response.json().get("data", []):
                pairs.append(TradingPair(
                    symbol=pair["symbol"],
                    price=pair["price"],
                    volume_24h=pair["volume24h"],
                    liquidity=pair["liquidity"],
                    protocol=protocol
                ))
            
            logger.info(f"Fetched {len(pairs)} trading pairs from {protocol}")
            return pairs
            
        except Exception as e:
            logger.error(f"Failed to fetch trading pairs: {e}")
            return []
    
    def get_price_data(self, symbol: str, timeframe: str = "1h") -> Dict:
        """
        Get historical price data for a trading pair
        """
        try:
            response = self.session.get(
                f"{self.base_url}/prices/{symbol}",
                params={
                    "chain": "mantle",
                    "timeframe": timeframe,
                    "limit": 100
                }
            )
            response.raise_for_status()
            
            data = response.json().get("data", {})
            logger.info(f"Fetched price data for {symbol}")
            return data
            
        except Exception as e:
            logger.error(f"Failed to fetch price data: {e}")
            return {}
    
    def execute_trade(
        self,
        protocol: str,
        pair: str,
        amount: float,
        direction: str,
        slippage: float = 0.5
    ) -> Optional[str]:
        """
        Execute a trade through RealClaw
        Returns transaction hash if successful
        """
        try:
            response = self.session.post(
                f"{self.base_url}/trade",
                json={
                    "chain": "mantle",
                    "protocol": protocol,
                    "pair": pair,
                    "amount": amount,
                    "direction": direction,
                    "slippage": slippage
                }
            )
            response.raise_for_status()
            
            result = response.json()
            tx_hash = result.get("txHash")
            
            logger.info(f"Trade executed: {tx_hash}")
            return tx_hash
            
        except Exception as e:
            logger.error(f"Failed to execute trade: {e}")
            return None
    
    def get_portfolio_stats(self, address: str) -> Dict:
        """
        Get portfolio statistics for an address
        """
        try:
            response = self.session.get(
                f"{self.base_url}/portfolio/{address}",
                params={"chain": "mantle"}
            )
            response.raise_for_status()
            
            stats = response.json().get("data", {})
            logger.info(f"Fetched portfolio stats for {address}")
            return stats
            
        except Exception as e:
            logger.error(f"Failed to fetch portfolio stats: {e}")
            return {}

# Mock implementation for testing without API key
class MockRealClawClient(RealClawClient):
    """
    Mock client for testing without actual RealClaw API access
    """
    
    def __init__(self):
        self.api_key = "mock"
        self.base_url = "mock"
    
    def get_mantle_protocols(self) -> List[DeFiProtocol]:
        return [
            DeFiProtocol("Merchant Moe", "0x...", 50_000_000, 15.5),
            DeFiProtocol("Agni Finance", "0x...", 30_000_000, 12.3),
            DeFiProtocol("Fluxion", "0x...", 20_000_000, 18.7),
        ]
    
    def get_trading_pairs(self, protocol: str = "merchant-moe") -> List[TradingPair]:
        return [
            TradingPair("MNT/USDT", 0.85, 1_000_000, 5_000_000, protocol),
            TradingPair("ETH/MNT", 2500.0, 2_000_000, 10_000_000, protocol),
            TradingPair("BTC/MNT", 45000.0, 3_000_000, 15_000_000, protocol),
        ]
    
    def get_price_data(self, symbol: str, timeframe: str = "1h") -> Dict:
        import random
        base_price = 100.0
        return {
            "prices": [base_price + random.uniform(-5, 5) for _ in range(100)],
            "timestamps": list(range(100)),
            "volumes": [random.uniform(10000, 50000) for _ in range(100)]
        }
    
    def execute_trade(
        self,
        protocol: str,
        pair: str,
        amount: float,
        direction: str,
        slippage: float = 0.5
    ) -> Optional[str]:
        return f"0x{'0' * 64}"  # Mock transaction hash
    
    def get_portfolio_stats(self, address: str) -> Dict:
        return {
            "totalValue": 10000.0,
            "pnl": 1500.0,
            "winRate": 65.5,
            "totalTrades": 100
        }

# Factory function to create appropriate client
def create_realclaw_client(api_key: Optional[str] = None) -> RealClawClient:
    """
    Create RealClaw client (real or mock based on API key availability)
    """
    if api_key and api_key != "your_realclaw_api_key_here":
        logger.info("Using real RealClaw API client")
        return RealClawClient(api_key)
    else:
        logger.warning("Using mock RealClaw client (no API key provided)")
        return MockRealClawClient()
