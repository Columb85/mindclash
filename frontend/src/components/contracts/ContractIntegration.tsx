'use client';

import { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { 
  useCurrentRound, 
  useUserBet, 
  useLatestPrice, 
  usePlaceBet, 
  useClaim,
  useCalculatePayout,
  useRoundEvents 
} from '@/hooks/useRoundEngine';
import { ASSETS, PRICE_FEEDS, getContractAddress, formatPrice, formatTokenAmount } from '@/lib/web3-config';
import { ArrowUp, ArrowDown, Clock, Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface ContractIntegrationProps {
  selectedAsset: keyof typeof ASSETS;
  selectedDuration: number;
  selectedToken: string;
}

export function ContractIntegration({ 
  selectedAsset, 
  selectedDuration, 
  selectedToken 
}: ContractIntegrationProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [betAmount, setBetAmount] = useState<string>('');

  const priceId = PRICE_FEEDS[selectedAsset];
  const asset = ASSETS[selectedAsset];

  // Contract hooks
  const { roundInfo, refetchRound, isLoading: roundLoading } = useCurrentRound(priceId, selectedDuration, chainId);
  const { price: currentPrice, refetchPrice } = useLatestPrice(priceId, chainId);
  const { userBet, refetchBet } = useUserBet(roundInfo?.roundId || 0n, chainId);
  const { payout, refetchPayout } = useCalculatePayout(roundInfo?.roundId || 0n, chainId);
  const { placeBet, isPending: placingBet } = usePlaceBet(chainId);
  const { claim, isPending: claiming } = useClaim(chainId);
  const { events } = useRoundEvents(chainId);

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [phase, setPhase] = useState<'betting' | 'locked' | 'ended'>('betting');

  // Update timer
  useEffect(() => {
    if (!roundInfo) return;

    const updateTimer = () => {
      const now = Date.now() / 1000;
      const lockTime = Number(roundInfo.lockTime);
      const endTime = Number(roundInfo.endTime);

      if (now < lockTime) {
        setTimeLeft(lockTime - now);
        setPhase('betting');
      } else if (now < endTime) {
        setTimeLeft(endTime - now);
        setPhase('locked');
      } else {
        setTimeLeft(0);
        setPhase('ended');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [roundInfo]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlaceBet = async (position: 0 | 1) => {
    if (!betAmount || !address || !roundInfo) return;

    try {
      const amount = BigInt(parseFloat(betAmount) * 1e6); // Assuming 6 decimals for USDC/USDT
      const tokenAddress = getContractAddress(chainId || 97, selectedToken.toLowerCase() as any);
      
      if (!tokenAddress) {
        toast.error('Token contract not found');
        return;
      }

      await placeBet(priceId, selectedDuration, position, amount, tokenAddress);
      
      // Refetch data after successful bet
      setTimeout(() => {
        refetchRound();
        refetchBet();
      }, 2000);
      
      setBetAmount('');
    } catch (error) {
      console.error('Error placing bet:', error);
    }
  };

  const handleClaim = async () => {
    if (!roundInfo || !userBet || userBet.claimed) return;

    try {
      await claim(roundInfo.roundId);
      
      // Refetch data after successful claim
      setTimeout(() => {
        refetchBet();
        refetchPayout();
      }, 2000);
    } catch (error) {
      console.error('Error claiming:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="glass p-8 rounded-xl text-center">
        <div className="w-16 h-16 bg-gray-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold mb-2">Connect Wallet</h3>
        <p className="text-gray-400">Connect your wallet to start making predictions</p>
      </div>
    );
  }

  if (roundLoading) {
    return (
      <div className="glass p-8 rounded-xl text-center">
        <div className="animate-spin w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-400">Loading round data...</p>
      </div>
    );
  }

  if (!roundInfo) {
    return (
      <div className="glass p-8 rounded-xl text-center">
        <h3 className="text-xl font-bold mb-2">No Active Round</h3>
        <p className="text-gray-400">No prediction round found for {asset.name} ({selectedDuration}s)</p>
      </div>
    );
  }

  const totalPool = roundInfo.totalBullAmount + roundInfo.totalBearAmount;
  const bullPercentage = totalPool > 0n ? Number(roundInfo.totalBullAmount * 100n / totalPool) : 50;
  const bearPercentage = 100 - bullPercentage;

  const canClaim = userBet && !userBet.claimed && phase === 'ended' && payout && payout > 0n;

  return (
    <div className="space-y-6">
      {/* Round Status */}
      <div className="glass p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: asset.color }}
            >
              {asset.icon}
            </div>
            <div>
              <h3 className="font-bold">{asset.name} Prediction</h3>
              <p className="text-sm text-gray-400">Round #{roundInfo.roundId.toString()}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className={`text-lg font-bold ${
              phase === 'betting' ? 'text-neon-blue' :
              phase === 'locked' ? 'text-yellow-400' : 'text-green-400'
            }`}>
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm text-gray-400 capitalize">{phase}</div>
          </div>
        </div>

        {/* Current Price */}
        <div className="text-center py-4">
          <div className="text-3xl font-bold mb-2">
            ${currentPrice ? formatPrice(currentPrice) : '---'}
          </div>
          <div className="text-sm text-gray-400">Current Price</div>
        </div>

        {/* Pool Distribution */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-bull-green">UP Pool: ${formatTokenAmount(roundInfo.totalBullAmount)}</span>
            <span className="text-bear-red">DOWN Pool: ${formatTokenAmount(roundInfo.totalBearAmount)}</span>
          </div>
          
          <div className="flex h-2 rounded-full overflow-hidden bg-dark-surface">
            <div 
              className="bg-bull-green transition-all duration-300"
              style={{ width: `${bullPercentage}%` }}
            />
            <div 
              className="bg-bear-red transition-all duration-300"
              style={{ width: `${bearPercentage}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-gray-400">
            <span>{bullPercentage.toFixed(1)}%</span>
            <span>{bearPercentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* User Bet Status */}
      {userBet && userBet.amount > 0n && (
        <div className="glass p-6 rounded-xl">
          <h4 className="font-bold mb-3">Your Position</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
                userBet.position === 0 ? 'bg-bull-green/20 text-bull-green' : 'bg-bear-red/20 text-bear-red'
              }`}>
                {userBet.position === 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                <span className="font-medium">{userBet.position === 0 ? 'UP' : 'DOWN'}</span>
              </div>
              <span className="font-bold">${formatTokenAmount(userBet.amount)}</span>
            </div>
            
            {canClaim && (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="btn-primary flex items-center space-x-2"
              >
                <Trophy className="w-4 h-4" />
                <span>{claiming ? 'Claiming...' : `Claim $${formatTokenAmount(payout!)}`}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Betting Interface */}
      {phase === 'betting' && (!userBet || userBet.amount === 0n) && (
        <div className="glass p-6 rounded-xl">
          <h4 className="font-bold mb-4">Place Your Prediction</h4>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Bet Amount ({selectedToken})</label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="Enter amount..."
              className="w-full px-4 py-3 bg-dark-surface border border-gray-600 rounded-lg focus:outline-none focus:border-primary-500"
              min="1"
              step="0.01"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handlePlaceBet(0)}
              disabled={placingBet || !betAmount}
              className="flex items-center justify-center space-x-2 px-6 py-4 bg-bull-green hover:bg-bull-green/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold transition-colors"
            >
              <TrendingUp className="w-5 h-5" />
              <span>{placingBet ? 'Placing...' : 'Predict UP'}</span>
            </button>
            
            <button
              onClick={() => handlePlaceBet(1)}
              disabled={placingBet || !betAmount}
              className="flex items-center justify-center space-x-2 px-6 py-4 bg-bear-red hover:bg-bear-red/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold transition-colors"
            >
              <TrendingDown className="w-5 h-5" />
              <span>{placingBet ? 'Placing...' : 'Predict DOWN'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Round Locked/Ended Info */}
      {phase !== 'betting' && (
        <div className="glass p-6 rounded-xl text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            phase === 'locked' ? 'bg-yellow-400/20 text-yellow-400' : 'bg-green-400/20 text-green-400'
          }`}>
            <Clock className="w-8 h-8" />
          </div>
          <h4 className="font-bold mb-2">
            {phase === 'locked' ? 'Round Locked' : 'Round Ended'}
          </h4>
          <p className="text-gray-400">
            {phase === 'locked' 
              ? 'Waiting for round to end...' 
              : 'Results are being processed'
            }
          </p>
        </div>
      )}

      {/* Recent Events */}
      {events.length > 0 && (
        <div className="glass p-6 rounded-xl">
          <h4 className="font-bold mb-4">Recent Activity</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {events.slice(-5).map((event, index) => (
              <div key={index} className="text-sm text-gray-400 p-2 bg-dark-surface/50 rounded">
                New activity detected
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
