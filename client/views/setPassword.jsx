var React = require('react');
var ReactRouter = require('react-router');
var History = ReactRouter.History;
var Fluxxor = require('fluxxor');
var FluxMixin = Fluxxor.FluxMixin(React);
var StoreWatchMixin = Fluxxor.StoreWatchMixin;
var TitleMixin = require('./titleMixin');

var SetPassword = React.createClass({
  mixins: [
    FluxMixin, StoreWatchMixin('passwordSet'), History, TitleMixin('set password')
  ],
  componentWillUpdate: function(nextProps, nextState) {
    if (nextState.result.success) {
      this.history.pushState(null, '/login');
    }
  },
  getStateFromFlux: function() {
    var store = this.getFlux()
      .store('passwordSet');
    return {
      blocked: store.isInProgress(),
      result: store.getResult()
    };
  },
  _onSubmit: function(event) {
    event.preventDefault();
    var userId = this.props.params.userId;
    var passwordResetKey = this.props.location.query.key;
    var password = this.refs.password.value;
    var verifyPassword = this.refs.verifyPassword.value;
    this.getFlux()
      .actions
      .passwordSet
      .set({
        userId: userId,
        password: password,
        verifyPassword: verifyPassword,
        passwordResetKey: passwordResetKey
      });
  },
  render: function() {
    var passwordResetKey = this.props.location.query.key;
    var userId = this.props.params.userId;
    if (!userId || !passwordResetKey) {
      return (
        <div>
          The URL was malformed.
        </div>
      );
    } else {
      return (
        <div id='setPassword'>
          <form onSubmit={this._onSubmit}>
            <p>
              Set a new password.
            </p>
            <input type='password' ref='password' name='password' placeholder='new password' disabled={this.state.blocked} required/>
            <input type='password' ref='verifyPassword' name='verifyPassword' placeholder='verify new password' disabled={this.state.blocked} required/>
            <button disabled={this.state.blocked}>
              set password
            </button>
            {this.state.result.error
              ? <p className='error'>
                  {this.state.result.error}
                </p>
              : null}
          </form>
        </div>
      );
    }
  }
});

module.exports = SetPassword;
