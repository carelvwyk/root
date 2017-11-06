// CouplesCards will eventually turn into an app that can be used by couples
// to manage a shared expense account by notifying both people when a payment
// is made, logging all expenses to a Google Sheet and keeping track
// of a shared budget so you can save up for that Bali holiday :)

// Setup instructions:
// Create and fill in the following Root configuration variables for each card:
// MOBILE1 - first person's cellnum
// MOBILE2 - second person's cellnum
// APPSCRIPT_URL - Google app script URL (published as anonymous web app without authentication)
// APPSCRIPT_TOKEN - token used to authenticate to the app script

// TODOs:
// 1. Sometimes the transaction fails but afterTransaction still adds it to the 
// sheet. Need to investigate and figure out how to avoid adding failed 
// transactions.


// This runs before the deduct
function beforeTransaction(transaction) {
  return true; // Approve transaction
}

// This runs after the deduct
function afterTransaction(transaction) {
  var card = root.cards.find(transaction.card_id);
  var m = transaction.merchant;
  var merchDesc = [m.name.toLowerCase(), m.location.toLowerCase()].join(', ');
  var tsDesc = (new Date(transaction.created_at)).toString().substring(0,21);
  
  var data = {
    id: transaction.transaction_id,
    card: card.name,
    amount: transaction.amount/100,
    merchant: merchDesc,
    timestamp: tsDesc,
    category: m.category
  };
  
  sheets.insertRow(data);
  var budget = JSON.parse(sheets.getBudget());
  var msg = card.name + ' spent ' + zarString(transaction.amount) + 
  ' at ' + merchDesc + ' on ' + tsDesc + '. Available: ' + zarString(budget.available*100);
  root.sendSMS(msg, process.env.MOBILE1 || null);
  root.sendSMS(msg, process.env.MOBILE2 || null);
}

var sheets = {
  get: function(data) {
    data.token = process.env.APPSCRIPT_TOKEN;
    var url = process.env.APPSCRIPT_URL;
    var query = Object.keys(data).reduce(function(a,k){a.push(k+'='+encodeURIComponent(data[k]));return a},[]).join('&');
    url = url + '?' + query;
    var result = root.get(url);
    console.log(result);
    return result;
  },
  insertRow: function(data) {
    data.cmd = 'newtx';
    sheets.get(data);
  },
  getBudget: function() {
    return sheets.get({'cmd': 'getBudget'});
  }
}