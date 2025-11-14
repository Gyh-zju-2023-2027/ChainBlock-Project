import { ethers } from "hardhat";

async function main() {
  // 部署ERC20代币合约
  const MyERC20 = await ethers.getContractFactory("MyERC20");
  const myERC20 = await MyERC20.deploy("BettingToken", "BT");
  await myERC20.deployed();
  console.log(`MyERC20 contract has been deployed successfully in ${myERC20.address}`)

  // 部署赛彩系统合约
  const BettingSystem = await ethers.getContractFactory("BettingSystem");
  const bettingSystem = await BettingSystem.deploy(myERC20.address);
  await bettingSystem.deployed();
  console.log(`BettingSystem contract has been deployed successfully in ${bettingSystem.address}`)

  // 获取彩票凭证合约地址
  const lotteryTicketAddress = await bettingSystem.getLotteryTicketAddress();
  console.log(`LotteryTicket contract has been deployed successfully in ${lotteryTicketAddress}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
