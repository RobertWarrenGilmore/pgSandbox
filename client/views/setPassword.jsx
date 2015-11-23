var React = require('react');
var ReactRouter = require('react-router');
var History = ReactRouter.History;
var TitleMixin = require('./titleMixin');
var ajax = require('../utilities/ajax');


var SetPassword = React.createClass({
  mixins: [
    History, TitleMixin('set password')
  ],
  getInitialState: function() {
    return {busy: false, success: false, error: null};
  },
  componentWillUpdate: function(nextProps, nextState) {
    if (nextState.result.success) {
      this.history.pushState(null, '/login');
    }
  },
  render: function() {
    var passwordResetKey = this.props.location.query.key;
    var userId = this.props.params.userId;
    if (!userId || !passwordResetKey) {
      return (
        <div id='message'>
          <p>
            The URL was malformed.
          </p>
        </div>
      );
    } else {
      return (
        <div id='setPassword'>
          <h1>
            set password
          </h1>
          <p>
            Set a new password.
          </p>
          <form onSubmit={this._onSubmit}>
            <input type='password' ref='password' name='password' placeholder='new password' disabled={this.state.busy} required/>
            <input type='password' ref='verifyPassword' name='verifyPassword' placeholder='verify new password' disabled={this.state.busy} required/>
            {this.state.error
              ? <p className='error'>
                  {this.state.error}
                </p>
              : null}
            <div>
              <button disabled={this.state.busy} className='highlighted'>
                set password
              </button>
            </div>
          </form>
        </div>
      );
    }
  },
  _onSubmit: function(event) {
    event.preventDefault();
    var userId = this.props.params.userId;
    var passwordResetKey = this.props.location.query.key;
    var password = this.refs.password.value;
    var verifyPassword = this.refs.verifyPassword.value;
    this.setState({busy: true, success: false, error: null});
    var self = this;
    if (password !== verifyPassword) {
      self.dispatch('SET_PASSWORD_RESET_RESULT', {
        error: 'The passwords must match.'
      });
    } else {
      return ajax({
        method: 'PUT',
        uri: '/api/users/' + userId,
        json: true,
        body: {
          password: password,
          passwordResetKey: passwordResetKey
        }
      }).then(function(response) {
        if (response.statusCode === 200) {
          self.setState({busy: false, success: true, error: null});
        } else {
          self.setState({busy: false, success: false, error: response.body});
        }
      }).catch(function(error) {
        self.setState({busy: false, success: false, error: error.message});
      });
    }
  }
});

module.exports = SetPassword;
