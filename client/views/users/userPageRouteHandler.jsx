'use strict'
const React = require('react')
const BusyIndicator = require('./busyIndicator.jsx')
const auth = require('../flux/auth')
const ajax = require('../utilities/ajax')
const validate = require('../../utilities/validate')
const setWindowTitle = require('../utilities/setWindowTitle')
const vf = validate.funcs
const ValidationError = validate.ValidationError

class User extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      authUser: null,
      user: null,
      editingUser: null,
      fieldErrors: null,
      error: null,
      runningRequest: null,
      exists: null
    }
    this._loadAuthUser = this._loadAuthUser.bind(this)
    this._loadUser = this._loadUser.bind(this)
    this._saveUser = this._saveUser.bind(this)
    this._revertUser = this._revertUser.bind(this)
    this._enterEditMode = this._enterEditMode.bind(this)
    this._exitEditMode = this._exitEditMode.bind(this)
    this._validateFields = this._validateFields.bind(this)
    this._updateEditingUser = this._updateEditingUser.bind(this)
    this._cancelRequest = this._cancelRequest.bind(this)
  }

  _loadAuthUser() {
    const credentials = auth.getCredentials()
    if (credentials) {
      let r = ajax({
        method: 'GET',
        uri: '/api/users/' + credentials.id,
        json: true,
        auth: credentials
      })
      this.setState({
        runningRequest: r // Hold on to the Ajax promise in case we need to cancel it later.
      })
      return r.then((response) => {
        if (response.statusCode === 200) {
          this.setState({
            authUser: response.body
          })
        } else {
          this.setState({
            error: response.body
          })
        }
        return null
      }).catch((error) => {
        this.setState({
          error: error.message
        })
      })
    } else {
      return Promise.resolve()
    }
  }

  _loadUser(userId) {
    this._cancelRequest()
    let r = ajax({
      method: 'GET',
      uri: '/api/users/' + userId,
      json: true,
      auth: auth.getCredentials()
    })
    this.setState({
      runningRequest: r, // Hold on to the Ajax promise in case we need to cancel it later.
      error: null,
      exists: null
    })
    setWindowTitle('user')
    return r.then((response) => {
      if (response.statusCode === 200) {
        this.setState({
          user: response.body,
          exists: true
        })
        if (response.body.title) {
          setWindowTitle(response.body.givenName + ' ' + response.body.familyName)
        }
      } else {
        if (response.statusCode === 404) {
          this.setState({
            exists: false
          })
        }
        this.setState({
          error: response.body
        })
      }
      return null
    }).catch((error) => {
      this.setState({
        error: error.message
      })
    }).finally(() => {
      this.setState({
        runningRequest: null
      })
    })
  }

  _saveUser() {
    this._cancelRequest()
    const user = {
      emailAddress: this.state.editingUser.emailAddress,
      givenName: this.state.editingUser.givenName,
      familyName: this.state.editingUser.familyName,
      password: this.state.editingUser.password,
      authorisedToBlog: this.state.editingUser.authorisedToBlog,
      admin: this.state.editingUser.admin
    }
    let r = ajax ({
      method: 'PUT',
      uri: '/api/users/' + this.props.params.userId,
      body: user,
      json: true,
      auth: auth.getCredentials()
    })
    this.setState({
      runningRequest: r,
      fieldErrors: null,
      error: null
    })
    return r.then((response) => {
      if (response.statusCode === 200) {
        this.setState({
          editingUser: response.body,
          user: response.body,
          exists: true
        })
        setWindowTitle(response.body.givenName + ' ' + response.body.familyName)
        const userIsSelf = this.state.authUser && response.body.id === this.state.authUser.id
        if (userIsSelf) {
          const oldPassword = auth.getCredentials().password
          const newPassword = user.password || oldPassword
          auth.logIn({
            emailAddress: user.emailAddress,
            password: newPassword
          })
          this.setState({
            authUser: response.body
          })
        }
      } else {
        if (response.body.messages) {
          this.setState({
            fieldErrors: response.body.messages
          })
        } else {
          this.setState({
            error: response.body
          })
        }
      }
      return null
    }).catch((error) => {
      this.setState({
        error: error.message
      })
    }).finally(() => {
      this.setState({
        runningRequest: null
      })
    })
  }

  _revertUser() {
    this.setState({
      editingUser: this.state.user,
      error: null,
      fieldErrors: null
    })
  }

  _enterEditMode() {
    this.setState({
      error: null,
      editingUser: this.state.user
    })
  }

  _exitEditMode() {
    this.setState({
      editingUser: null
    })
  }

  _validateFields() {
    return validate(this.state.editingUser, {
      emailAddress: [
        vf.emailAddress('The email address must be, well, an email address.')
      ],
      givenName: [
        (val) => {
          if (this.state.user.givenName) {
            vf.notNull('The first name cannot be removed.')(val)
            vf.notEmpty('The first name cannot be removed.')(val)
          }
        },
        vf.string('The first name must be a string.'),
        vf.maxLength('The first name must not be longer than thirty characters.', 30)
      ],
      familyName: [
        (val) => {
          if (this.state.user.familyName) {
            vf.notNull('The last name cannot be removed.')(val)
            vf.notEmpty('The last name cannot be removed.')(val)
          }
        },
        vf.string('The last name must be a string.'),
        vf.maxLength('The last name must not be longer than thirty characters.', 30)
      ],
      password: [
        vf.minLength('The password must be at least eight characters long.', 8),
        vf.maxLength('The password must be at most thirty characters long.', 30)
      ],
      repeatPassword: [
        (val) => {
          if (val !== this.state.editingUser.password) {
            throw new ValidationError('The passwords must match.')
          }
        }
      ],
      admin: [
        vf.boolean('The admin setting must be a boolean.')
      ],
      authorisedToBlog: [
        vf.boolean('The blog authorisation setting must be a boolean.')
      ]
    }).then(() => {
      this.setState({
        fieldErrors: null
      })
    }).catch((err) => {
      // Put the error messages in state.
      this.setState({
        fieldErrors: err.messages
      })
    })
  }

  _updateEditingUser() {
    this.setState({
      editingUser: {
        emailAddress: this.refs.emailAddress.value,
        givenName: this.refs.givenName.value,
        familyName: this.refs.familyName.value,
        password: this.refs.password.value || undefined,
        repeatPassword: this.refs.repeatPassword.value || undefined,
        authorisedToBlog: this.refs.authorisedToBlog ? this.refs.authorisedToBlog.checked : undefined,
        admin: this.refs.admin ? this.refs.admin.checked : undefined
      }
    }, () => {
      this._validateFields()
    })
  }

  _cancelRequest() {
    // Cancel any Ajax that's currently running.
    if (this.state.runningRequest) {
      this.state.runningRequest.cancel()
    }
  }

  componentWillMount() {
    this._loadAuthUser().then(() => {
      return this._loadUser(this.props.params.userId)
    })
  }

  componentDidMount() {
    setWindowTitle('user')
  }

  componentWillReceiveProps(nextProps) {
    const userIdChanged = nextProps.params.userId !== this.props.params.userId
    if (userIdChanged) {
      // TODO Confirm leave without saving changes if in edit mode and unsaved.
      this._exitEditMode()
      this._loadUser(nextProps.params.userId)
    }
  }

  componentWillUnmount() {
    this._cancelRequest()
    setWindowTitle()
  }

  render() {
    let result
    const userIsHidden = this.state.user && (this.state.authUser === null || this.state.user.id !== this.state.authUser.id) && !this.state.user.active

    // editor layout
    if (this.state.editingUser) {
      const user = this.state.editingUser
      const fieldErrorBox = (fieldName) => {
        if (this.state.fieldErrors
          && this.state.fieldErrors[fieldName]) {
          return (
            <p className='error'>
              {this.state.fieldErrors[fieldName].join(' ')}
            </p>
          )
        } else {
          return null
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
              </div>
              {fieldErrorBox('givenName')}
              {fieldErrorBox('familyName')}
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
          {this.state.error
            ? (
              <p className='error'>
                {this.state.error}
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
      )

    // busy layout
    } else if (this.state.runningRequest) {
      result = (
        <div id='user' className='message'>
          <BusyIndicator/>
          loading
        </div>
      )

    // error layout
    } else if (this.state.error || userIsHidden || !this.state.exists) {
      result = (
        <div id='user' className='message'>
          <p className='error'>
            {this.state.error || 'This user is inactive.'}
          </p>
        </div>
      )

    // user layout
    } else {
      const user = this.state.user
      let editButton = null
      const canEdit = this.state.authUser && (user.id === this.state.authUser.id || !!this.state.authUser.admin)
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
        )
      }
      result = (
        <div id='user'>
          <div className='actions'>
            {editButton}
          </div>
          <header>
            <h1>
              {user.givenName} {user.familyName}
            </h1>
          </header>
          {(user.emailAddress) ? (
            <p>
              {user.emailAddress}
            </p>
          ): null}
        </div>
      )
    }

    return result
  }
}

module.exports = User
