// This runs before the deduct
function beforeTransaction(transaction) {
    return true; // Approve transaction
  }
  
  // This runs after the deduct
  function afterTransaction(transaction) {
    var card = root.cards.find(transaction.card_id);
    var m = transaction.merchant;
    var merchDesc = [m.name.toLowerCase(), m.location.toLowerCase()].join(', ');
    var tsDesc = (new Date(transaction.created_at)).toString();
    
    var data = {
      id: transaction.transaction_id,
      card: card.name,
      amount: transaction.amount/100,
      merchant: merchDesc,
      timestamp: tsDesc,
      category: m.category
    }
    
    sheets.insertRow(data);
    var msg = card.name + ' spent ' + zarString(transaction.amount) + '  at ' + merchDesc + ' on ' + tsDesc;
    var pushOpts = {
      device: 'iris', 
      sound: 'cashregister',
      url: process.env.SHEET_URL,
      url_title: 'budget'
    };
      
    pushover.push(msg, pushOpts);
  }
  
  var sheets = {
    get: function(data) {
      var url = process.env.APPSCRIPT_URL;
      var query = Object.keys(data).reduce(function(a,k){a.push(k+'='+encodeURIComponent(data[k]));return a},[]).join('&');
      url = url + '?' + query;
      console.log(url);
      var result = root.get(url);
      console.log(result);
    },
    insertRow: function(data) {
      data.cmd = 'newtx';
      data.token = process.env.APPSCRIPT_TOKEN;
      sheets.get(data);
    }
  }
  
  var pushover = {
    push: function(msg, options) {
      let data = {
        token: process.env.PUSHOVER_TOKEN,
        user: process.env.PUSHOVER_USER,
        message: msg
      };
      var request = {
        url: 'https://api.pushover.net/1/messages.json',
        form: Object.assign(data, options)
      };
      var result = root.post(request);
      console.log(result);
      }
  }