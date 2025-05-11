require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    hardhat: {},
    lineaMainnet: {
      url: process.env.LINEA_RPC_URL || "https://rpc.linea.build",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: parseInt(process.env.CHAIN_ID || "59144"),
      gasPrice: 1000000000, // 1 gwei
    },
    lineaTestnet: {
      url: process.env.LINEA_TESTNET_RPC_URL || "https://rpc.goerli.linea.build",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: parseInt(process.env.TESTNET_CHAIN_ID || "59140"),
      gasPrice: 1000000000, // 1 gwei
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  etherscan: {
    apiKey: {
      lineaTestnet: process.env.LINEASCAN_API_KEY || "",
      lineaMainnet: process.env.LINEASCAN_API_KEY || ""
    },
    customChains: [
      {
        network: "lineaMainnet",
        chainId: 59144,
        urls: {
          apiURL: "https://api.lineascan.build/api",
          browserURL: "https://lineascan.build/"
        }
      },
      {
        network: "lineaTestnet",
        chainId: 59140,
        urls: {
          apiURL: "https://api-testnet.lineascan.build/api",
          browserURL: "https://goerli.lineascan.build/"
        }
      }
    ]
  },
  mocha: {
    timeout: 100000
  }
}; 