const ethConnector = require("ethconnector");
const assert = require("assert"); // node.js core module
const { sendTx, getBalance } = require("runethtx");

const VaultController = require("../js/vaultcontroller");

describe("Normal Scenario test for VaultController", () => {
    let vaultController;
    let owner;
    let escapeHatchCaller;
    let escapeHatchDestination;
    let spender;
    let recipient;
    let parentVault;
    let admin;
    const web3 = ethConnector.web3;

    let primaryVaultAddr;

    before(async () => {
        const opts = { accounts: [
            { index: 0, balance: `0x${ (new web3.BigNumber(web3.toWei(1000))).toString(16) }` },
            { index: 1, balance: `0x${ (new web3.BigNumber(web3.toWei(1000))).toString(16) }` },
            { index: 2, balance: `0x${ (new web3.BigNumber(web3.toWei(1000))).toString(16) }` },
            { index: 3, balance: `0x${ (new web3.BigNumber(web3.toWei(1000))).toString(16) }` },
            { index: 4, balance: `0x${ (new web3.BigNumber(web3.toWei(1000))).toString(16) }` },
            { index: 5, balance: `0x${ (new web3.BigNumber(web3.toWei(1000))).toString(16) }` },
            { index: 6, balance: `0x${ (new web3.BigNumber(web3.toWei(1000))).toString(16) }` },
            { index: 7, balance: `0x${ (new web3.BigNumber(web3.toWei(1000))).toString(16) }` },
            { index: 8, balance: `0x${ (new web3.BigNumber(web3.toWei(1000))).toString(16) }` },
            { index: 9, balance: `0x${ (new web3.BigNumber(web3.toWei(1000))).toString(16) }` },
        ] };
        await ethConnector.init("testrpc", opts);
        owner = ethConnector.accounts[ 0 ];
        escapeHatchCaller = ethConnector.accounts[ 1 ];
        escapeHatchDestination = ethConnector.accounts[ 2 ];
        spender = ethConnector.accounts[ 4 ];
        recipient = ethConnector.accounts[ 5 ];
        parentVault = ethConnector.accounts[ 6 ];
        admin = ethConnector.accounts[ 7 ];
    });
    it("should deploy all the contracts ", async () => {
        vaultController = await VaultController.deploy(ethConnector.web3, {
            from: owner,
            name: "Main Vault",
            baseToken: 0,
            escapeHatchCaller,
            escapeHatchDestination,
            parentVaultController: 0,
            parentVault,
            dailyAmountLimit: ethConnector.web3.toWei(100),
            dailyTxnLimit: 5,
            txnAmountLimit: ethConnector.web3.toWei(50),
            highestAcceptableBalance: ethConnector.web3.toWei(500),
            lowestAcceptableBalance: ethConnector.web3.toWei(50),
            whiteListTimelock: 86400,
            openingTime: 0,
            closingTime: 86400,
            verbose: false,
        });
        const st = await vaultController.getState();
        primaryVaultAddr = st.primaryVault.address;
        assert.equal(owner, st.owner);
    }).timeout(20000);
    it("Should send to the primary vault", async () => {
        await sendTx(ethConnector.web3, {
            from: owner,
            to: primaryVaultAddr,
            value: web3.toWei(500),
            gas: 200000,
        });

        const st = await vaultController.getState();
        assert.equal(st.primaryVault.balance, web3.toWei(500));
        const balance = await getBalance(ethConnector.web3, primaryVaultAddr);
        assert.equal(balance, web3.toWei(500));
    }).timeout(6000000);
    it("Should add a child vault", async () => {
        await vaultController.createChildVault({
            from: owner,
            name: "Project 1",
            admin,
            dailyAmountLimit: ethConnector.web3.toWei(100),
            dailyTxnLimit: 5,
            txnAmountLimit: ethConnector.web3.toWei(10),
            highestAcceptableBalance: ethConnector.web3.toWei(20),
            lowestAcceptableBalance: ethConnector.web3.toWei(2),
            whiteListTimelock: 86400,
            openingTime: 0,
            closingTime: 86400,
            verbose: false,
        });
        const st = await vaultController.getState();
        assert.equal(st.childVaults.length, 1);
        assert.equal(st.childVaults[ 0 ].name, "Project 1");
        assert.equal(st.childVaults[ 0 ].primaryVault.balance, web3.toWei(20));
        assert.equal(st.primaryVault.balance, web3.toWei(480));
    }).timeout(20000);
/*    it("Should read test", (done) => {
        vaultController.contract.test1((err, res) => {
            if (err) return done(err);
            console.log("test1: " + res);
            done();
        });
    }); */
    it("Should authorize a spender", async () => {
        await vaultController.authorizeSpender({
            name: "Spender 1",
            addr: spender,
            dailyAmountLimit: ethConnector.web3.toWei(100),
            dailyTxnLimit: 5,
            txnAmountLimit: ethConnector.web3.toWei(10),
            openingTime: 0,
            closingTime: 86400,
        });
        const st = await vaultController.getState();
        assert.equal(st.spenders.length, 1);
        assert.equal(st.spenders[ 0 ].name, "Spender 1");
        assert.equal(st.spenders[ 0 ].addr, spender);
        assert.equal(st.spenders[ 0 ].dailyAmountLimit, ethConnector.web3.toWei(100));
        assert.equal(st.spenders[ 0 ].dailyTxnLimit, 5);
        assert.equal(st.spenders[ 0 ].txnAmountLimit, ethConnector.web3.toWei(10));
        assert.equal(st.spenders[ 0 ].openingTime, 0);
        assert.equal(st.spenders[ 0 ].closingTime, 86400);
    }).timeout(10000);
});
