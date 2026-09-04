// src/lib/ethers.js
// Ethers.js v6 + Infura integration for real-time Ethereum data

import { ethers } from 'ethers'

// ─── Infura Config ────────────────────────────────────────────────────────────
const INFURA_KEY = '925e9126a8dd44aab1de98b1cd1949f6'
const INFURA_URL = `https://mainnet.infura.io/v3/${INFURA_KEY}`

let _provider = null

export function getProvider() {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(INFURA_URL)
  }
  return _provider
}

// ─── Address Information ──────────────────────────────────────────────────────
export async function getAddressInfo(address) {
  if (!ethers.isAddress(address)) {
    throw new Error('Invalid Ethereum address')
  }
  const provider = getProvider()
  const [balanceWei, txCount, blockNumber] = await Promise.all([
    provider.getBalance(address),
    provider.getTransactionCount(address),
    provider.getBlockNumber(),
  ])
  return {
    address,
    balanceEth: ethers.formatEther(balanceWei),
    balanceWei: balanceWei.toString(),
    txCount,
    blockNumber,
    isContract: txCount === 0 ? null : undefined, // simplified
  }
}

// ─── Latest Block ─────────────────────────────────────────────────────────────
export async function getLatestBlock() {
  const provider = getProvider()
  const block = await provider.getBlock('latest')
  return {
    number: block.number,
    hash: block.hash,
    timestamp: block.timestamp,
    txCount: block.transactions.length,
    gasLimit: block.gasLimit.toString(),
    gasUsed: block.gasUsed.toString(),
    baseFeePerGas: block.baseFeePerGas
      ? ethers.formatUnits(block.baseFeePerGas, 'gwei') + ' gwei'
      : null,
  }
}

// ─── Gas Prices ───────────────────────────────────────────────────────────────
export async function getGasPrice() {
  const provider = getProvider()
  const feeData = await provider.getFeeData()
  return {
    gasPrice: feeData.gasPrice
      ? ethers.formatUnits(feeData.gasPrice, 'gwei') + ' gwei'
      : null,
    maxFeePerGas: feeData.maxFeePerGas
      ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') + ' gwei'
      : null,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
      ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') + ' gwei'
      : null,
  }
}

// ─── Transaction Lookup ───────────────────────────────────────────────────────
export async function getTransaction(txHash) {
  const provider = getProvider()
  const tx = await provider.getTransaction(txHash)
  if (!tx) throw new Error('Transaction not found')
  const receipt = await provider.getTransactionReceipt(txHash)
  return {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: ethers.formatEther(tx.value) + ' ETH',
    gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') + ' gwei' : null,
    blockNumber: tx.blockNumber,
    status: receipt ? (receipt.status === 1 ? 'SUCCESS' : 'FAILED') : 'PENDING',
    confirmations: tx.blockNumber
      ? (await provider.getBlockNumber()) - tx.blockNumber
      : 0,
  }
}

// ─── Network Info ─────────────────────────────────────────────────────────────
export async function getNetworkInfo() {
  const provider = getProvider()
  const network = await provider.getNetwork()
  return {
    name: network.name,
    chainId: network.chainId.toString(),
  }
}

// ─── ML Pre-Confirmation Check (Simulated) ────────────────────────────────────
// In a real deployment this would call a smart contract with on-chain ML scoring.
// For demo: simulates the check that would happen pre-confirmation.
export function simulatePreConfirmationCheck(fromAddress, toAddress, valueEth) {
  // Rule-based ML pre-screening (simulates what a smart contract would do)
  const flagRules = []
  let riskScore = 0

  // Large value transfers
  const value = parseFloat(valueEth) || 0
  if (value > 10) { flagRules.push('High-value transfer (>10 ETH)'); riskScore += 20 }
  if (value > 50) { flagRules.push('Very high-value transfer (>50 ETH)'); riskScore += 15 }

  // Known mixer/bridge patterns (simplified address prefix check)
  const KNOWN_RISK_PREFIXES = ['0x00000000', '0xdead', '0x000000']
  if (KNOWN_RISK_PREFIXES.some(p => toAddress?.toLowerCase().startsWith(p))) {
    flagRules.push('Destination matches known risk pattern')
    riskScore += 30
  }

  // Zero-value with data (contract interaction)
  if (value === 0) { flagRules.push('Zero-value contract interaction — possible phishing'); riskScore += 10 }

  const isFlagged = riskScore >= 25
  return {
    flagged: isFlagged,
    pre_confirmation_risk_score: Math.min(riskScore, 100),
    flags: flagRules,
    recommendation: isFlagged
      ? '⚠ Pre-confirmation ML flag: High fraud probability. Verify before broadcasting.'
      : '✓ Pre-confirmation check passed. Normal transaction pattern.',
    checked_at: new Date().toISOString(),
  }
}

export { ethers }
