// for options see https://pushover.net/api
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