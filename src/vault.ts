import {
  Address, bigInt, BigInt, Bytes, ethereum,
  log, typeConversion, TypedMap, Value
} from "@graphprotocol/graph-ts"
import {
  Vault,
  Transfer,
  Approval,
  Deposit,
  Withdraw,
  Sweep,
  StrategyReported,
} from "../generated/Vault/Vault"
import { Oracle } from "../generated/Vault/Oracle"
import {
  DepositOrWithdraw, StrategyReport, Transaction, User,
  UserTransaction, VaultStatistic
} from "../generated/schema"
// import { Oracle } from '../generated/templates'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const BPS_MAX = BigInt.fromU32(1000000)

export function handleDeposit(event: Deposit): void {
    // log.info('handleDeposit', [])
    // saveDepositOrWithdraw(event, event.params.recipient, event.params.amount, 'deposit')

    // saveTransaction(
    //     event,
    //     Address.fromString(ZERO_ADDRESS),
    //     event.params.recipient,
    //     event.params.amount,
    //     'deposit'
    // )
}

export function handleWithdraw(event: Withdraw): void {
    // log.info('handleWithdraw', [])
    // saveDepositOrWithdraw(event, event.params.recipient, event.params.amount, 'withdraw')

    // saveTransaction(
    //     event,
    //     event.params.recipient,
    //     Address.fromString(ZERO_ADDRESS),
    //     event.params.amount,
    //     'withdraw'
    // )
}

