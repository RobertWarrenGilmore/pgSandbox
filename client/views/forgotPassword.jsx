var React = require('react');
var Fluxxor = require('fluxxor');
var FluxMixin = Fluxxor.FluxMixin(React);
var StoreWatchMixin = Fluxxor.StoreWatchMixin;
var TitleMixin = require('./titleMixin');

var ForgotPassword = React.createClass({
  mixins: [
    FluxMixin, StoreWatchMixin('forgotPassword'), TitleMixin('forgot password')
  ],
  render: function() {
    if (this.state.result.success) {
      return (
        <div id='message'>
          <p>
            Success! You'll recieve a password reset email soon.
          </p>
        </div>
      );
    } else {
      return (
        <div id='forgotPassword'>
          <h1>
            forgotten password recovery
          </h1>
          <p>
            If you're locked out of your account, enter your email address to reset your password.
          </p>
          <form onSubmit={this._onSubmit}>
            <input type='email' ref='emailAddress' name='emailAddress' placeholder='email address' disabled={this.state.blocked} required/>
            {this.state.result.error
              ? <p className='error'>
                  {this.state.result.error}
                </p>
              : null}
            <div>
              <button disabled={this.state.blocked} className='highlighted'>send the email</button>
            </div>
          </form>
        </div>
      );
    }
  },
  getStateFromFlux: function() {
    var store = this.getFlux().store('forgotPassword');
    return {blocked: store.isInProgress(), result: store.getResult()};
  },
  _onSubmit: function(event) {
    event.preventDefault();
    var emailAddress = this.refs.emailAddress.value;
    this.getFlux().actions.forgotPassword.sendEmail({emailAddress: emailAddress});
  }
});

module.exports = ForgotPassword;
