import * as networks from "../config/networks.json";

import { BigNumber, constants, Contract, providers, Wallet } from 'ethers'
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  formatUnits,
  getContract,
  http,
  parseAbi,
  zeroAddress,
  type Narrow,
} from 'viem'
import { ERC20__factory } from '../typechain'
import type { LibSwap } from '../typechain/AcrossFacetV3'
import { ADDRESS_WETH_OPT } from "@shared-contracts/constants"

export const getProvider = (
  networkName: string
): providers.FallbackProvider => {
  const rpcProviderSrc = new providers.JsonRpcProvider(networks[networkName].rpcUrl)
  return new providers.FallbackProvider([rpcProviderSrc])
}

export const getNetworkNameForChainId = (chainId: number): string => {
  const network = Object.entries(networks).find(
    ([, info]) => info.chainId === chainId
  )

  if (!network) throw Error(`Could not find a network with chainId ${chainId}`)

  return network[0]
}

const getProviderForChainId = (chainId: number) => {
  // get network name for chainId
  const networkName = getNetworkNameForChainId(chainId)

  // get provider for network name
  const provider = getProvider(networkName)
  if (!provider)
    throw Error(`Could not find a provider for network ${networkName}`)
  else return provider
}

export const getUniswapSwapDataERC20ToERC20 = async (
  uniswapAddress: string,
  chainId: number,
  sendingAssetId: string,
  receivingAssetId: string,
  fromAmount: BigNumber,
  receiverAddress: string,
  requiresDeposit = true,
  minAmountOut = 0,
  deadline = Math.floor(Date.now() / 1000) + 60 * 60
) => {
  // prepare destSwap callData
  const provider = getProviderForChainId(chainId)
  const UNISWAP_ABI = [
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  ] as const

  const uniswap = new Contract(
    uniswapAddress,
    UNISWAP_ABI,
    provider
  ) as Contract & {
    populateTransaction: {
      swapExactTokensForTokens: (
        amountIn: BigNumber,
        amountOutMin: BigNumber,
        path: string[],
        to: string,
        deadline: number
      ) => Promise<{ data: string }>
    }
  }

  const path = [sendingAssetId, receivingAssetId]

  // get minAmountOut from Uniswap router
  console.log(`finalFromAmount  : ${fromAmount}`)

  const finalMinAmountOut = BigNumber.from(
    minAmountOut === 0
      ? (
          await getAmountsOutUniswap(
            uniswapAddress,
            chainId,
            [sendingAssetId, receivingAssetId],
            fromAmount
          )
        )[1]
      : minAmountOut
  )
  console.log(`finalMinAmountOut: ${finalMinAmountOut}`)

  const uniswapCalldata =
    await uniswap.populateTransaction.swapExactTokensForTokens(
      fromAmount,
      finalMinAmountOut,
      path,
      receiverAddress,
      deadline
    )

  if (!uniswapCalldata) throw Error('Could not create Uniswap calldata')

  // construct LibSwap.SwapData
  const swapData: LibSwap.SwapDataStruct = {
    callTo: uniswapAddress,
    approveTo: uniswapAddress,
    sendingAssetId,
    receivingAssetId,
    fromAmount,
    callData: uniswapCalldata.data,
    requiresDeposit,
  }

  return swapData
}

