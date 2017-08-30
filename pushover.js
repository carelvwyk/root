// Add support for pushover push notifications

var pushover = {
    token: process.env.PUSHOVER_TOKEN,
    user: process.env.PUSHOVER_USER,
    push: function(msg) {
        let url = "https://api.pushover.net/1/messages.json";
        let data = {
            token: this.token,
            user: this.user,
            sound: 'cashregister',
            message: msg
        };
        root.post(url, data);
    }
}