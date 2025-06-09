'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://worldchain-mainnet.g.alchemy.com/public');
const tokenAddress = '0xD7f7B8137Aa3176d8578c78eC53a4D5258034257';
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const aniTokenAddress = '0x4d0f53f8810221579627eF6Dd4d64Ca107b2BEF8'

export async function useTokenBalance(address: string) {
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
  const [rawBalance, decimals] = await Promise.all([
    contract.balanceOf(address),
    contract.decimals(),
  ])
  return ethers.formatUnits(rawBalance, decimals)
}

export async function useAniTokenBalance(address: string) {
  const contract = new ethers.Contract(aniTokenAddress, ERC20_ABI, provider)
  const [rawBalance, decimals] = await Promise.all([
    contract.balanceOf(address),
    contract.decimals(),
  ])
  return ethers.formatUnits(rawBalance, decimals)
}