export const getUniswapDataERC20toExactETH = async (
  uniswapAddress: string,
  chainId: number,
  sendingAssetId: string, // USDT
  exactAmountOut: BigNumber, // Desired ETH output
  receiverAddress: string,
  requiresDeposit = true,
  deadline = Math.floor(Date.now() / 1000) + 60 * 60
) => {
  // Get provider for the chain
  const provider = getProviderForChainId(chainId)

  const uniswap = new Contract(
    uniswapAddress,
    [
      'function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts)',
      'function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    ],
    provider
  ) as Contract & {
    populateTransaction: {
      swapTokensForExactETH: (
        amountOut: BigNumber,
        amountInMax: BigNumber,
        path: string[],
        to: string,
        deadline: number
      ) => Promise<{ data: string }>
    }
  }

  const path = [sendingAssetId, ADDRESS_WETH_OPT]

  try {
    // Get the required USDT input amount for the exact ETH output
    const amounts = await uniswap.getAmountsIn(exactAmountOut, path)
    const requiredUsdtAmount = amounts[0]
    const maxAmountIn = BigNumber.from(requiredUsdtAmount).mul(105).div(100) // 5% max slippage

    console.log('Required USDT input:', requiredUsdtAmount.toString())
    console.log('Max USDT input with slippage:', maxAmountIn.toString())
    console.log('Exact ETH output:', exactAmountOut.toString())

    const uniswapCalldata = (
      await uniswap.populateTransaction.swapTokensForExactETH(
        exactAmountOut,
        maxAmountIn,
        path,
        receiverAddress,
        deadline
      )
    ).data

    if (!uniswapCalldata) throw Error('Could not create Uniswap calldata')

    return {
      callTo: uniswapAddress,
      approveTo: uniswapAddress,
      sendingAssetId, // USDT address
      receivingAssetId: constants.AddressZero, // ETH (zero address)
      fromAmount: maxAmountIn, // Required USDT amount with slippage
      callData: uniswapCalldata,
      requiresDeposit,
    }
  } catch (error) {
    console.error('Error in Uniswap contract interaction:', error)
    throw error
  }
}

export const getUniswapDataERC20toExactERC20 = async (
  uniswapAddress: string,
  chainId: number,
  sendingAssetId: string,
  receivingAssetId: string,
  exactAmountOut: BigNumber,
  receiverAddress: string,
  requiresDeposit = true,
  deadline = Math.floor(Date.now() / 1000) + 60 * 60
) => {
  // Get provider for the chain
  const provider = getProviderForChainId(chainId)

  const uniswap = new Contract(
    uniswapAddress,
    [
      'function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts)',
      'function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    ],
    provider
  ) as Contract & {
    populateTransaction: {
      swapTokensForExactTokens: (
        amountOut: BigNumber,
        amountInMax: BigNumber,
        path: string[],
        to: string,
        deadline: number
      ) => Promise<{ data: string }>
    }
  }

  const path = [sendingAssetId, receivingAssetId]

  try {
    // Get the required input amount for the exact output
    const amounts = await uniswap.getAmountsIn(exactAmountOut, path)
    const requiredInputAmount = amounts[0]
    const maxAmountIn = BigNumber.from(requiredInputAmount).mul(105).div(100) // 5% max slippage

    console.log('Required input amount:', requiredInputAmount.toString())
    console.log('Max input with slippage:', maxAmountIn.toString())
    console.log('Exact output amount:', exactAmountOut.toString())

    const uniswapCalldata = (
      await uniswap.populateTransaction.swapTokensForExactTokens(
        exactAmountOut,
        maxAmountIn,
        path,
        receiverAddress,
        deadline
      )
    ).data

    if (!uniswapCalldata) throw Error('Could not create Uniswap calldata')

    return {
      callTo: uniswapAddress,
      approveTo: uniswapAddress,
      sendingAssetId,
      receivingAssetId,
      fromAmount: maxAmountIn,
      callData: uniswapCalldata,
      requiresDeposit,
    }
  } catch (error) {
    console.error('Error in Uniswap contract interaction:', error)
    throw error
  }
}

export const getUniswapSwapDataERC20ToETH = async (
  uniswapAddress: string,
  chainId: number,
  sendingAssetId: string,
  receivingAssetId: string,
  fromAmount: BigNumber,
  receiverAddress: string,
  requiresDeposit = true,
  minAmountOut = 0,
  deadline = Math.floor(Date.now() / 1000) + 60 * 60
) => {
  // prepare destSwap callData
  const provider = getProviderForChainId(chainId);
  console.log(provider);
  const UNISWAP_ABI = [
    'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  ] as const

  const uniswap = new Contract(
    uniswapAddress,
    UNISWAP_ABI,
    provider
  ) as Contract & {
    populateTransaction: {
      swapExactTokensForETH: (
        amountIn: BigNumber,
        amountOutMin: BigNumber,
        path: string[],
        to: string,
        deadline: number
      ) => Promise<{ data: string }>
    }
  }

  const path = [sendingAssetId, receivingAssetId]

  // get minAmountOut from Uniswap router
  console.log(`finalFromAmount  : ${fromAmount}`)

  const finalMinAmountOut = BigNumber.from(
    minAmountOut === 0
      ? (
          await getAmountsOutUniswap(
            uniswapAddress,
            chainId,
            [sendingAssetId, receivingAssetId],
            fromAmount
          )
        )[1]
      : minAmountOut
  )
  console.log(`finalMinAmountOut: ${finalMinAmountOut}`)

  const uniswapCalldata =
    await uniswap.populateTransaction.swapExactTokensForETH(
      fromAmount,
      finalMinAmountOut,
      path,
      receiverAddress,
      deadline
    )

  if (!uniswapCalldata) throw Error('Could not create Uniswap calldata')

  // construct LibSwap.SwapData
  const swapData: LibSwap.SwapDataStruct = {
    callTo: uniswapAddress,
    approveTo: uniswapAddress,
    sendingAssetId,
    receivingAssetId: '0x0000000000000000000000000000000000000000',
    fromAmount,
    callData: uniswapCalldata.data,
    requiresDeposit,
  }

  return {...swapData, finalMinAmountOut};
}

export const getAmountsOutUniswap = async (
  uniswapAddress: string,
  chainId: number,
  path: string[],
  fromAmount: BigNumber
): Promise<string[]> => {
  const provider = getProviderForChainId(chainId)
  console.log('Getting amounts out from Uniswap:')
  console.log('- Router:', uniswapAddress)
  console.log('- Chain ID:', chainId)
  console.log('- Path:', path)
  console.log('- From Amount:', fromAmount.toString())

  // prepare ABI
  const uniswapABI = parseAbi([
    'function getAmountsOut(uint256, address[]) public view returns(uint256[])',
  ])

  // get uniswap contract
  const uniswap = new Contract(
    uniswapAddress,
    uniswapABI,
    provider
  ) as Contract & {
    callStatic: {
      getAmountsOut: (amountIn: string, path: string[]) => Promise<string[]>
    }
  }

  try {
    // Call Uniswap contract to get amountsOut
    const amounts = await uniswap.callStatic.getAmountsOut(
      fromAmount.toString(),
      path
    )

    console.log(
      'Amounts returned:',
      amounts.map((a: any) => a.toString())
    )

    if (!amounts || amounts.length < 2)
      throw new Error('Invalid amounts returned from Uniswap')

    return amounts
  } catch (error: any) {
    console.error('Error calling Uniswap contract:', error)
    throw new Error(`Failed to get amounts out: ${error.message}`)
  }
}