export function handleTransfer(event: Transfer): void {
    log.info('handleTransfer', [])
    saveTransaction(
        event,
        event.params.sender,
        event.params.receiver,
        event.params.value,
        'transfer'
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

function getUserEntity(addr: Address, vault: Address): User {
  const id = `${addr.toHex()}:${vault.toHex()}`
  let user = User.load(id)
  if (user == null) {
    const user = new User(id)
    user.addr = addr
    user.vault = vault
    user.sumDeposits = BigInt.fromI32(0)
    user.sumWithdrawals = BigInt.fromI32(0)
    user.profits = BigInt.fromI32(0)
    user.balance = BigInt.fromI32(0)
    // user.transactions = []
    return user
  }
  return user
}

function getVaultStatisticEntity(vault: Bytes): VaultStatistic {
  const id = `${vault.toHex()}`
  let statistic = VaultStatistic.load(id)

  if (statistic == null) {
    const stat = new VaultStatistic(id)
    stat.vault = vault
    stat.totalUsers = BigInt.fromI32(1)
    stat.totalUsersProfits = BigInt.fromI32(0)
    stat.totalAssets = BigInt.fromI32(0)

    return stat
  }

  return statistic
}

function createUserTransaction(
  event: ethereum.Event, 
  user: string, 
  from: Bytes, 
  to: Bytes, 
  value: BigInt, 
  tokenValue: BigInt,
  type: string,
  pps: BigInt
): UserTransaction {
  const id = event.transaction.hash.toHex() + "-" + event.logIndex.toString() + '-' + user
  const tx = new UserTransaction(id)
  tx.hash = event.transaction.hash
  tx.from = from
  tx.to = to
  tx.value = value
  tx.user = user
  tx.type = type
  tx.tokenValue = tokenValue
  tx.pps = pps
  tx.save()
  return tx
}

function saveTransaction(
    event: ethereum.Event, 
    from: Address, 
    to: Address, 
    amount: BigInt, 
    type: string
): void {
    const vault = Vault.bind(event.address)
    const pps = vault.pricePerShare()
    const decimals = Bytes.fromBigInt(vault.decimals())[0]
    const scale = BigInt.fromI32(10).pow(decimals)

    // Record transaction
    const tx = new Transaction(`${event.transaction.hash.toHex()}:${event.logIndex}`)
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

    // Vault shares sent to address -> Deposit or Transfer in
    if (to.toHex() != ZERO_ADDRESS) {
      const userAddr = to
      const user = getUserEntity(userAddr, event.address)

      // despoits
      const sumDeposit = user.sumDeposits
      const tokenAmount = amount.times(pps).div(scale)
      user.sumDeposits = sumDeposit.plus(tokenAmount)

      // Profits
      const balance = vault.balanceOf(userAddr).times(pps).div(scale)
      user.balance = balance
      user.profits = balance.plus(user.sumWithdrawals).minus(user.sumDeposits)

      // Save & Store Transaction
      user.save()
      createUserTransaction(event, user.id, from, to, amount, tokenAmount, 'deposit', pps)

    }

    // Vault shares sent from address -> Withdrawal or Transfer out
    if (from.toHex() != ZERO_ADDRESS) {
      const userAddr = from
      const user = getUserEntity(userAddr, event.address)

      // Withdrawals
      const sumWithdrawals = user.sumWithdrawals
      const tokenAmount = amount.times(pps).div(scale)
      user.sumWithdrawals = sumWithdrawals.plus(tokenAmount)

      // Profits
      const balance = vault.balanceOf(userAddr).times(pps).div(scale)
      user.balance = balance
      user.profits = balance.plus(user.sumWithdrawals).minus(user.sumDeposits)

      // Save & Store Transaction
      user.save()
      createUserTransaction(event, user.id, from, to, amount, tokenAmount, 'withdraw', pps)
    }

  // Vault Statistic: capture total users
  if (to.toHex() != ZERO_ADDRESS) {
    const userAddr = to

    // Check tokenBalance of being transferred to an account
    const balanceToken = vault.balanceOf(userAddr)

    // get vaultStat using id
    const statistic = getVaultStatisticEntity(event.address)
    statistic.symbol = vault.symbol()
    statistic.decimals = BigInt.fromI32(decimals)

    // if balance === 0, increment totalUser
    if (balanceToken.isZero()) {
      statistic.totalUsers = statistic.totalUsers.plus(BigInt.fromI32(1))
    }

    if (from.toHex() != ZERO_ADDRESS) {
      // Get total user profits
      const userAddrFrom = getUserEntity(from, event.address)
      const userAddrTo = getUserEntity(to, event.address)

      statistic.totalUsersProfits = statistic.totalUsersProfits.plus(userAddrFrom.profits).plus(userAddrTo.profits)

      // Get total user assets
      const userBalanceFrom = vault.balanceOf(from).times(pps).div(scale)
      const userBalanceTo = vault.balanceOf(to).times(pps).div(scale)

      statistic.totalAssets = statistic.totalAssets.plus(userBalanceFrom).plus(userBalanceTo)
    }

    statistic.save()
  }
}

export function handleApproval(event: Approval): void {

}
export function handleSweep(event: Sweep): void {

}

function getOracle(token: string): string {
    const TokenToOracleLookup = new TypedMap<string, string>()
    // Avalanche
    TokenToOracleLookup.set('0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E'.toLowerCase(), '0xF096872672F44d6EBA71458D74fe67F9a77a23B9')
    TokenToOracleLookup.set('0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB'.toLowerCase(), '0x976B3D034E162d8bD72D6b9C989d545b839003b0')
    // Fantom
    TokenToOracleLookup.set('0x04068DA6C83AFCFA0e13ba15A6696662335D5B75'.toLowerCase(), '0x2553f4eeb82d5A26427b8d1106C51499CBa5D99c') // USDC
    TokenToOracleLookup.set('0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E'.toLowerCase(), '0x91d5DEFAFfE2854C7D02F50c80FA1fdc8A721e52') // DAI
    TokenToOracleLookup.set('0x82f0B8B456c1A451378467398982d4834b6829c1'.toLowerCase(), '0x28de48D3291F31F839274B8d82691c77DF1c5ceD') // MIM
    TokenToOracleLookup.set('0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83'.toLowerCase(), '0xf4766552D15AE4d256Ad41B6cf2933482B0680dc') // WFT<
    TokenToOracleLookup.set('0x321162Cd933E2Be498Cd2267a90534A804051b11'.toLowerCase(), '0x8e94C22142F4A64b99022ccDd994f4e9EC86E4B4') // WBTC
    TokenToOracleLookup.set('0x74b23882a30290451A17c44f4F05243b6b58C76d'.toLowerCase(), '0x11DdD3d147E5b83D01cee7070027092397d63658') // WETH
    TokenToOracleLookup.set('0xdc301622e621166BD8E82f2cA0A26c13Ad0BE355'.toLowerCase(), '0xBaC409D670d996Ef852056f6d45eCA41A8D57FbD') // FRAX

    const oracle = TokenToOracleLookup.get(token)
    return oracle ? oracle : '' 
}

export function handleStrategyReported(event: StrategyReported): void {
  const vault = Vault.bind(event.address)
  const strategy = vault.strategies(event.params.strategy)
  const mgmtFee = vault.managementFee()
  const performanceFee = vault.performanceFee()
  const report = new StrategyReport(`${event.transaction.hash.toHex()}:${event.logIndex}`)
  report.vault = event.address
  report.strategy = event.params.strategy
  report.from = event.transaction.from
  report.hash = event.transaction.hash
  report.gain = event.params.gain
  report.loss = event.params.loss
  report.debtPaid = event.params.debtPaid
  report.totalGain = event.params.totalGain
  report.totalLoss = event.params.totalLoss
  report.debtAdded = event.params.debtAdded
  report.debtRatio = event.params.debtRatio
  report.pps = vault.pricePerShare()
  report.mgmtFee = mgmtFee
  report.performanceFee = performanceFee
  report.strategistFee = strategy.getPerformanceFee()
  report.mgmtFeePaid = BigInt.fromU32(0) // TODO
  report.performanceFeePaid = event.params.gain.times(performanceFee).div(BPS_MAX)
  report.strategistFeePaid = event.params.gain.times(strategy.getPerformanceFee()).div(BPS_MAX)
  report.ts = event.block.timestamp
  report.blockNumber = event.block.number

  // Oracle Price
  const oracleAddr = getOracle(vault.token().toHex())
  log.info('token address: ' + vault.token().toHex(), [])
  log.info('oracle address: ' + oracleAddr, [])
  const oracle = Oracle.bind(Address.fromString(oracleAddr))
  report.tokenPrice = oracle.latestAnswer()

  report.save()
}


