// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./MyERC20.sol";

contract LotteryTicket is ERC721, ERC721Enumerable, Ownable {
    uint256 private _nextTokenId;
    MyERC20 public myERC20; // 支付代币

    // 彩票信息结构体
    struct TicketInfo {
        uint256 bettingId;      // 赛彩项目ID
        uint256 optionId;       // 选择的选项ID
        uint256 amount;         // 购买金额
        address owner;          // 当前持有者
        bool isListed;          // 是否在市场上架
        uint256 listPrice;      // 挂牌价格
    }

    mapping(uint256 => TicketInfo) public ticketInfos; // tokenId => TicketInfo
    mapping(uint256 => mapping(uint256 => uint256[])) public bettingTickets; // bettingId => optionId => tokenIds

    event TicketMinted(uint256 indexed tokenId, uint256 indexed bettingId, uint256 indexed optionId, address owner);
    event TicketListed(uint256 indexed tokenId, uint256 price);
    event TicketUnlisted(uint256 indexed tokenId);
    event TicketTransferred(uint256 indexed tokenId, address from, address to, uint256 price);

    constructor(MyERC20 _myERC20) ERC721("LotteryTicket", "LT") Ownable() {
        myERC20 = _myERC20;
    }

    // Required override for ERC721Enumerable
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    // Required override for ERC721Enumerable
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // 铸造彩票凭证（只有赛彩合约可以调用）
    function mintTicket(
        address to,
        uint256 bettingId,
        uint256 optionId,
        uint256 amount
    ) external onlyOwner returns (uint256) {
        _nextTokenId++;
        uint256 tokenId = _nextTokenId;

        _mint(to, tokenId);
        ticketInfos[tokenId] = TicketInfo({
            bettingId: bettingId,
            optionId: optionId,
            amount: amount,
            owner: to,
            isListed: false,
            listPrice: 0
        });

        bettingTickets[bettingId][optionId].push(tokenId);

        emit TicketMinted(tokenId, bettingId, optionId, to);
        return tokenId;
    }

    // 挂牌出售彩票
    function listTicket(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(price > 0, "Price must be greater than 0");

        ticketInfos[tokenId].isListed = true;
        ticketInfos[tokenId].listPrice = price;

        emit TicketListed(tokenId, price);
    }

    // 取消挂牌
    function unlistTicket(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");

        ticketInfos[tokenId].isListed = false;
        ticketInfos[tokenId].listPrice = 0;

        emit TicketUnlisted(tokenId);
    }

    // 购买挂牌的彩票
    function buyTicket(uint256 tokenId) external {
        TicketInfo storage ticket = ticketInfos[tokenId];
        require(ticket.isListed, "Ticket not listed");

        address seller = ownerOf(tokenId);

        // 检查买家是否已授权合约转移代币
        require(myERC20.allowance(msg.sender, address(this)) >= ticket.listPrice, "Insufficient allowance");

        // 转移ERC20代币从买家到卖家
        bool success = myERC20.transferFrom(msg.sender, seller, ticket.listPrice);
        require(success, "Token transfer failed");

        // 转移ERC721
        _transfer(seller, msg.sender, tokenId);

        // 更新票据信息
        ticket.owner = msg.sender;
        ticket.isListed = false;
        ticket.listPrice = 0;

        emit TicketTransferred(tokenId, seller, msg.sender, ticket.listPrice);
    }

    // 获取指定赛彩项目的票据
    function getBettingTickets(uint256 bettingId, uint256 optionId) external view returns (uint256[] memory) {
        return bettingTickets[bettingId][optionId];
    }

    // 获取用户的所有票据
    function getUserTickets(address user) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(user);
        uint256[] memory tokens = new uint256[](balance);
        for (uint256 i = 0; i < balance; i++) {
            tokens[i] = tokenOfOwnerByIndex(user, i);
        }
        return tokens;
    }
}
