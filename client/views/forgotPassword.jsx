var React = require('react');
var Fluxxor = require('fluxxor');
var FluxMixin = Fluxxor.FluxMixin(React);
var StoreWatchMixin = Fluxxor.StoreWatchMixin;

var ForgotPassword = React.createClass({
  mixins: [
    FluxMixin, StoreWatchMixin('forgotPassword')
  ],
  render: function() {
    if (this.state.result.success) {
      return (
        <div>
          Success! You'll recieve a password reset email soon.
        </div>
      );
    } else {
      return (
        <div id='forgotPassword'>
          <form onSubmit={this._onSubmit}>
            <p>
              If you're locked out of your account (not that we'd ever suggest that you forgot your password), enter your email address to reset your password.
            </p>
            <input type='email' ref='emailAddress' name='emailAddress' placeholder='email address' disabled={this.state.blocked} required/>
            <button disabled={this.state.blocked}>send the email</button>
            {this.state.result.error
              ? <p className='error'>
                  {this.state.result.error}
                </p>
              : null}
          </form>
        </div>
      );
    }
  },
  getStateFromFlux: function() {
    var store = this.getFlux().store('forgotPassword');
    return {
      blocked: store.isInProgress(),
      result: store.getResult()
    };
  },
  _onSubmit: function(event) {
    event.preventDefault();
    var emailAddress = this.refs.emailAddress.value;
    this.getFlux().actions.forgotPassword.sendEmail({
      emailAddress: emailAddress
    });
  }
});

module.exports = ForgotPassword;
