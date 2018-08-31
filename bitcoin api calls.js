
// https://bitcoin.org/en/developer-reference#getblockchaininfo

const BitcoinRpc = require('bitcoin-rpc-promise');
 
let btc = new BitcoinRpc('http://t:e@localhost:8332');
 
// call named wrappers
// function must either be in camel case or all lower case
btc.getBlockHash(100).then(result => {
  console.log(result);
});



btc.getBlockchainInfo().then((result) => {
  console.log(result);
  console.log('chain: ' + result.chain);
  console.log('current difficulty: ' + result.difficulty);
})









