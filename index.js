const axios = require('axios');
const Web3 = require('web3');
const config = require("./utils/config.json")
const abi = require("./utils/abi.json");
const contractAddress = config.contractAddress;
const bscscanURL = config.bscscanURL;
const ethHttpEndPoint = config.connectionURL;
const bscHttpEndPoint = config.bscURL;
let web3 = new Web3(new Web3.providers.HttpProvider(bscHttpEndPoint));

const fs = require('fs');
const fileName = './output/list.json';
var file = require("./output/list.json");

async function main() {
    try{
    console.log("start script");
    let userList = [], rewardList = [], normalRewardList = [], accUserList = [], accRewardList = [], accNormalRewardList = [];
    let usersA = new Map()
    const methodId = "0x0a57336a";
    let contract = await new web3.eth.Contract(abi,contractAddress);
    let stakeCount = await contract.methods.getStakingCount().call();
    let rewardPercent = await contract.methods.getRewardPercentage().call();
    let withdrawLimit = await contract.methods.getWithdrawLimit().call();
    console.log("stakeCount: ", stakeCount, " & rewardPercent: ", rewardPercent, "% & withdrawLimit: ", withdrawLimit, "=", withdrawLimit/(60*60*24),"days");
    const response = await axios.get(`${bscscanURL}api?module=account&action=txlist&address=${contractAddress}&startblock=1&endblock=99999999&sort=asc&apikey=YourApiKeyToken`)
    console.log("Fetched transaction response length: ", response.data.result.length);
    const responseLength = response.data.result.length;
    let j = 0, k = 0, l = 0;
    for(i=0;i<responseLength; i++){
        if(response.data.result[i].input.slice(0,10) == methodId){
            ++j;
            const withdrawTimestamp = response.data.result[i].timeStamp;
            const stakingId = await web3.eth.abi.decodeParameter('uint256',response.data.result[i].input.slice(10,74));
            const usersTokens = await contract.methods.getStakingTokenById(stakingId).call();
            const stakingAddress = await contract.methods.getStakingAddressById(stakingId).call();
            const stakingStartTime = await contract.methods.getStakingStartTimeById(stakingId).call();
            const stakePeriod = withdrawTimestamp - stakingStartTime;
            if(stakePeriod>=withdrawLimit){
                console.log(++k, "reward this Stake ID: ", stakingId);
                const reward = (usersTokens * rewardPercent * stakePeriod/86400)/36500;
                console.log("user details:", stakingAddress, usersTokens, withdrawTimestamp, " - ", stakingStartTime, withdrawTimestamp-stakingStartTime, "reward: ", reward)
                if(usersA.has(stakingAddress)) {
                    usersA.set(stakingAddress, usersA.get(stakingAddress) + reward)
                } else {
                    usersA.set(stakingAddress, reward)
                }
                userList.push(stakingAddress);
                rewardList.push(reward);
                normalRewardList.push(reward/10**18);

            }
        }
    }

    for(var address of usersA.keys()){
        accUserList.push(address);
        accRewardList.push(usersA.get(address));
        accNormalRewardList.push(usersA.get(address)/10**18);

    }

    console.log(userList , rewardList)
    file.users = userList;
    file.rewards = rewardList;
    file.rewardsWithoutDecimals = normalRewardList;
    file.accUserList = accUserList;
    file.accRewardList = accRewardList;
    file.accNormalRewardList =accNormalRewardList;
    fs.writeFileSync(fileName, JSON.stringify(file, null, 2), function writeJSON(err) {
        if (err) return console.log(err);
        console.log(JSON.stringify(file));
        console.log('writing to ' + fileName);
      });

    console.log("\n total Stakes: ", stakeCount, "\n total withdraws: ", j, "\n eligible stakes ie stake withdraws done after 30 days: ", k)
    }catch(err){
        console.log("error: ", err);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });