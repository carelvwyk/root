// Library for connecting to my Google app script sheets app.

var sheets = {
  // Note: At time of writing, google sheets POST appears to be broken.
  // It is obviously better to use POST.
  get: function(data) {
    var url = process.env.APPSCRIPT_URL;
    var query = Object.keys(data).reduce(function(a,k){
      a.push(k+'='+encodeURIComponent(data[k]));return a
    },[]).join('&');
    url = url + '?' + query;
    var result = root.get(url);
    console.log(result);
  },
  insertRow: function(data) {
    data.cmd = 'newtx';
    data.token = process.env.APPSCRIPT_TOKEN;
    sheets.get(data);
  }
}