var React = require('react');
var TitleMixin = require('./titleMixin');
var BusyIndicator = require('./busyIndicator.jsx');
var auth = require('../flux/auth');
var ajax = require('../utilities/ajax');
var Checkit = require('checkit');

var User = React.createClass({

  mixins: [
    TitleMixin('user')
  ],

  getInitialState: function() {
    return {
      authUser: null,
      user: null,
      editingUser: null,
      fieldErrors: null,
      serverError: null,
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
            serverError: response.body
          });
        }
        return null;
      }).catch(function (error) {
        self.setState({
          serverError: error.message
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
      serverError: null,
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
          serverError: response.body
        });
      }
      return null;
    }).catch(function (error) {
      self.setState({
        serverError: error.message
      });
    }).finally(function () {
      self.setState({
        runningRequest: null
      });
    });
  },

  _saveUser: function() {
    this._cancelRequest();
    var user = {
      emailAddress: this.state.editingUser.emailAddress,
      givenName: this.state.editingUser.givenName,
      familyName: this.state.editingUser.familyName,
      password: this.state.editingUser.password,
      authorisedToBlog: this.state.editingUser.authorisedToBlog,
      admin: this.state.editingUser.admin
    };
    var r = ajax ({
      method: 'PUT',
      uri: '/api/users/' + this.props.params.userId,
      body: user,
      json: true,
      auth: auth.getCredentials()
    });
    this.setState({
      runningRequest: r,
      serverError: null
    });
    var self = this;
    return r.then(function (response) {
      if (response.statusCode === 200) {
        self.setState({
          runningRequest: null,
          editingUser: response.body,
          user: response.body,
          exists: true
        });
        self.setTitle(response.body.givenName + ' ' + response.body.familyName);
        var userIsSelf = self.state.authUser && response.body.id === self.state.authUser.id;
        if (userIsSelf) {
          var oldPassword = auth.getCredentials().password;
          var newPassword = user.password || oldPassword;
          auth.logIn({
            emailAddress: user.emailAddress,
            password: newPassword
          });
          self.setState({
            authUser: response.body
          });
        }
      } else {
        self.setState({
          runningRequest: null,
          serverError: response.body
        });
      }
      return null;
    }).catch(function(error) {
      self.setState({
        runningRequest: null,
        serverError: error.message
      });
    });
  },

  _revertUser: function () {
    this.setState({
      editingUser: this.state.user,
      serverError: null,
      fieldErrors: null
    });
  },

  _enterEditMode: function () {
    this.setState({
      error: null,
      editingUser: this.state.user
    });
  },

  _exitEditMode: function () {
    this.setState({
      editingUser: null
    });
  },

  _validateFields: function () {
    var self = this;
    new Checkit({
      emailAddress: [
        {
          rule: 'email',
          message: 'The email address must be formatted as such.'
        },
        {
          rule: 'required',
          message: 'The email address is required.'
        }
      ],
      password: [
        {
          rule: 'minLength:8',
          message: 'The password must be at least eight characters long.'
        },
        {
          rule: 'maxLength:30',
          message: 'The password must be at most thirty characters long.'
        }
      ],
      repeatPassword: [
        {
          rule: 'matchesField:password',
          message: 'The passwords must match.'
        }
      ]
    })
    .maybe({
      password: [
        {
          rule: 'required',
          message: 'You must type the password in both boxes.'
        }
      ]
    }, function(input) {
      return !!input.repeatPassword;
    })
    .maybe({
      repeatPassword: [
        {
          rule: 'required',
          message: 'Repeat the same password to verify that you typed it correctly.'
        }
      ]
    }, function(input) {
      return !!input.password;
    })
    .validate(this.state.editingUser)
    .then(function (validated) {
      self.setState({
        fieldErrors: null
      });
    }).catch(function (err) {
      // Put the error in state.
      self.setState({
        fieldErrors: err.errors
      });
    });
  },

  _updateEditingUser: function () {
    var self = this;
    this.setState({
      editingUser: {
        emailAddress: this.refs.emailAddress.value,
        givenName: this.refs.givenName.value,
        familyName: this.refs.familyName.value,
        password: this.refs.password.value,
        repeatPassword: this.refs.repeatPassword.value,
        authorisedToBlog: this.refs.authorisedToBlog.checked,
        admin: this.refs.admin.checked
      }
    }, function () {
      self._validateFields();
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
      return self._loadUser(self.props.params.userId);
    });
  },

  componentWillReceiveProps: function(nextProps) {
    var userIdChanged = nextProps.params.userId !== this.props.params.userId;
    if (userIdChanged) {
      // TODO Confirm leave without saving changes if in edit mode and unsaved.
      this._exitEditMode();
      this._loadUser(nextProps.params.userId);
    }
  },

  componentWillUnmount: function() {
    this._cancelRequest();
  },

  render: function() {
    var result;
    var userIsHidden = this.state.user && (this.state.authUser === null || this.state.user.id !== this.state.authUser.id) && !this.state.user.active;

    // editor layout
    if (this.state.editingUser) {
      var user = this.state.editingUser;
      var self = this;
      function fieldErrorBox(fieldName) {
        if (self.state.fieldErrors
          && self.state.fieldErrors[fieldName]) {
          return (
            <p className='error'>
              {self.state.fieldErrors[fieldName].message}
            </p>
          );
        } else {
          return null;
        }
      }
      result = (
        <div id='user' className='editor'>
          <div className='actions'>
            <button
              className='edit'
              disabled={!!this.state.runningRequest}
              onClick={this._exitEditMode}>
              <span className='icon-pencil'/>
              &nbsp;
              stop editing
            </button>
          </div>
          <header>
            <label>
              name
              <div className='nameLine'>
                <input
                  type='text'
                  ref='givenName'
                  value={user.givenName}
                  placeholder='first name'
                  disabled={!!this.state.runningRequest}
                  onChange={this._updateEditingUser}/>
                <input
                  type='text'
                  ref='familyName'
                  value={user.familyName}
                  placeholder='last name'
                  disabled={!!this.state.runningRequest}
                  onChange={this._updateEditingUser}/>
                {fieldErrorBox('givenName')}
                {fieldErrorBox('familyName')}
              </div>
            </label>
          </header>
          <label>
            email address
            <input
              type='email'
              ref='emailAddress'
              value={user.emailAddress}
              placeholder='name@example.com'
              disabled={!!this.state.runningRequest}
              onChange={this._updateEditingUser}/>
            {fieldErrorBox('emailAddress')}
          </label>
          <div className='passwordPair'>
            <label>
              password
              <input
                type='password'
                ref='password'
                value={user.password}
                disabled={!!this.state.runningRequest}
                onChange={this._updateEditingUser}/>
              {fieldErrorBox('password')}
            </label>
            <label>
              repeat password
              <input
                type='password'
                ref='repeatPassword'
                value={user.repeatPassword}
                disabled={!!this.state.runningRequest}
                onChange={this._updateEditingUser}/>
              {fieldErrorBox('repeatPassword')}
            </label>
          </div>
          {!!this.state.authUser.admin ? (
              <div>
              <label>
                <input
                  type='checkbox'
                  ref='authorisedToBlog'
                  checked={user.authorisedToBlog}
                  disabled={!!this.state.runningRequest}
                  onChange={this._updateEditingUser}/>
                authorised to blog
                {fieldErrorBox('authorisedToBlog')}
              </label>
              <label>
                <input
                  type='checkbox'
                  ref='admin'
                  checked={user.admin}
                  disabled={!!this.state.runningRequest}
                  onChange={this._updateEditingUser}/>
                administrator
                {fieldErrorBox('admin')}
              </label>
            </div>
          ) : null}
          {this.state.serverError
            ? (
              <p className='error'>
                {this.state.serverError}
              </p>
            ) : null}
          {this.state.runningRequest
            ? (
              <div>
                <BusyIndicator/>
                saving
              </div>
            ) : null}
          <div className='actions'>
            <button
              id='save'
              disabled={!!this.state.runningRequest || !!this.state.fieldErrors}
              onClick={this._saveUser}
              className='highlighted'>
              <span className='icon-floppy-disk'/>
              &nbsp;
              save
            </button>
            <button
              id='revert'
              disabled={!!this.state.runningRequest}
              onClick={this._revertUser}>
              <span className='icon-undo2'/>
              &nbsp;
              revert
            </button>
          </div>
        </div>
      );

    // busy layout
    } else if (this.state.runningRequest) {
      result = (
        <div id='user' className='message'>
          <BusyIndicator/>
          loading
        </div>
      );

    // error layout
    } else if (this.state.serverError || userIsHidden || !this.state.exists) {
      result = (
        <div id='user' className='message'>
          <p className='error'>
            {this.state.serverError || 'This user is inactive.'}
          </p>
        </div>
      );

    // user layout
    } else {
      var user = this.state.user;
      var editButton = null;
      var canEdit = this.state.authUser && (user.id === this.state.authUser.id || !!this.state.authUser.admin);
      if (canEdit) {
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
          <header>
            <h1>
              {user.givenName + ' ' + user.familyName}
            </h1>
          </header>
          {(user.emailAddress) ? (
            <p>
              {user.emailAddress}
            </p>
          ): null}
        </div>
      );
    }

    return result;
  }
});

module.exports = User;
