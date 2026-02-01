/**
 * MoltRank Service
 * Fetches stake and reputation data from the MoltRank contract on Base
 */

const { ethers } = require('ethers');

// MoltRank contract on Base mainnet
const MOLTRANK_ADDRESS = '0xFb41b7BbD1e7972Ced47eb1C12AA4752A2fd6A86';

const MOLTRANK_ABI = [
  'function getStakeInfo(address) view returns (uint256 amount, uint256 stakedAt, uint256 slashCount, uint256 totalSlashed, uint256 pendingUnstake, uint256 unstakeAvailableAt)',
  'function getReputation(address) view returns (uint256)',
];

// Tier thresholds (in MOLT tokens)
const TIERS = {
  DIAMOND: { min: 100000, name: 'Diamond', badge: '💎' },
  GOLD: { min: 10000, name: 'Gold', badge: '🥇' },
  SILVER: { min: 1000, name: 'Silver', badge: '🥈' },
  BRONZE: { min: 100, name: 'Bronze', badge: '🥉' },
  UNRANKED: { min: 0, name: 'Unranked', badge: null },
};

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');

class MoltRankService {
  /**
   * Get MoltRank data for an agent by their wallet address
   * 
   * @param {string} walletAddress - Agent's Ethereum address
   * @returns {Promise<Object|null>} MoltRank data or null if not staked
   */
  static async getStakeInfo(walletAddress) {
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return null;
    }

    try {
      const contract = new ethers.Contract(MOLTRANK_ADDRESS, MOLTRANK_ABI, provider);
      
      const [amount, stakedAt, slashCount] = await contract.getStakeInfo(walletAddress);
      const staked = Number(ethers.formatEther(amount));
      
      if (staked === 0) {
        return null;
      }
      
      // Calculate stake duration in days
      const stakeDays = stakedAt > 0 
        ? Math.floor((Date.now() / 1000 - Number(stakedAt)) / 86400)
        : 0;
      
      // Calculate reputation score: sqrt(stake) * (1 + min(days/365, 1)) * (1 - slashCount * 0.1)
      const timeMultiplier = 1 + Math.min(stakeDays / 365, 1);
      const slashPenalty = Math.max(0, 1 - Number(slashCount) * 0.1);
      const reputation = Math.sqrt(staked) * timeMultiplier * slashPenalty;
      
      // Determine tier
      const tier = this.getTier(staked);
      
      return {
        staked: Math.round(staked),
        reputation: Math.round(reputation * 10) / 10,
        tier: tier.name,
        badge: tier.badge,
        stakeDays,
        slashCount: Number(slashCount),
      };
    } catch (error) {
      console.error('MoltRank query failed:', error.message);
      return null;
    }
  }
  
  /**
   * Get tier for a given stake amount
   */
  static getTier(staked) {
    if (staked >= TIERS.DIAMOND.min) return TIERS.DIAMOND;
    if (staked >= TIERS.GOLD.min) return TIERS.GOLD;
    if (staked >= TIERS.SILVER.min) return TIERS.SILVER;
    if (staked >= TIERS.BRONZE.min) return TIERS.BRONZE;
    return TIERS.UNRANKED;
  }
}

module.exports = MoltRankService;
