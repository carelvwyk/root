/**
 * Google app script module that supports adding data to a sheet 
 * (with authentication).
 * @module sheets
 * @author {@link https://github.com/carelvwyk}
 */ 

/**
 * Google app script object "Range", 
 * @see {@link https://developers.google.com/apps-script/reference/spreadsheet/range}
 * @typedef {Object} Range
 */

/**
 * TableInfo represents Table data including a column name to index map and row 
 * data.
 * @typedef {Object} TableInfo
 * @property {Range} data - Table data excluding table header row, including 
 *  empty "insert" row.
 * @property {Object.<string, number>} cols - Table column name (lowercased) 
 *  to index mapping.
 */

/**
 * loadTable assumes spreadsheet data is structured as a table with one header 
 * row and 0 or more data rows. It returns an associative array of column 
 * indexes by name (lowercased) and the rest of the table data 
 * (excluding the header row).
 * @param {string} sheetName the name of the sheet to load
 * @returns {TableInfo}
 */
function loadTable(sheetName) {
  var active = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = active.getSheetByName(sheetName);
  if (sheet == null) {
    throw ("sheet named "+sheetName+" not found");
  }
  var range = sheet.getDataRange();
  var data = range.getValues();
  if (data.length < 1) {
    throw "no header row";
  }
  // Removes first row from `data` and stores in `header`
  var header = data.shift(); 
  var cols = {};
  for (var i = 0; i < header.length; i++) {
    cols[header[i].toLowerCase()] = i+1;
  }
  // Cut off the header row:
  range = range.offset(1, 0);
  var tableInfo = {cols: cols, range: range};
  return tableInfo;
}

/**
 * Row is a map with column names(lowercased) as keys and cell content as values
 * @typedef {Object.<string,string>} Row
 */

/**
 * rowsWhere is like SQL "select * from tableInfo where columnName=value".
 * @param {TableInfo} tableInfo - see loadTable()
 * @param {string} columnName
 * @param {string} value
 * @returns {Array.<Row>}
 */
function rowsWhere(tableInfo, columnName, value) {
  var res = [];
  columnName = columnName.toLowerCase();
  for (var i = 0; i < tableInfo.range.getNumRows(); i++) {
    if (tableInfo.range.getCell(i+1, tableInfo.cols[columnName]).getValue() == value) {
      var row = {};
      for (var col in tableInfo.cols) {
        row[col] = tableInfo.range.getCell(i+1, context.cols[col]).getValue();
      }
      res.push(row);
    }
  }
  return res;
}

function getValue(ctx, colName, rowIndex) {
  colName = colName.toLowerCase();
  var numRows = ctx.range.getNumRows();
  if (rowIndex <= 0 || rowIndex > ctx.range.getNumRows() || ctx.cols[colName] == undefined) {
    return undefined;
  }
  return ctx.range.getCell(rowIndex, ctx.cols[colName]).getValue();
}

function updateRow(ctx, colName, rowIndex, newValue) {
  colName = colName.toLowerCase();
  if (ctx.cols[colName] == undefined) {
    Logger.log("Invalid column name: " + colName);
    return;
  }
  if (newValue == undefined || newValue == null) {
    return;
  }
  ctx.range.getCell(rowIndex, ctx.cols[colName]).setValue(newValue);
}

/**
 * insertRow inserts "data" after the last non-empty row on the sheet.
 * Only values for keys that match column titles will be added in those columns,
 * the rest of the values will be ignored.
 */
function insertRow(ctx, data) {
  Logger.log("Inserting new row: " + JSON.stringify(data));
  var range = ctx.range;
  var lastRowIndex = range.getNumRows();
  Logger.log(lastRowIndex);
  for (var col in data) {
    updateRow(ctx, col, lastRowIndex, data[col]); 
  }
}
function testInsertRow() {
  var ctx = loadTable("Transactions");
  var data = {"id":99912, "amount":102};
  insertRow(ctx, data);
}

// --- Sheet funcs
// +++ Network funcs
function testSHA() {
  var outBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, '123');
  Logger.log(outBytes);
  var digest = outBytes.map(function(b) {return ("0"+((b+256)%256).toString(16)).slice(-2)}).join("");
  Logger.log(digest);
}

function auth(e) {
  // Set token hash property in File -> Project properties -> Script properties
  var scriptProps = PropertiesService.getScriptProperties();
  var authHash = scriptProps.getProperty('NEW_TX_TOKEN_HASH');
  if (authHash == null) {
    throw ("token hash not found");  
  
    var digestBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, e.parameter['token']);
  // Convert digest bytes to hex string
  var digest = digestBytes.map(function(b) {return ("0"+((b+256)%256).toString(16)).slice(-2)}).join("");
  // Should be using constant time compare
  if (digest != authHash && globalTesting != true) {
    throw ("invalid auth token");
  }
}

function handleNewTx(e) {
  var id = e.parameter['id'];
  var ctx = loadTable('Transactions');
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

function testHandleGetUncategorised() {
  var res = handleGetUncategorised();
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
      default:
        return ContentService.createTextOutput(JSON.stringify({"error":"invalid command"}))
      .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({"error":err}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// https://script.google.com/macros/s/AKfycbzAAlfs246eKmR1Rc_H3fcqPDrM39KyNn0Xrng-nk161qx-Dwcv/exec
// https://script.google.com/macros/s/AKfycby0JiU5JL1bQrF7WnS34jx83H5jzxH2kOhO7mzzRfli/dev
function doPost(e) {
  return doGet(e); // Google app scripts are broken, only GET requests work. POST returns 404
}

// --- Network funcs

// +++ Testing funcs
function testDoPost() {
    globalTesting = true;
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
  }
  // --- Testing funcs
  