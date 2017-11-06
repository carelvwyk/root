function currentMonthTableName() {
    var now = new Date();
    return now.getMonthText() + ' ' + now.getFullYear();
  }  