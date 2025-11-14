import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";

const config: HardhatUserConfig = {
  // Solidity compiler version
  solidity: "0.8.9",
  networks: {
    ganache: {
      // Change the url according to your ganache configuration
      url: 'http://localhost:8545',
      // Change these accounts private keys according to your ganache configuration.
      accounts: [
        '0xaf961e56824bc8e6617c4107413ed34f9c85a11ef84b3834e45c825bc2d0111b',
        '0x54355a21eea0569fd84ca7dd59001f7d62bd4af8548ea109b4a438424a36497c',
        '0x6bbfc7830682202b64c0ce3e7d7ba3da2599cab47a1c16c19e8cbc63aaad600a',
      ]
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
};

export default config;
