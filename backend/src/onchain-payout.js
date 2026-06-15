/**
 * On-chain CLASH payouts from Treasury → winner wallet.
 * Uses Treasury.emergencyWithdraw (owner = AGENT_PRIVATE_KEY).
 */

const { ethers } = require('ethers');

const TREASURY_ABI = [
  'function emergencyWithdraw(address token, uint256 amount, address recipient) external',
];

const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
];

const DEFAULT_TREASURY = '0xA82615C3882170BAFCFb145C19B2D388E7aF5952';
const DEFAULT_CLASH    = '0xFb178c931e5F64bBA180A4419E4E2f216d1eEDDe';

function isPayoutEnabled() {
  const pk = process.env.AGENT_PRIVATE_KEY;
  return !!(pk && !pk.includes('your_testnet') && pk !== '0x' + '0'.repeat(64));
}

function getOwnerWallet() {
  if (!isPayoutEnabled()) return null;
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  return new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider);
}

async function payClashFromTreasury(recipient, amountClash) {
  const wallet = getOwnerWallet();
  if (!wallet) throw new Error('Payout wallet not configured');

  const treasury = process.env.TREASURY_ADDRESS || DEFAULT_TREASURY;
  const clash    = process.env.CLASH_TOKEN_ADDRESS || DEFAULT_CLASH;
  const amountWei = ethers.parseUnits(String(Math.floor(amountClash)), 18);

  const provider = wallet.provider;
  const token = new ethers.Contract(clash, ERC20_ABI, provider);
  const treasuryBal = await token.balanceOf(treasury);
  if (treasuryBal < amountWei) {
    throw new Error(`Treasury CLASH insufficient (need ${amountClash}, have ${ethers.formatUnits(treasuryBal, 18)})`);
  }

  const treasuryContract = new ethers.Contract(treasury, TREASURY_ABI, wallet);
  const tx = await treasuryContract.emergencyWithdraw(clash, amountWei, recipient);
  const receipt = await tx.wait();
  return receipt.hash;
}

module.exports = { isPayoutEnabled, payClashFromTreasury };
