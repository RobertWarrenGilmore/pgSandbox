var React = require('react');
var TitleMixin = require('./titleMixin');
var BusyIndicator = require('./busyIndicator.jsx');
var auth = require('../flux/auth');
var ajax = require('../utilities/ajax');

var User = React.createClass({

  mixins: [
    TitleMixin('user')
  ],

  getInitialState: function() {
    return {
      authUser: null,
      user: null,
      error: null,
      runningRequest: null,
      exists: null
    };
  },

  _loadAuthUser: function () {
    var credentials = auth.getCredentials();
    if (credentials) {
      var r = ajax({
        method: 'GET',
        uri: '/api/users/' + credentials.id,
        json: true,
        auth: credentials
      });
      this.setState({
        runningRequest: r // Hold on to the Ajax promise in case we need to cancel it later.
      });
      var self = this;
      return r.then(function (response) {
        if (response.statusCode === 200) {
          self.setState({
            authUser: response.body
          });
        } else {
          self.setState({
            error: response.body
          });
        }
        return null;
      }).catch(function (error) {
        self.setState({
          error: error.message
        });
      });
    } else {
      return Promise.resolve();
    }
  },

  _loadUser: function (userId) {
    this._cancelRequest();
    var r = ajax({
      method: 'GET',
      uri: '/api/users/' + userId,
      json: true,
      auth: auth.getCredentials()
    });
    this.setState({
      runningRequest: r, // Hold on to the Ajax promise in case we need to cancel it later.
      error: null,
      exists: null
    });
    this.setTitle('user');
    var self = this;
    return r.then(function (response) {
      if (response.statusCode === 200) {
        self.setState({
          user: response.body,
          exists: true
        });
        if (response.body.title) {
          self.setTitle(response.body.givenName + ' ' + response.body.familyName);
        }
      } else {
        if (response.statusCode === 404) {
          self.setState({
            exists: false
          });
        }
        self.setState({
          error: response.body
        });
      }
      return null;
    }).catch(function (error) {
      self.setState({
        error: error.message
      });
    }).finally(function () {
      self.setState({
        runningRequest: null
      });
    });
  },

  _cancelRequest: function () {
    // Cancel any Ajax that's currently running.
    if (this.state.runningRequest) {
      this.state.runningRequest.cancel();
    }
  },

  componentWillMount: function() {
    var self = this;
    this._loadAuthUser().then(function () {
      self._loadUser(self.props.params.userId);
    });
  },

  componentWillReceiveProps: function(nextProps) {
    var userIdChanged = nextProps.params.userId !== this.props.params.userId;
    if (userIdChanged) {
      // TODO Confirm leave without saving changes if in edit mode and unsaved.
      this.props.history.replaceState(null, nextProps.location.pathname);
      this._loadUser(nextProps.params.userId);
    }
  },

  componentWillUnmount: function() {
    this._cancelRequest();
  },

  render: function() {
    var result;
    var userIsHidden = this.state.user && (this.state.authUser === null || this.state.user.id !== this.state.authUser.id) && !this.state.user.active;

    // busy layout
    if (this.state.runningRequest) {
      result = (
        <div id='user' className='message'>
          <BusyIndicator/>
          loading
        </div>
      );

    // error layout
    } else if (this.state.error || userIsHidden || !this.state.exists) {
      result = (
        <div id='user' className='message'>
          <p className='error'>
            {this.state.error || 'This user is inactive.'}
          </p>
        </div>
      );

    // user layout
    } else {
      var user = this.state.user;
      var editButton = null;
      var userIsSelf = this.state.authUser && user.id === this.state.authUser.id;
      if (userIsSelf) {
        editButton = (
          <button
            className='edit'
            disabled={!!this.state.runningRequest}
            onClick={this._enterEditMode}>
            <span className='icon-pencil'/>
            &nbsp;
            edit
          </button>
        );
      }
      result = (
        <div id='user'>
          <div className='actions'>
            {editButton}
          </div>
          // TODO format user info
          {user.id}
          {user.emailAddress}
          {user.givenName}
          {user.familyName}
        </div>
      );
    }

    return result;
  }
});

module.exports = User;
