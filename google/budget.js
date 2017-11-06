var budgetValueRangeName = 'MonthlyBudget';

Date.prototype.getMonthText = function() {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'][this.getMonth()];
}

function getTotalBudget() {    
  // Get "Total Monthly Budget" value cell:
  var budgetRange = SpreadsheetApp.getActiveSpreadsheet().getRangeByName(budgetValueRangeName);
  if (budgetRange == null) {
    throw ('can not find named range "MonthlyBudget"');
  }
  return parseInt(budgetRange.getValue());  
}

function getAvailableBudget() {
  // Calculate used budget:
  try {
    var monthTxes = loadTable(currentMonthTableName());
    Logger.log(monthTxes);
    var used = 0;
    for (var i = 1; i <= monthTxes.range.getNumRows(); i++) {
      var rowAmount = getValue(monthTxes, 'Amount', i);    
      Logger.log(rowAmount);
      used += rowAmount;
    }
    return getTotalBudget() - Math.abs(used);
  } catch(err) {
    Logger.log(err);
    return getTotalBudget();
  }
}

function testGetAvailableBudget() {
  Logger.log(getAvailableBudget());
}