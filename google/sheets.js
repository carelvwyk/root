/**
* Requirements: A template sheet named "Template" with the following format:
* "ID,	Timestamp,	Merchant,	Card,	Amount,	Category"
*/

var app = SpreadsheetApp.getActiveSpreadsheet();

/**
 * LoadTable assumes spreadsheet data is structured as a table
 * with one header row and 0 or more data rows.
 * It returns an associative array of column indexes by name (lowercased)
 * and the rest of the table data (excluding the header row).
 */
function loadTable(sheetName) {
  var sheet = app.getSheetByName(sheetName);
  if (sheet == null) {
    throw ("sheet named "+sheetName+" not found");
  }
  var range = sheet.getDataRange();
  var data = range.getValues();
  if (data.length < 1) {
    throw "no header row";
  }
  var header = data.shift(); // Removes first row from `data` and stores in `header`
  var cols = {};
  for (var i = 0; i < header.length; i++) {
    cols[header[i].toLowerCase()] = parseInt(i)+1;
  }
  // Cut off the header row:
  range = range.offset(1, 0);
  return {cols: cols, range: range};
}

function loadOrCreateTable(sheetName) {
  // Check whether sheetname exists. Create if not. Then load.
  var sheet = app.getSheetByName(sheetName);
  if (sheet == null) {
    var templateSheet = app.getSheetByName('Template');
    sheet = app.insertSheet(sheetName, 1, {template: templateSheet});
  }
  return loadTable(sheetName);
}

function rowsWhere(context, columnName, value) {
  var res = [];
  columnName = columnName.toLowerCase();
  for (var i = 0; i < context.range.getNumRows(); i++) {
    if (context.range.getCell(i+1, context.cols[columnName]).getValue() == value) {
      var row = {};
      for (var col in context.cols) {
        row[col] = context.range.getCell(i+1, context.cols[col]).getValue();
      }
      res.push(row);
    }
  }
  return res;
}

function getValue(ctx, colName, rowIndex) {
  Logger.log("Getting value for column " + colName + " at row " + rowIndex);
  colName = colName.toLowerCase();
  var numRows = ctx.range.getNumRows();
  if (rowIndex <= 0 || rowIndex > ctx.range.getNumRows() || ctx.cols[colName] == undefined) {
    return undefined;
  }
  return ctx.range.getCell(rowIndex, ctx.cols[colName]).getValue();
}

function updateRow(ctx, colName, rowIndex, newValue) {
  Logger.log("Setting column " + colName + " row " + rowIndex + " to " + newValue);
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

function testLoadOrCreateTable() {
  loadOrCreateTable('Aug 2017');
}
