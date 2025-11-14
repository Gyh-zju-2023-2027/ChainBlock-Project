// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./MyERC20.sol";
import "./LotteryTicket.sol";

contract BettingSystem {
    MyERC20 public myERC20;
    LotteryTicket public lotteryTicket;

    address public manager; // 管理员/公证人

    // 赛彩项目结构体
    struct BettingProject {
        uint256 id;
        string title;                    // 项目标题
        string[] options;               // 选项列表
        uint256 totalPool;              // 奖池总金额
        uint256 endTime;                // 截止时间
        uint256 winnerOptionId;         // 获胜选项ID（0表示未结算）
        bool isActive;                  // 是否激活
        uint256 totalBetAmount;         // 总投注金额
    }

    BettingProject[] public bettingProjects;
    uint256 public nextProjectId = 1;

    // 项目选项数据（由于Solidity限制，不能在结构体中使用映射）
    mapping(uint256 => mapping(uint256 => uint256)) public projectOptionBetAmounts; // projectId => optionId => totalBetAmount
    mapping(uint256 => mapping(uint256 => address[])) public projectOptionParticipants; // projectId => optionId => participants

    // 投注记录
    struct BetRecord {
        uint256 projectId;
        uint256 optionId;
        uint256 amount;
        uint256 ticketId;
    }

    mapping(address => BetRecord[]) public userBets; // 用户投注记录

    modifier onlyManager() {
        require(msg.sender == manager, "Only manager can call this");
        _;
    }

    modifier projectExists(uint256 projectId) {
        require(projectId > 0 && projectId < nextProjectId, "Project does not exist");
        _;
    }

    modifier projectActive(uint256 projectId) {
        require(bettingProjects[projectId - 1].isActive, "Project is not active");
        _;
    }

    modifier projectNotEnded(uint256 projectId) {
        require(block.timestamp < bettingProjects[projectId - 1].endTime, "Project has ended");
        _;
    }

    event ProjectCreated(uint256 indexed projectId, string title, uint256 totalPool, uint256 endTime);
    event BetPlaced(uint256 indexed projectId, address indexed user, uint256 optionId, uint256 amount, uint256 ticketId);
    event ProjectSettled(uint256 indexed projectId, uint256 winnerOptionId);
    event PrizeDistributed(uint256 indexed projectId, address indexed winner, uint256 amount);

    constructor(MyERC20 _myERC20) {
        myERC20 = _myERC20;
        lotteryTicket = new LotteryTicket(_myERC20);
        manager = msg.sender;
    }

    // 创建赛彩项目
    function createProject(
        string memory title,
        string[] memory options,
        uint256 totalPool,
        uint256 duration // 持续时间（秒）
    ) external onlyManager {
        require(options.length >= 2, "At least 2 options required");
        require(totalPool > 0, "Total pool must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");

        uint256 projectId = nextProjectId++;
        BettingProject storage project = bettingProjects.push();
        project.id = projectId;
        project.title = title;
        project.options = options;
        project.totalPool = totalPool;
        project.endTime = block.timestamp + duration;
        project.winnerOptionId = 0;
        project.isActive = true;
        project.totalBetAmount = 0;

        emit ProjectCreated(projectId, title, totalPool, project.endTime);
    }

    // 购买彩票
    function placeBet(uint256 projectId, uint256 optionId, uint256 amount)
        external
        projectExists(projectId)
        projectActive(projectId)
        projectNotEnded(projectId)
    {
        require(amount > 0, "Bet amount must be greater than 0");
        BettingProject storage project = bettingProjects[projectId - 1];
        require(optionId < project.options.length, "Invalid option ID");

        // 检查用户是否已经批准合约转移代币
        require(myERC20.allowance(msg.sender, address(this)) >= amount, "Insufficient allowance");

        // 转移代币到合约
        bool success = myERC20.transferFrom(msg.sender, address(this), amount);
        require(success, "Token transfer failed");

        // 铸造ERC721彩票凭证
        uint256 ticketId = lotteryTicket.mintTicket(msg.sender, projectId, optionId, amount);

        // 更新项目统计
        project.totalBetAmount += amount;
        projectOptionBetAmounts[projectId][optionId] += amount;
        projectOptionParticipants[projectId][optionId].push(msg.sender);

        // 记录用户投注
        userBets[msg.sender].push(BetRecord({
            projectId: projectId,
            optionId: optionId,
            amount: amount,
            ticketId: ticketId
        }));

        emit BetPlaced(projectId, msg.sender, optionId, amount, ticketId);
    }

    // 结算项目（公证人输入结果）
    function settleProject(uint256 projectId, uint256 winnerOptionId)
        external
        onlyManager
        projectExists(projectId)
        projectActive(projectId)
    {
        BettingProject storage project = bettingProjects[projectId - 1];
        // require(block.timestamp >= project.endTime, "Project has not ended yet"); // 注释掉以允许管理员随时开奖
        require(winnerOptionId < project.options.length, "Invalid winner option ID");
        require(project.winnerOptionId == 0, "Project already settled");

        project.winnerOptionId = winnerOptionId;
        project.isActive = false;

        // 计算胜利者的总投注金额
        uint256 totalWinnerBetAmount = projectOptionBetAmounts[projectId][winnerOptionId];
        address[] memory winners = projectOptionParticipants[projectId][winnerOptionId];

        if (totalWinnerBetAmount > 0 && winners.length > 0) {
            // 奖池 = 项目总奖池 + 所有投注金额
            uint256 prizePool = project.totalPool + project.totalBetAmount;
            // 每个胜利彩票凭证的奖励 = (投注金额 / 胜利选项总投注金额) * 奖池
            uint256 totalRewardPerToken = prizePool / totalWinnerBetAmount;

            // 分发奖励给胜利者
            for (uint256 i = 0; i < winners.length; i++) {
                address winner = winners[i];
                BetRecord[] memory bets = userBets[winner];

                for (uint256 j = 0; j < bets.length; j++) {
                    if (bets[j].projectId == projectId && bets[j].optionId == winnerOptionId) {
                        uint256 reward = bets[j].amount * totalRewardPerToken;
                        myERC20.transfer(winner, reward);
                        emit PrizeDistributed(projectId, winner, reward);
                    }
                }
            }
        }

        emit ProjectSettled(projectId, winnerOptionId);
    }

    // 获取项目信息
    function getProject(uint256 projectId) external view
        projectExists(projectId)
        returns (
            uint256 id,
            string memory title,
            string[] memory options,
            uint256 totalPool,
            uint256 endTime,
            uint256 winnerOptionId,
            bool isActive,
            uint256 totalBetAmount
        )
    {
        BettingProject storage project = bettingProjects[projectId - 1];
        return (
            project.id,
            project.title,
            project.options,
            project.totalPool,
            project.endTime,
            project.winnerOptionId,
            project.isActive,
            project.totalBetAmount
        );
    }

    // 获取项目选项的投注金额
    function getOptionBetAmount(uint256 projectId, uint256 optionId) external view
        projectExists(projectId)
        returns (uint256)
    {
        return projectOptionBetAmounts[projectId][optionId];
    }

    // 获取用户在指定项目的投注
    function getUserBetsInProject(address user, uint256 projectId) external view returns (BetRecord[] memory) {
        BetRecord[] memory allBets = userBets[user];
        uint256 count = 0;

        // 首先计算符合条件的投注数量
        for (uint256 i = 0; i < allBets.length; i++) {
            if (allBets[i].projectId == projectId) {
                count++;
            }
        }

        BetRecord[] memory projectBets = new BetRecord[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < allBets.length; i++) {
            if (allBets[i].projectId == projectId) {
                projectBets[index] = allBets[i];
                index++;
            }
        }

        return projectBets;
    }

    // 获取项目数量
    function getProjectCount() external view returns (uint256) {
        return bettingProjects.length;
    }

    // 获取彩票合约地址
    function getLotteryTicketAddress() external view returns (address) {
        return address(lotteryTicket);
    }
}
