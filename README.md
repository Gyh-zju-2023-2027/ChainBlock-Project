# 🎰 去中心化赛彩系统 (Decentralized Betting System)

[![Ethereum](https://img.shields.io/badge/Ethereum-3C3C3D?style=for-the-badge&logo=Ethereum&logoColor=white)](https://ethereum.org/)
[![Solidity](https://img.shields.io/badge/Solidity-e6e6e6?style=for-the-badge&logo=solidity&logoColor=black)](https://soliditylang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

基于以太坊的去中心化赛彩平台，支持多项目竞猜，ERC721彩票凭证，二级市场交易。

## 📋 目录

- [🎯 项目简介](#-项目简介)
- [✨ 核心特性](#-核心特性)
- [🚀 快速开始](#-快速开始)
- [📦 安装部署](#-安装部署)
- [🎮 使用指南](#-使用指南)
- [📸 界面截图](#-界面截图)
- [📚 API 文档](#-api-文档)
- [❓ 故障排除](#-故障排除)

## 🎯 项目简介

基于以太坊的去中心化赛彩平台，支持体育赛事、选秀节目等竞猜活动。采用ERC721作为彩票凭证，实现数字资产交易。

**核心创新**：
- 完全去中心化，无需信任第三方
- ERC721 NFT彩票，支持二级市场交易
- 智能合约保证公平透明的结算

## ✨ 核心特性

- **多项目赛彩**：支持同时运行多个竞猜项目
- **ERC721彩票**：获得NFT凭证，可永久保存
- **二级市场**：玩家间自由交易彩票
- **公平结算**：智能合约自动按比例分配奖励

## 🚀 快速开始

### 一键启动
```bash
git clone <your-repo-url>
cd demo-lottery-application
./start.sh
```

### 手动启动
```bash
# 1. 启动区块链网络
npx ganache-cli --port 8545 --deterministic

# 2. 部署合约
cd contracts && npm install && npx hardhat run scripts/deploy.ts --network ganache

# 3. 启动前端
cd ../lottery-frontend && npm install && npm start
```

访问：http://localhost:3000

## 📦 安装部署

### 系统要求
- Node.js 16+
- npm 7+
- MetaMask 浏览器扩展

### 配置 MetaMask
1. 添加本地网络：
   - 网络名称: `Ganache Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `1337`
2. 导入测试账户私钥：
   ```
   0xaf961e56824bc8e6617c4107413ed34f9c85a11ef84b3834e45c825bc2d0111b
   ```

## 🎮 使用指南

### 管理员操作
1. 连接管理员钱包
2. 创建赛彩项目（设置标题、选项、奖池、时间）
3. 等待用户投注
4. 项目到期后公布结果并结算

### 玩家操作
1. 连接钱包并领取测试代币
2. 浏览项目并选择投注
3. 获得ERC721彩票凭证
4. 可在二级市场交易彩票
5. 等待结算获得奖励

### 奖金计算
奖励 = (个人投注金额 ÷ 获胜选项总投注) × (管理员奖池 + 所有投注总金额)

## 📸 界面截图

项目运行时需要截取的关键界面：

1. **系统初始化** - 合约地址展示，连接钱包按钮
2. **钱包连接** - MetaMask弹窗，网络选择
3. **代币空投** - 领取测试代币，余额更新
4. **创建项目** - 管理员创建赛彩项目表单
5. **项目列表** - 赛彩项目展示，投注按钮
6. **投注操作** - 选择选项和金额，交易确认
7. **彩票凭证** - ERC721 NFT展示，挂牌出售按钮
8. **二手市场** - 挂牌彩票列表，购买功能
9. **彩票交易** - 挂牌设置价格，购买确认
10. **项目结算** - 管理员公布结果
11. **奖励分发** - 自动分配奖金，余额更新

建议保存到 `screenshots/` 目录，格式为 `01_xxx.png` 至 `11_xxx.png`。

## 📚 API 文档

### 核心合约接口

#### BettingSystem 合约
- `createProject(title, options, pool, duration)` - 创建赛彩项目
- `placeBet(projectId, optionId, amount)` - 投注
- `settleProject(projectId, winnerOptionId)` - 结算项目

#### LotteryTicket 合约 (ERC721)
- `mintTicket(to, bettingId, optionId, amount)` - 铸造彩票
- `listTicket(tokenId, price)` - 挂牌出售
- `buyTicket(tokenId)` - 购买彩票

#### MyERC20 合约
- `airdrop()` - 领取代币空投
- `balanceOf(account)` - 查询余额

## ❓ 故障排除

### 常见问题

**Q: 合约编译失败**
A: 确保安装了所有依赖，运行 `npm install`

**Q: MetaMask 连接失败**
A: 检查是否安装了 MetaMask 扩展，刷新页面后重试

**Q: 交易失败**
A: 检查账户是否有足够测试 ETH，确认网络设置正确

**Q: 无法领取空投**
A: 每个账户只能领取一次空投

## 📄 许可证

MIT License
