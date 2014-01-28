App = Ember.Application.create();

App.IndexController = Ember.Controller.extend({

  loginFailed: false,
  isProcessing: false,
  isSlowConnection: false,
  timeout: null,

  login: function() {
    this.setProperties({
      loginFailed: false,
      isProcessing: true
    });

    this.set("timeout", setTimeout(this.slowConnection.bind(this), 1));

    var request = $.post(
        "/token",
        //this.getProperties("username", "password")
        {
          grant_type: "password",
          client_id: "mobileV1",
          client_secret: "abc123456",
          username: this.get("username"),
          password: this.get("password")
        }
    );
    request.then(this.success.bind(this), this.failure.bind(this));
  },

  success: function() {
    this.reset();
    // sign in logic
  },

  failure: function() {
    this.reset();
    this.set("loginFailed", true);
  },

  slowConnection: function() {
    this.set("isSlowConnection", true);
  },

  reset: function() {
    clearTimeout(this.get("timeout"));
    this.setProperties({
      isProcessing: false,
      isSlowConnection: false
    });
  }

});
