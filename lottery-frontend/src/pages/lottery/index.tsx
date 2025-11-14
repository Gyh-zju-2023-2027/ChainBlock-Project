import {Button, Image, Card, List, Modal, Input, Select, message, Divider, Tag, Space} from 'antd';
import {Header} from "../../asset";
import {UserOutlined, PlusOutlined, ShoppingCartOutlined, DollarOutlined} from "@ant-design/icons";
import {useEffect, useState} from 'react';
import {bettingSystemContract, lotteryTicketContract, myERC20Contract, web3} from "../../utils/contracts";
import './index.css';

const GanacheTestChainId = '0x539' // Ganache默认的ChainId = 0x539 = Hex(1337)
// TODO change according to your configuration
const GanacheTestChainName = 'Ganache Test Chain'
const GanacheTestChainRpcUrl = 'http://127.0.0.1:8545'

interface Project {
    id: number;
    title: string;
    options: string[];
    totalPool: number;
    endTime: number;
    winnerOptionId: number;
    isActive: boolean;
    totalBetAmount: number;
}

interface Ticket {
    tokenId: number;
    bettingId: number;
    optionId: number;
    amount: number;
    isListed: boolean;
    listPrice: number;
}

const LotteryPage = () => {
    const [account, setAccount] = useState('')
    const [accountBalance, setAccountBalance] = useState(0)
    const [managerAccount, setManagerAccount] = useState('')

    // 赛彩项目相关
    const [projects, setProjects] = useState<Project[]>([])
    const [userTickets, setUserTickets] = useState<Ticket[]>([])
    const [marketTickets, setMarketTickets] = useState<Ticket[]>([])

    // 创建项目Modal
    const [createProjectModalVisible, setCreateProjectModalVisible] = useState(false)
    const [projectTitle, setProjectTitle] = useState('')
    const [projectOptions, setProjectOptions] = useState<string[]>(['', ''])
    const [projectPool, setProjectPool] = useState(1000)
    const [projectDuration, setProjectDuration] = useState(3600) // 默认1小时

    // 购买彩票Modal
    const [betModalVisible, setBetModalVisible] = useState(false)
    const [selectedProject, setSelectedProject] = useState<Project | null>(null)
    const [selectedOption, setSelectedOption] = useState(0)
    const [betAmount, setBetAmount] = useState(100)

    // 二手市场Modal
    const [marketModalVisible, setMarketModalVisible] = useState(false)

    // 结算Modal
    const [settleModalVisible, setSettleModalVisible] = useState(false)
    const [settleProject, setSettleProject] = useState<Project | null>(null)
    const [winnerOption, setWinnerOption] = useState(0)

    // 挂牌Modal
    const [listModalVisible, setListModalVisible] = useState(false)
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
    const [listPrice, setListPrice] = useState(0)

    useEffect(() => {
        // 初始化检查用户是否已经连接钱包
        const initCheckAccounts = async () => {
            // @ts-ignore
            const {ethereum} = window;
            if (Boolean(ethereum && ethereum.isMetaMask)) {
                // 尝试获取连接的用户账户
                const accounts = await web3.eth.getAccounts()
                if(accounts && accounts.length) {
                    setAccount(accounts[0])
                }
            }
        }

        initCheckAccounts()
    }, [])

    useEffect(() => {
        const getContractInfo = async () => {
            if (bettingSystemContract) {
                const ma = await bettingSystemContract.methods.manager().call()
                setManagerAccount(ma)
                await loadProjects()
            } else {
                alert('Contract not exists.')
            }
        }

        getContractInfo()
    }, [])

    useEffect(() => {
        const getAccountInfo = async () => {
            if (myERC20Contract && account) {
                try {
                    // 检查合约是否存在
                    const code = await web3.eth.getCode(myERC20Contract.options.address)
                    if (code === '0x' || code === '0x0') {
                        console.error('MyERC20 contract not found at address:', myERC20Contract.options.address)
                        message.error('合约未找到，请检查部署状态')
                        return
                    }

                    const ab = await myERC20Contract.methods.balanceOf(account).call()
                    setAccountBalance(Number(ab))
                    await loadUserTickets()
                    await loadMarketTickets()
                } catch (error) {
                    console.error('Error loading account info:', error)
                    message.error('加载账户信息失败')
                }
            }
        }

        if(account !== '') {
            getAccountInfo()
        }
    }, [account])

    // 单独的useEffect来加载市场数据
    useEffect(() => {
        if (account && bettingSystemContract && lotteryTicketContract) {
            loadMarketTickets()
        }
    }, [projects]) // 当项目列表更新时重新加载市场

    const loadProjects = async () => {
        if (!bettingSystemContract) return

        try {
            const count = await bettingSystemContract.methods.getProjectCount().call()
            const projectsData: Project[] = []

            for (let i = 1; i <= Number(count); i++) {
                const project = await bettingSystemContract.methods.getProject(i).call()
                projectsData.push({
                    id: Number(project.id),
                    title: project.title,
                    options: project.options,
                    totalPool: Number(project.totalPool),
                    endTime: Number(project.endTime),
                    winnerOptionId: Number(project.winnerOptionId),
                    isActive: project.isActive,
                    totalBetAmount: Number(project.totalBetAmount)
                })
            }

            setProjects(projectsData)
        } catch (error) {
            console.error('Load projects error:', error)
        }
    }

    const loadUserTickets = async () => {
        if (!lotteryTicketContract || !account) return

        try {
            const tokenIds = await lotteryTicketContract.methods.getUserTickets(account).call()
            const tickets: Ticket[] = []

            for (const tokenId of tokenIds) {
                const ticketInfo = await lotteryTicketContract.methods.ticketInfos(tokenId).call()
                tickets.push({
                    tokenId: Number(tokenId),
                    bettingId: Number(ticketInfo.bettingId),
                    optionId: Number(ticketInfo.optionId),
                    amount: Number(ticketInfo.amount),
                    isListed: ticketInfo.isListed,
                    listPrice: Number(ticketInfo.listPrice)
                })
            }

            setUserTickets(tickets)
        } catch (error) {
            console.error('Load user tickets error:', error)
        }
    }

    const loadMarketTickets = async () => {
        if (!lotteryTicketContract) return

        try {
            // 获取所有项目
            const projectCount = await bettingSystemContract.methods.getProjectCount().call()
            const marketTicketsData: Ticket[] = []

            // 遍历所有项目，查找已挂牌的彩票
            for (let projectId = 1; projectId <= Number(projectCount); projectId++) {
                const project = await bettingSystemContract.methods.getProject(projectId).call()

                // 遍历项目的每个选项
                for (let optionId = 0; optionId < project.options.length; optionId++) {
                    const ticketIds = await lotteryTicketContract.methods.getBettingTickets(projectId, optionId).call()

                    // 检查每个彩票是否已挂牌
                    for (const tokenId of ticketIds) {
                        const ticketInfo = await lotteryTicketContract.methods.ticketInfos(tokenId).call()

                        if (ticketInfo.isListed && ticketInfo.owner !== account) { // 排除自己的彩票
                            marketTicketsData.push({
                                tokenId: Number(tokenId),
                                bettingId: Number(ticketInfo.bettingId),
                                optionId: Number(ticketInfo.optionId),
                                amount: Number(ticketInfo.amount),
                                isListed: ticketInfo.isListed,
                                listPrice: Number(ticketInfo.listPrice)
                            })
                        }
                    }
                }
            }

            setMarketTickets(marketTicketsData)
        } catch (error) {
            console.error('Load market tickets error:', error)
        }
    }

    const onClaimTokenAirdrop = async () => {
        if(account === '') {
            message.error('请先连接钱包')
            return
        }

        // 检查网络是否正确
        try {
            // @ts-ignore
            const chainId = await window.ethereum.request({ method: 'eth_chainId' })
            if (chainId !== '0x539') { // Ganache 默认 chainId
                message.error('请切换到 Ganache 测试网络 (Chain ID: 1337)')
                return
            }
        } catch (error) {
            message.error('无法获取网络信息，请确保 MetaMask 已连接')
            return
        }

        if (myERC20Contract) {
            try {
                console.log('Attempting to claim airdrop for account:', account)
                console.log('MyERC20 contract address:', myERC20Contract.options.address)

                // 先检查合约是否存在
                const code = await web3.eth.getCode(myERC20Contract.options.address)
                if (code === '0x' || code === '0x0') {
                    message.error('合约不存在于此地址，请检查网络配置')
                    return
                }

                const tx = await myERC20Contract.methods.airdrop().send({
                    from: account,
                    gas: 200000, // 指定 gas limit
                    gasPrice: web3.utils.toWei('20', 'gwei') // 指定 gas price
                })

                console.log('Transaction successful:', tx)
                message.success('成功领取赛彩代币!')

                // 重新加载账户余额
                const ab = await myERC20Contract.methods.balanceOf(account).call()
                setAccountBalance(Number(ab))
            } catch (error: any) {
                console.error('Airdrop error:', error)
                if (error.message.includes('User denied transaction')) {
                    message.error('用户取消了交易')
                } else if (error.message.includes('insufficient funds')) {
                    message.error('账户余额不足以支付 gas 费用')
                } else if (error.message.includes('This user has claimed airdrop already') ||
                           error.message.includes('already claimed')) {
                    message.error('您已经领取过空投了')
                } else {
                    message.error(`领取失败: ${error.message}`)
                }
            }
        } else {
            message.error('合约不存在')
        }
    }

    const onCreateProject = async () => {
        if(account === '') {
            message.error('请先连接钱包')
            return
        }

        if(account !== managerAccount) {
            message.error('只有管理员可以创建项目')
            return
        }

        if (!projectTitle.trim()) {
            message.error('请输入项目标题')
            return
        }

        if (projectOptions.some(opt => !opt.trim())) {
            message.error('请填写所有选项')
            return
        }

        try {
            await bettingSystemContract.methods.createProject(
                projectTitle,
                projectOptions.filter(opt => opt.trim()),
                projectPool,
                projectDuration
            ).send({
                    from: account
                })

            message.success('项目创建成功!')
            setCreateProjectModalVisible(false)
            // 重置表单
            setProjectTitle('')
            setProjectOptions(['', ''])
            setProjectPool(1000)
            setProjectDuration(3600)
            // 重新加载项目
            await loadProjects()
            } catch (error: any) {
            message.error(error.message)
        }
    }

    const onPlaceBet = async () => {
        if(account === '') {
            message.error('请先连接钱包')
            return
        }

        if (!selectedProject) {
            message.error('请选择项目')
            return
        }

        if (betAmount <= 0) {
            message.error('投注金额必须大于0')
            return
        }

        try {
            // 先授权
            await myERC20Contract.methods.approve(bettingSystemContract.options.address, betAmount).send({
                from: account
            })

            // 投注
            await bettingSystemContract.methods.placeBet(selectedProject.id, selectedOption, betAmount).send({
                    from: account
                })

            message.success('投注成功!')
            setBetModalVisible(false)
            // 重新加载数据
            await loadProjects()
            await loadUserTickets()
            const ab = await myERC20Contract.methods.balanceOf(account).call()
            setAccountBalance(Number(ab))
            } catch (error: any) {
            message.error(error.message)
        }
    }

    const onConfirmSettleProject = async () => {
        if(account !== managerAccount) {
            message.error('只有管理员可以结算项目')
            return
        }

        if (!settleProject) {
            message.error('请选择项目')
            return
        }

        if (winnerOption >= settleProject.options.length) {
            message.error('请选择有效的获胜选项')
            return
        }

        console.log('Settling project:', {
            projectId: settleProject.id,
            winnerOption: winnerOption,
            winnerOptionText: settleProject.options[winnerOption]
        })

        try {
            await bettingSystemContract.methods.settleProject(settleProject.id, winnerOption).send({
                from: account,
                gas: 500000,
                gasPrice: web3.utils.toWei('20', 'gwei')
            })

            message.success('项目结算成功!')
            setSettleModalVisible(false)
            setSettleProject(null)
            await loadProjects()
            await loadUserTickets()
            const ab = await myERC20Contract.methods.balanceOf(account).call()
            setAccountBalance(Number(ab))
        } catch (error: any) {
            console.error('Settle project error:', error)
            if (error.message.includes('User denied transaction')) {
                message.error('用户取消了交易')
            } else if (error.message.includes('insufficient funds')) {
                message.error('账户余额不足')
            } else if (error.message.includes('execution reverted')) {
                message.error('交易执行失败，请检查参数')
            } else {
                message.error(`结算失败: ${error.message}`)
            }
        }
    }

    const onListTicket = async () => {
        if (!selectedTicket) {
            message.error('请选择要挂牌的彩票')
            return
        }

        if (listPrice <= 0) {
            message.error('挂牌价格必须大于0')
            return
        }

        try {
            await lotteryTicketContract.methods.listTicket(selectedTicket.tokenId, listPrice).send({
                from: account,
                gas: 200000,
                gasPrice: web3.utils.toWei('20', 'gwei')
            })

            message.success('彩票挂牌成功!')
            setListModalVisible(false)
            setSelectedTicket(null)
            setListPrice(0)
            await loadUserTickets()
        } catch (error: any) {
            console.error('List ticket error:', error)
            if (error.message.includes('User denied transaction')) {
                message.error('用户取消了交易')
            } else {
                message.error(`挂牌失败: ${error.message}`)
            }
        }
    }

    const onUnlistTicket = async (tokenId: number) => {
        try {
            await lotteryTicketContract.methods.unlistTicket(tokenId).send({
                from: account,
                gas: 200000,
                gasPrice: web3.utils.toWei('20', 'gwei')
            })

            message.success('取消挂牌成功!')
            await loadUserTickets()
            await loadMarketTickets()
        } catch (error: any) {
            console.error('Unlist ticket error:', error)
            if (error.message.includes('User denied transaction')) {
                message.error('用户取消了交易')
            } else {
                message.error(`取消挂牌失败: ${error.message}`)
            }
        }
    }

    const onBuyTicket = async (tokenId: number, price: number) => {
        try {
            // 检查买家是否有足够的代币
            const balance = await myERC20Contract.methods.balanceOf(account).call()
            if (Number(balance) < price) {
                message.error('代币余额不足')
                return
            }

            // 先授权合约转移代币
            await myERC20Contract.methods.approve(lotteryTicketContract.options.address, price).send({
                from: account,
                gas: 200000,
                gasPrice: web3.utils.toWei('20', 'gwei')
            })

            // 购买彩票
            await lotteryTicketContract.methods.buyTicket(tokenId).send({
                from: account,
                gas: 300000,
                gasPrice: web3.utils.toWei('20', 'gwei')
            })

            message.success('购买成功!')
            await loadUserTickets()
            await loadMarketTickets()
            const ab = await myERC20Contract.methods.balanceOf(account).call()
            setAccountBalance(Number(ab))
        } catch (error: any) {
            console.error('Buy ticket error:', error)
            if (error.message.includes('User denied transaction')) {
                message.error('用户取消了交易')
            } else if (error.message.includes('insufficient funds')) {
                message.error('代币余额不足')
            } else {
                message.error(`购买失败: ${error.message}`)
            }
        }
    }

    const onClickConnectWallet = async () => {
        // 查看window对象里是否存在ethereum（metamask安装后注入的）对象
        // @ts-ignore
        const {ethereum} = window;
        if (!Boolean(ethereum && ethereum.isMetaMask)) {
            alert('MetaMask is not installed!');
            return
        }

        try {
            // 如果当前小狐狸不在本地链上，切换Metamask到本地测试链
            if (ethereum.chainId !== GanacheTestChainId) {
                const chain = {
                    chainId: GanacheTestChainId, // Chain-ID
                    chainName: GanacheTestChainName, // Chain-Name
                    rpcUrls: [GanacheTestChainRpcUrl], // RPC-URL
                };

                try {
                    // 尝试切换到本地网络
                    await ethereum.request({method: "wallet_switchEthereumChain", params: [{chainId: chain.chainId}]})
                } catch (switchError: any) {
                    // 如果本地网络没有添加到Metamask中，添加该网络
                    if (switchError.code === 4902) {
                        await ethereum.request({ method: 'wallet_addEthereumChain', params: [chain]
                        });
                    }
                }
            }

            // 小狐狸成功切换网络了，接下来让小狐狸请求用户的授权
            await ethereum.request({method: 'eth_requestAccounts'});
            // 获取小狐狸拿到的授权用户列表
            const accounts = await ethereum.request({method: 'eth_accounts'});
            // 如果用户存在，展示其account，否则显示错误信息
            setAccount(accounts[0] || 'Not able to get accounts');
        } catch (error: any) {
            alert(error.message)
        }
    }

    const addOption = () => {
        setProjectOptions([...projectOptions, ''])
    }

    const updateOption = (index: number, value: string) => {
        const newOptions = [...projectOptions]
        newOptions[index] = value
        setProjectOptions(newOptions)
    }

    const removeOption = (index: number) => {
        if (projectOptions.length > 2) {
            setProjectOptions(projectOptions.filter((_, i) => i !== index))
        }
    }

    return (
        <div className='container'>
            <Image
                width='100%'
                height='150px'
                preview={false}
                src={Header}
            />
            <div className='main'>
                <h1>去中心化赛彩系统</h1>

                {/* 账户信息 */}
                <Card title="账户信息" style={{marginBottom: '20px'}}>
                    <Space direction="vertical">
                        <Space>
                            <Button onClick={onClaimTokenAirdrop} type="primary">领取赛彩代币空投</Button>
                            <Button onClick={async () => {
                                if (!myERC20Contract) {
                                    message.error('合约未初始化')
                                    return
                                }
                                try {
                                    const name = await myERC20Contract.methods.name().call()
                                    const symbol = await myERC20Contract.methods.symbol().call()
                                    message.success(`合约连接成功: ${name} (${symbol})`)
                                } catch (error: any) {
                                    message.error(`合约连接失败: ${error.message}`)
                                }
                            }}>测试合约连接</Button>
                        </Space>
                <div>管理员地址：{managerAccount}</div>
                        <div>合约地址：</div>
                        <div style={{fontSize: '12px', fontFamily: 'monospace'}}>
                            MyERC20: {myERC20Contract?.options.address}<br/>
                            BettingSystem: {bettingSystemContract?.options.address}<br/>
                            LotteryTicket: {lotteryTicketContract?.options.address}
                        </div>
                <div className='account'>
                    {account === '' && <Button onClick={onClickConnectWallet}>连接钱包</Button>}
                    <div>当前用户：{account === '' ? '无用户连接' : account}</div>
                            <div>赛彩代币余额：{accountBalance}</div>
                        </div>
                    </Space>
                </Card>

                {/* 管理员操作 */}
                {account === managerAccount && (
                    <Card title="管理员操作" style={{marginBottom: '20px'}}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setCreateProjectModalVisible(true)}
                        >
                            创建赛彩项目
                        </Button>
                    </Card>
                )}

                {/* 赛彩项目列表 */}
                <Card title="赛彩项目" style={{marginBottom: '20px'}}>
                    <List
                        dataSource={projects}
                        renderItem={(project) => (
                            <List.Item
                                actions={[
                                    project.isActive && Date.now() / 1000 < project.endTime && account !== managerAccount ? (
                                        <Button
                                            type="primary"
                                            icon={<ShoppingCartOutlined />}
                                            onClick={() => {
                                                setSelectedProject(project)
                                                setBetModalVisible(true)
                                            }}
                                        >
                                            投注
                                        </Button>
                                    ) : (
                                        project.isActive ? (
                                            account === managerAccount ? (
                                                <Button
                                                    type="primary"
                                                    danger
                                                    onClick={() => {
                                                        setSettleProject(project)
                                                        setSettleModalVisible(true)
                                                    }}
                                                >
                                                    结算项目
                                                </Button>
                                            ) : (
                                                Date.now() / 1000 < project.endTime ? (
                                                    <Button
                                                        type="primary"
                                                        icon={<ShoppingCartOutlined />}
                                                        onClick={() => {
                                                            setSelectedProject(project)
                                                            setBetModalVisible(true)
                                                        }}
                                                    >
                                                        投注
                                                    </Button>
                                                ) : (
                                                    <Tag color="orange">等待管理员结算</Tag>
                                                )
                                            )
                                        ) : (
                                            <Tag color="green">已结算</Tag>
                                        )
                                    )
                                ]}
                            >
                                <List.Item.Meta
                                    title={project.title}
                                    description={
                                        <div>
                                            <div>选项：{project.options.join(' | ')}</div>
                                            <div>奖池：{project.totalPool} 代币</div>
                                            <div>总投注：{project.totalBetAmount} 代币</div>
                                            <div>
                                                结束时间：{new Date(project.endTime * 1000).toLocaleString()}
                                                {project.winnerOptionId > 0 && (
                                                    <span> | 获胜：{project.options[project.winnerOptionId]}</span>
                                                )}
                                            </div>
                </div>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                </Card>

                {/* 用户彩票 */}
                <Card title="我的彩票" style={{marginBottom: '20px'}}>
                    <List
                        dataSource={userTickets}
                        renderItem={(ticket) => {
                            const project = projects.find(p => p.id === ticket.bettingId)
                            return (
                                <List.Item
                                    actions={[
                                        !ticket.isListed ? (
                                            <Button
                                                icon={<DollarOutlined />}
                                                onClick={() => {
                                                    setSelectedTicket(ticket)
                                                    setListModalVisible(true)
                                                }}
                                            >
                                                挂牌出售
                                            </Button>
                                        ) : (
                                            <Space>
                                                <Tag color="orange">已挂牌 ({ticket.listPrice}代币)</Tag>
                                                <Button
                                                    size="small"
                                                    onClick={() => onUnlistTicket(ticket.tokenId)}
                                                >
                                                    取消挂牌
                                                </Button>
                                            </Space>
                                        )
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={`彩票 #${ticket.tokenId}`}
                                        description={
                                            <div>
                                                <div>项目：{project?.title || '未知项目'}</div>
                                                <div>选项：{project?.options[ticket.optionId] || '未知选项'}</div>
                                                <div>投注金额：{ticket.amount} 代币</div>
                                            </div>
                                        }
                                    />
                                </List.Item>
                            )
                        }}
                    />
                </Card>

                {/* 二手市场 */}
                <Card title="二手市场" style={{marginBottom: '20px'}}>
                    <List
                        dataSource={marketTickets}
                        renderItem={(ticket) => {
                            const project = projects.find(p => p.id === ticket.bettingId)
                            return (
                                <List.Item
                                    actions={[
                                        <Button
                                            type="primary"
                                            icon={<ShoppingCartOutlined />}
                                            onClick={() => onBuyTicket(ticket.tokenId, ticket.listPrice)}
                                        >
                                            购买 ({ticket.listPrice}代币)
                                        </Button>
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={`彩票 #${ticket.tokenId}`}
                                        description={
                                            <div>
                                                <div>项目：{project?.title || '未知项目'}</div>
                                                <div>选项：{project?.options[ticket.optionId] || '未知选项'}</div>
                                                <div>原投注：{ticket.amount} 代币</div>
                                                <div style={{color: 'green', fontWeight: 'bold'}}>
                                                    挂牌价格：{ticket.listPrice} 代币
                                                </div>
                                                {project && Date.now() / 1000 < project.endTime ? (
                                                    <Tag color="green">进行中</Tag>
                                                ) : (
                                                    <Tag color="red">已结束</Tag>
                                                )}
                                            </div>
                                        }
                                    />
                                </List.Item>
                            )
                        }}
                    />
                    {marketTickets.length === 0 && (
                        <div style={{textAlign: 'center', color: '#999', padding: '20px'}}>
                            暂无挂牌彩票
                        </div>
                    )}
                </Card>

                {/* 创建项目Modal */}
                <Modal
                    title="创建赛彩项目"
                    open={createProjectModalVisible}
                    onOk={onCreateProject}
                    onCancel={() => setCreateProjectModalVisible(false)}
                >
                    <Space direction="vertical" style={{width: '100%'}}>
                        <Input
                            placeholder="项目标题"
                            value={projectTitle}
                            onChange={(e) => setProjectTitle(e.target.value)}
                        />
                <div>
                            <div style={{marginBottom: '10px'}}>选项：</div>
                            {projectOptions.map((option, index) => (
                                <div key={index} style={{display: 'flex', marginBottom: '5px'}}>
                                    <Input
                                        placeholder={`选项 ${index + 1}`}
                                        value={option}
                                        onChange={(e) => updateOption(index, e.target.value)}
                                        style={{marginRight: '10px'}}
                                    />
                                    {projectOptions.length > 2 && (
                                        <Button
                                            danger
                                            onClick={() => removeOption(index)}
                                        >
                                            删除
                                        </Button>
                                    )}
                </div>
                            ))}
                            <Button onClick={addOption} icon={<PlusOutlined />}>添加选项</Button>
                    </div>
                        <Input
                            type="number"
                            placeholder="奖池金额"
                            value={projectPool}
                            onChange={(e) => setProjectPool(Number(e.target.value))}
                        />
                        <Input
                            type="number"
                            placeholder="持续时间（秒）"
                            value={projectDuration}
                            onChange={(e) => setProjectDuration(Number(e.target.value))}
                        />
                    </Space>
                </Modal>

                {/* 投注Modal */}
                <Modal
                    title={`投注 - ${selectedProject?.title}`}
                    open={betModalVisible}
                    onOk={onPlaceBet}
                    onCancel={() => setBetModalVisible(false)}
                >
                    <Space direction="vertical" style={{width: '100%'}}>
                        <Select
                            style={{width: '100%'}}
                            placeholder="选择选项"
                            value={selectedOption}
                            onChange={setSelectedOption}
                        >
                            {selectedProject?.options.map((option, index) => (
                                <Select.Option key={index} value={index}>
                                    {option}
                                </Select.Option>
                            ))}
                        </Select>
                        <Input
                            type="number"
                            placeholder="投注金额"
                            value={betAmount}
                            onChange={(e) => setBetAmount(Number(e.target.value))}
                        />
                    </Space>
                </Modal>

                {/* 结算Modal */}
                <Modal
                    title={`结算项目 - ${settleProject?.title}`}
                    open={settleModalVisible}
                    onOk={onConfirmSettleProject}
                    onCancel={() => setSettleModalVisible(false)}
                >
                    <Space direction="vertical" style={{width: '100%'}}>
                        <div>请选择获胜选项：</div>
                        <Select
                            style={{width: '100%'}}
                            placeholder="选择获胜选项"
                            value={winnerOption}
                            onChange={setWinnerOption}
                        >
                            {settleProject?.options.map((option, index) => (
                                <Select.Option key={index} value={index}>
                                    {option}
                                </Select.Option>
                            ))}
                        </Select>
                        <div style={{color: 'red'}}>
                            注意：一旦结算，项目将永久关闭，所有胜利者的奖励将自动分发。
                        </div>
                    </Space>
                </Modal>

                {/* 挂牌Modal */}
                <Modal
                    title={`挂牌出售 - 彩票 #${selectedTicket?.tokenId}`}
                    open={listModalVisible}
                    onOk={onListTicket}
                    onCancel={() => {
                        setListModalVisible(false)
                        setSelectedTicket(null)
                        setListPrice(0)
                    }}
                >
                    <Space direction="vertical" style={{width: '100%'}}>
                        {selectedTicket && (
                            <div>
                                <div><strong>彩票信息：</strong></div>
                                <div>项目：{projects.find(p => p.id === selectedTicket.bettingId)?.title}</div>
                                <div>选项：{projects.find(p => p.id === selectedTicket.bettingId)?.options[selectedTicket.optionId]}</div>
                                <div>投注金额：{selectedTicket.amount} 代币</div>
                            </div>
                        )}
                        <Input
                            type="number"
                            placeholder="设置挂牌价格（代币）"
                            value={listPrice}
                            onChange={(e) => setListPrice(Number(e.target.value))}
                            min={0}
                        />
                        <div style={{color: 'orange'}}>
                            💡 提示：设置合理的价格才能吸引买家，建议略高于你的投注成本。
                        </div>
                    </Space>
                </Modal>
            </div>
        </div>
    )
}

export default LotteryPage