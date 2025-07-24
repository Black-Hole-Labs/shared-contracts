import { CHAIN_IDS } from './chainIds';
import { LiFiDiamond as BaseDiamond } from './deployments/base.staging.json';

export const getDiamondAddress = (chainId: CHAIN_IDS) => {
  switch (chainId) {
    case CHAIN_IDS.ARBITRUM:
      return 'not deployed';
    case CHAIN_IDS.BASE:
      return BaseDiamond;
    default:
      throw new Error(`Unsupported chainId: ${chainId}`);
  }
};
