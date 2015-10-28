var React = require('react');
var ReactRouter = require('react-router');
var History = ReactRouter.History;
var Fluxxor = require('fluxxor');
var FluxMixin = Fluxxor.FluxMixin(React);
var StoreWatchMixin = Fluxxor.StoreWatchMixin;

var Login = React.createClass({
  mixins: [
    FluxMixin, StoreWatchMixin('auth'), History
  ],
  componentWillMount: function() {
    document.title = 'pgSandbox - log in';
  },
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
      <div id='login'>
        <form onSubmit={this._onSubmit}>
          <input type='email' ref='emailAddress' name='emailAddress' placeholder='email address'/>
          <input type='password' ref='password' name='password' placeholder='password'/>
          <button>log in</button>
          {this.state.error
            ? <p className='error'>
                {this.state.error}
              </p>
            : null}
        </form>
      </div>
    );
  },
  getStateFromFlux: function() {
    var flux = this.getFlux();
    return {
      authInProgress: flux.store('auth')
        .isAuthInProgress(),
      auth: flux.store('auth')
        .getAuth(),
      error: flux.store('auth')
        .getError()
    };
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

module.exports = Login;
