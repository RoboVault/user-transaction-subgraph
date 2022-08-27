import { Address, BigInt, ethereum, Value } from "@graphprotocol/graph-ts"
import {
  Vault,
  Transfer,
  Approval,
  Deposit,
  Withdraw,
  Sweep,
  LockedProfitDegradationUpdated,
  StrategyAdded,
  StrategyReported,
  UpdateGovernance,
  UpdateManagement,
  UpdateRewards,
  UpdateDepositLimit,
  UpdatePerformanceFee,
  UpdateManagementFee,
  UpdateGuardian,
  EmergencyShutdown,
  UpdateWithdrawalQueue,
  StrategyUpdateDebtRatio,
  StrategyUpdateMinDebtPerHarvest,
  StrategyUpdateMaxDebtPerHarvest,
  StrategyUpdatePerformanceFee,
  StrategyMigrated,
  StrategyRevoked,
  StrategyRemovedFromQueue,
  StrategyAddedToQueue
} from "../generated/Vault/Vault"
import { UserTransaction } from "../generated/schema"

export function handleDeposit(event: Deposit): void {
  saveUserTransaction(event, event.params.recipient, event.params.amount, 'deposit')
}

export function handleWithdraw(event: Withdraw): void {
  saveUserTransaction(event, event.params.recipient, event.params.amount, 'withdraw')
}

function saveUserTransaction(event: ethereum.Event, recipient: Address, amount: BigInt, type: string): void {
  const tx = new UserTransaction(event.transaction.from.toHex())
  const vault = Vault.bind(event.address)
  tx.user = recipient
  tx.hash = event.transaction.hash
  tx.amount = amount
  tx.balance = vault.balanceOf(recipient)
  tx.pps = vault.pricePerShare()
  tx.ts = event.block.timestamp
  tx.blockNumber = event.block.number
  tx.type = type
  tx.save()
}

export function handleTransfer(event: Transfer): void {

}
export function handleApproval(event: Approval): void {

}
export function handleSweep(event: Sweep): void {
  
}


