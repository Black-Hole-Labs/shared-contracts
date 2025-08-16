import { CHAIN_IDS } from './chainIds';
import { LiFiDiamond as BaseDiamond } from './deployments/base.staging.json';

export const getDiamondAddress = (chainId: CHAIN_IDS) => {
  switch (chainId) {
    case CHAIN_IDS.ARBITRUM:
      return 'not deployed';
    case CHAIN_IDS.BASE:
      return BaseDiamond;
    case CHAIN_IDS.ETHEREUM:
      return 'not deployed';
    case CHAIN_IDS.BASE:
      return BaseDiamond;
    case CHAIN_IDS.ARBITRUM:
      return 'not deployed';
    case CHAIN_IDS.BSC:
      return 'not deployed';
    case CHAIN_IDS.POLYGON:
      return 'not deployed';
    case CHAIN_IDS.MANTLE:
      return 'not deployed';
    case CHAIN_IDS.METIS:
      return 'not deployed';
    case CHAIN_IDS.SEI:
      return 'not deployed';
    case CHAIN_IDS.LINEA:
      return 'not deployed';
    case CHAIN_IDS.OPTIMISM:
      return 'not deployed';
    default:
      throw new Error(`Unsupported chainId: ${chainId}`);
  }
};
