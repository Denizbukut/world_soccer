'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://worldchain-mainnet.g.alchemy.com/public');
const tokenAddress = '0x67f89454E7429749d2b6b74740Db021A591e6ab1';
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

export async function useTokenBalance(address: string) {
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
  const [rawBalance, decimals] = await Promise.all([
    contract.balanceOf(address),
    contract.decimals(),
  ])
  return ethers.formatUnits(rawBalance, decimals)
}