var React = require('react');
var ReactRouter = require('react-router');
var Link = ReactRouter.Link;
var TitleMixin = require('./titleMixin');
var auth = require('../flux/auth');

var LogIn = React.createClass({
  mixins: [
    TitleMixin('log in')
  ],
  getInitialState: function() {
    return {credentials: auth.getCredentials(), busy: auth.isBusy(), error: null};
  },
  _authListener: function() {
    this.setState({credentials: auth.getCredentials(), busy: auth.isBusy(), error: auth.getError()});
  },
  componentWillMount: function() {
    auth.clearError();
  },
  componentDidMount: function() {
    auth.listen(this._authListener);
  },
  componentWillUnmount: function() {
    auth.unlisten(this._authListener);
  },
  componentWillUpdate: function(nextProps, nextState) {
    if (nextState.credentials) {
      var location = this.props.location;
      if (location.state && location.state.nextLocation) {
        console.log('logging in');
        this.props.history.replaceState(null, location.state.nextLocation.pathname, location.state.nextLocation.query);
        console.log('logged in');
      } else {
        this.props.history.replaceState(null, '/');
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
          <input type='email' ref='emailAddress' name='emailAddress' placeholder='email address' disabled={this.state.busy} required/>
          <input type='password' ref='password' name='password' placeholder='password' disabled={this.state.busy} required/>
          {this.state.error
            ? <p className='error'>
                {this.state.error}
              </p>
            : null}
          <div>
            <button disabled={this.state.busy} className='highlighted'>log in</button>
            <Link to='/forgotPassword'>
              Are you locked out?
            </Link>
          </div>
        </form>
      </div>
    );
  },
  _onSubmit: function(event) {
    event.preventDefault();
    var emailAddress = this.refs.emailAddress.value;
    var password = this.refs.password.value;
    auth.logIn({emailAddress: emailAddress, password: password});
  }
});

module.exports = LogIn;
