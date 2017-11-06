function auth(e) {
    // Set token hash property in File -> Project properties -> Script properties
    var scriptProps = PropertiesService.getScriptProperties();
    var authHash = scriptProps.getProperty('TOKEN_HASH');
    if (authHash == null) {
      throw ("token hash not found");
    }
    var digestBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, e.parameter['token']);
    // Convert digest bytes to hex string
    var digest = digestBytes.map(function(b) {return ("0"+((b+256)%256).toString(16)).slice(-2)}).join("");
    // Should be using constant time compare
    if (digest != authHash) {
      throw ("invalid auth token");
    }
  }
  
  // https://gist.github.com/willpatera/ee41ae374d3c9839c2d6
  function doGet(e) {
    try {
      // Authenticate with auth token
      auth(e);
      delete e.parameter['token'];
      
      var route = e.parameter['cmd'];
      delete e.parameter['cmd'];
      switch (route) {
        case "newtx":
          return handleNewTx(e);
        case "getUncategorised":
          return handleGetUncategorised();
        case "getBudget":
          return ContentService.createTextOutput(JSON.stringify(getBudgetResponse()))
            .setMimeType(ContentService.MimeType.JSON);
        default:
          return ContentService.createTextOutput(JSON.stringify({"error":"invalid command"}))
        .setMimeType(ContentService.MimeType.JSON);
      }
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({"error":err}))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  function doPost(e) {
    return doGet(e); // Google app scripts are broken, only GET requests work. POST returns 404
  }
  
  function handleNewTx(e) {
    var id = e.parameter['id'];
    var ctx = loadOrCreateTable(currentMonthTableName());
    // Make sure the row does not exist yet based on ID:
    if (rowsWhere(ctx, 'id', id).length > 0) {
      throw ("row already inserted");
    }
    insertRow(ctx, e.parameter);
    // Note: Luckily ctx contains one extra row when the table is loaded
    // so the row we just inserted will be included in ctx.range. 
    // rowsWhere will find the newly inserted row without having to 
    // load the table again.
    var newRows = rowsWhere(ctx, 'id', id);
    if (newRows.length != 1) {
      throw ("wrong number of rows inserted: " + newRows.length);
    }
    return ContentService.createTextOutput(JSON.stringify(newRows[0]))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  function handleGetUncategorised() {
    var ctx = loadTable("Transactions");
    var transactions = ctx.range.getValues();
    var cols = ctx.cols;
      
    // Find uncategorised transactions and make list of existing categories
    var categories = {};
    var uncategorised = [];
    for (var i = 0; i < ctx.range.getNumRows(); i++) {
      var category = getValue(ctx, "Category", i+1);
      if (category == "") {
        var uncat = getValue(ctx, "ID", i+1);
        if (uncat != "") {     
          uncategorised.push();
        }
      } else if (!categories[category]) {
        categories[category]=true;
      }
    }
    categories = Object.keys(categories);
    var res = {'categories':categories, 'uncategorised':uncategorised};
    Logger.log(res);
    return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
  }
  
  // getBudgetResponse returns total budget and remaining budget
  function getBudgetResponse() {
    return {'total': getTotalBudget(), 'available': getAvailableBudget()};
  }
  
  // +++ Tests
  function testDoPost() {
    var data = {};
    data.parameter = {};
    data.parameter['cmd'] = 'newtx';
    var res = doPost(data);
    Logger.log(res.getContent());
  }
  
  function testDoGet() {
    var data ='{"parameter":{"cmd":"newtx","token":"123", "id":"3943", "amount":"101.23"},"contextPath":"","contentLength":-1,"queryString":"token=123&cmd=newtx","parameters":{"cmd":["newtx"],"token":["123"]}}';
    var e = JSON.parse(data);
    var resp = doGet(e).getContent();
    Logger.log(resp);
    return resp;
  }
  
  function testSHA() {
    var outBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, '123');
    Logger.log(outBytes);
    var digest = outBytes.map(function(b) {return ("0"+((b+256)%256).toString(16)).slice(-2)}).join("");
    Logger.log(digest);
  }
  
  function testHandleGetUncategorised() {
    Logger.log(handleGetUncategorised());
  }
  
  function testGetBudgetResponse() {
    Logger.log(getBudgetResponse());
  }
  
  // --- Tests