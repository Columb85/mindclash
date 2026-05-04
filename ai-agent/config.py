"""
Configuration for Mantle AI Trading Agent
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Mantle Network Configuration (Mantle Sepolia - Chain ID 5003)
MANTLE_RPC_URL = os.getenv('MANTLE_SEPOLIA_RPC', 'https://rpc.sepolia.mantle.xyz')
MANTLE_CHAIN_ID = int(os.getenv('CHAIN_ID', '5003'))

# ERC-8004 Contract Addresses (Deployed May 3, 2026)
AGENT_NFT_ADDRESS = os.getenv('AGENT_NFT_ADDRESS', '0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837')
AGENT_REGISTRY_ADDRESS = os.getenv('AGENT_REGISTRY_ADDRESS', '0xbD19d3ec1B4d0f3852729b0dcC87bd739839cBDC')

# MindClash Protocol Contracts
ROUND_ENGINE_ADDRESS = os.getenv('ROUND_ENGINE_ADDRESS', '0x69656D3220fDF9F59F005b0D73834D6af2E9cf9a')
TREASURY_ADDRESS = os.getenv('TREASURY_ADDRESS', '0xA82615C3882170BAFCFb145C19B2D388E7aF5952')
CLASH_TOKEN_ADDRESS = os.getenv('CLASH_TOKEN_ADDRESS', '0xFb178c931e5F64bBA180A4419E4E2f216d1eEDDe')

# Private Key for agent operations (in production, use secure key management)
AGENT_PRIVATE_KEY = os.getenv('AGENT_PRIVATE_KEY', '0x0000000000000000000000000000000000000000000000000000000000000000')

# AI Configuration
AI_CONFIG = {
    'decisionInterval': int(os.getenv('AI_DECISION_INTERVAL', '10')),   # seconds
    'maxPositionSize': float(os.getenv('AI_MAX_POSITION_SIZE', '0.1')), # 10% of pool
    'stopLossThreshold': float(os.getenv('AI_STOP_LOSS_THRESHOLD', '0.05')),
    'lookbackPeriod': int(os.getenv('AI_LOOKBACK_PERIOD', '20')),       # 20 points = ~3 min warmup
    'predictionHorizon': int(os.getenv('AI_PREDICTION_HORIZON', '1')),
}

# RealClaw Configuration
REALCLAW_CONFIG = {
    'baseURL': os.getenv('REALCLAW_BASE_URL', 'https://api.realclaw.ai'),
    'apiKey': os.getenv('REALCLAW_API_KEY', ''),
    'endpoints': {
        'agents': '/agents',
        'decisions': '/decisions',
        'performance': '/performance',
    },
}

# Logging Configuration
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FILE = Path(__file__).parent / 'logs' / f'agent_{os.getpid()}.log'

# Create logs directory
LOG_FILE.parent.mkdir(exist_ok=True)
