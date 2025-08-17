import { CHAIN_IDS } from './chainIds';
import { LiFiDiamond as BaseDiamond } from './deployments/base.staging.json';

export const getDiamondAddress = (chainId: CHAIN_IDS) => {
  switch (chainId) {
    case CHAIN_IDS.ARBITRUM:
      return '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';
    case CHAIN_IDS.BASE:
      return '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';
    case CHAIN_IDS.ETHEREUM:
      return '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';
    case CHAIN_IDS.BASE:
      return '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';
    case CHAIN_IDS.BSC:
      return '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';
    case CHAIN_IDS.POLYGON:
      return '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';
    case CHAIN_IDS.MANTLE:
      return '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';
    case CHAIN_IDS.METIS:
      return '0x24ca98fB6972F5eE05f0dB00595c7f68D9FaFd68';
    case CHAIN_IDS.SEI:
      return '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';
    case CHAIN_IDS.LINEA:
      return '0xDE1E598b81620773454588B85D6b5D4eEC32573e';
    case CHAIN_IDS.OPTIMISM:
      return '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';
    default:
      throw new Error(`Unsupported chainId: ${chainId}`);
  }
};
