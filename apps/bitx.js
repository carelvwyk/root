// Some old code that integrated BitX, no longer working with new Root API

var SANDBOX = true;

function beforeTransaction(transaction) {
  let bitX = root.pockets.findByName('BitX');
  let primary = root.pockets.findByName('Primary');
  
  // If insufficient balance, do an emergency topup from Primary:
  if (bitX.balance < transaction.amount) {
    try {
      root.move({
        fromPocketId: primary._id,
        toPocketId: bitX._id,
        amount: transaction.amount - bitX.balance,
        description: 'internal topup'
      });
    } catch (err) {
      pushOverMessage(JSON.stringify(err));
      return null; // fail
    }
  }

  return bitX._id;
}

function afterTransaction(transaction) {
  const topupThreshold = 100*100; // R100.00
  console.log("after transaction");
  
  let bitX = root.pockets.findByName('BitX');
  if (transaction.pocketId != bitX._id) {
    // Only convert Bitcoin and topup if funds were deducted from BitX pocket.
    return; 
  }
  
  // Send pushover message. :)
  let msg = "Spent R"+prettyAmount(transaction.amount)+" at "+
    transaction.shop;
  pushOverMessage(msg);
  
  let activeWithdrawal = null;
  let topupAmount = getTopupAmount();
  let convertAmount = transaction.amount;
  
  try {
    activeWithdrawal = getActiveWithdrawal();
  } catch (err) {
    pushOverMessage(JSON.stringify(err));
    return;
  }
  
  // If topup amount is above threshold (R100) and there is no withdrawal 
  // pending or processing on BitX's side, then we need to request a 
  // new topup which costs R8.50.
  // So then we need to convert card transaction amount + R8.50.
  if (bitxActiveWithdrawal === null && topupAmount >= topupThreshold) {
    convertAmount += 850;
  }
  
  console.log(convertAmount);
  console.log(topupAmount);
  console.log(activeWithdrawal);
  
  // Try to convert the equivalent amount Bitcoin to Zumacoin.
  try {
    convertBitcoin(convertAmount);
  } catch (err) {
    console.log("exception: " + err);
    pushOverMessage(JSON.stringify(err));
    return;
    // If an error occured, manually convert some Bitcoin to Zumacoin.
  }
    
  // If the BitX withdrawal is pending, it can be cancelled so we can request
  // a new topup with the current requir ed topup amount.
  if (activeWithdrawal !== null && activeWithdrawal.status == 'PENDING') {
    try {
      cancelWithdrawal(activeWithdrawal.id);  
      activeWithdrawal = null;
    } catch (err) {
      pushOverMessage(JSON.stringify(err));
      return;
    }
  }
  
  if (activeWithdrawal === null && topupAmount >= topupThreshold) {
    try {
      requestTopup(topupAmount);
    } catch (err) {
      pushOverMessage(JSON.stringify(err));
      return;
    }  
  }
}


// Utility functions:

// convertBitcoin exchanges the indicated amount in Rand from Bitcoin to 
// Zumacoin.
// TODO: Use a cheaper strategy, quotes have a 2% fee.
function convertBitcoin(randAmount) {
  // Create quote:
  let quoteParams = {
    type: 'BUY',
    pair: 'ZARXBT',
    base_amount: (randAmount / 100.0)
  };
  let quote = JSON.parse(root.post(bitxBase+'quotes', quoteParams).body);
  console.log(quote);
  if (quote.error) {
    throw quote.error;
  }
  
  // Execute quote:
  let resp = JSON.parse(root.put(bitxBase+'quotes/'+quote.id, {}).body);
  console.log(resp);
  if (resp.error) {
    throw resp.error;
  }
}

// requestTopup requests a withdrawal from BitX for the given amount 
// specified in cents.
function requestTopup(randAmount) {
  let params = {
    type: 'ZAR_EFT',
    amount: randAmount/100.0
  };
  if (rootBeneficiary !== null) {
    params.beneficiary_id = rootBeneficiary;
  }
  console.log(params);
  let resp = JSON.parse(root.post(bitxBase+'withdrawals', params).body);
  if (resp.error) {
    throw resp.error;
  }
  console.log(resp);
}

// getActiveWithdrawal returns the latest pending or processing
// BitX withdrawal, or null if there is no active withdrawal.
// Note: BitX only allows one active withdrawal of a given type at a time.
function getActiveWithdrawal() {
  let withdrawals = JSON.parse(root.get(bitxBase+'withdrawals').body);
  console.log(withdrawals);
  if (withdrawals.error) {
    throw withdrawals.error;
  }
  for (let i = 0; i < withdrawals.length; ++i) {
    let w = withdrawals[i];
    if (w.type == 'ZAR' && (w.status == 'PENDING' || w.status == 'PROCESSING')) {
      return w;
    }
  }
  return null;
}

// topupAmount calculates the amount with which the BitX pocket should be
// topped up.
function getTopupAmount() {
  let topups = 0;
  let payments = 0;
  
  let txs = root.pockets.transactions(root.pockets.findByName('Primary')._id);
  for (let i = 0; i < txs.length; ++i) {
    let tx = txs[i];
    if (tx.method == 'eft' && tx.action == 'received') {
      topups += tx.amount;
    } else if (tx.method == 'card' && tx.action == 'sent') {
      payments += tx.amount;
    }
  }
  return payments-topups;
}

// pushOverMessage sends a push notification to the "Pushover" app on 
// my iPhone.
function pushOverMessage(msg) {
  if (SANBOX) {
    console.log(msg);
    return;
  }
  
  let url = "https://api.pushover.net/1/messages.json";
  let data = {
    token: process.env.pushover_token, 
    user: process.env.pusover_user,
    sound: 'cashregister', 
    message: msg 
  };
  root.post(url, data);
}