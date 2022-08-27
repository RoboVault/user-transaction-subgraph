import { Address, BigInt, ethereum, log, Value } from "@graphprotocol/graph-ts"
import {
  Vault,
  Transfer,
  Approval,
  Deposit,
  Withdraw,
  Sweep,
} from "../generated/Vault/Vault"
import { DepositOrWithdraw, Transaction } from "../generated/schema"

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export function handleDeposit(event: Deposit): void {
    saveDepositOrWithdraw(event, event.params.recipient, event.params.amount, 'deposit')

    saveTransaction(
        event,
        Address.fromString(ZERO_ADDRESS),
        event.params.recipient,
        event.params.amount,
        'deposit'
    )
}

export function handleWithdraw(event: Withdraw): void {
    saveDepositOrWithdraw(event, event.params.recipient, event.params.amount, 'withdraw')

    saveTransaction(
        event,
        event.params.recipient,
        Address.fromString(ZERO_ADDRESS),
        event.params.amount,
        'withdraw'
    )
}

export function handleTransfer(event: Transfer): void {
    saveTransaction(
      event,
      event.params.sender,
      event.params.receiver,
      event.params.value,
      'deposit'
    )
}

function saveDepositOrWithdraw(event: ethereum.Event, recipient: Address, amount: BigInt, type: string): void {
  const entity = new DepositOrWithdraw(`${event.transaction.hash.toHex()}:${event.logIndex}`)
  const vault = Vault.bind(event.address)
  entity.vault = event.address
  entity.user = recipient
  entity.hash = event.transaction.hash
  entity.amount = amount
  entity.balance = vault.balanceOf(recipient)
  entity.pps = vault.pricePerShare()
  entity.ts = event.block.timestamp
  entity.blockNumber = event.block.number
  entity.type = type
  entity.save()
}

function saveTransaction(
    event: ethereum.Event, 
    from: Address, 
    to: Address, 
    amount: BigInt, 
    type: string
): void {
  const tx = new Transaction(`${event.transaction.hash.toHex()}:${event.logIndex}`)
  const vault = Vault.bind(event.address)
  tx.vault = event.address
  tx.from = from
  tx.to = to
  tx.hash = event.transaction.hash
  tx.amount = amount
  tx.fromBalance = vault.balanceOf(from)
  tx.toBalance = vault.balanceOf(to)
  tx.pps = vault.pricePerShare()
  tx.ts = event.block.timestamp
  tx.blockNumber = event.block.number
  tx.type = type
  tx.save()
}

export function handleApproval(event: Approval): void {

}
export function handleSweep(event: Sweep): void {
  
}