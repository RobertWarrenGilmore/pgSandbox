var React = require('react');
var ReactRouter = require('react-router');
var Link = ReactRouter.Link;
var History = ReactRouter.History;
var Fluxxor = require('fluxxor');
var FluxMixin = Fluxxor.FluxMixin(React);
var StoreWatchMixin = Fluxxor.StoreWatchMixin;
var TitleMixin = require('./titleMixin');

var LogIn = React.createClass({
  mixins: [
    FluxMixin, StoreWatchMixin('auth'), History, TitleMixin('log in')
  ],
  componentWillUpdate: function(nextProps, nextState) {
    if (nextState.auth) {
      var location = this.props.location;
      if (location.state && location.state.nextPathname) {
        this.history
          .replaceState(null, location.state.nextPathname);
      } else {
        this.history
          .replaceState(null, '/');
      }
    }
  },
  render: function() {
    return (
      <div id='logIn'>
        <h1>
          log in
        </h1>
        <form onSubmit={this._onSubmit}>
          <input type='email' ref='emailAddress' name='emailAddress' placeholder='email address' disabled={this.state.blocked} required/>
          <input type='password' ref='password' name='password' placeholder='password' disabled={this.state.blocked} required/>
          {this.state.error
            ? <p className='error'>
                {this.state.error}
              </p>
            : null}
          <div>
            <button disabled={this.state.blocked} className='highlighted'>log in</button>
            <Link to='/forgotPassword'>
              Are you locked out?
            </Link>
          </div>
        </form>
      </div>
    );
  },
  getStateFromFlux: function() {
    var store = this.getFlux()
      .store('auth');
    return {blocked: store.isInProgress(), auth: store.getAuth(), error: store.getError()};
  },
  _onSubmit: function(event) {
    event.preventDefault();
    var emailAddress = this.refs.emailAddress.value;
    var password = this.refs.password.value;
    this.getFlux()
      .actions
      .auth
      .logIn(emailAddress, password);
  }
});

module.exports = LogIn;
