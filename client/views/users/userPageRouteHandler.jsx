'use strict'
const _ = require('lodash')
const React = require('react')
const update = require('react-addons-update')
const BusyIndicator = require('../busyIndicator.jsx')
const ErrorMessage = require('../errorMessage.jsx')
const UserEditor = require('./editor.jsx')
const UserProfile = require('./profile.jsx')
const { connect } = require('react-redux')
const { save: saveUser, load: loadUser } = require('../../flux/users/actions')
const Helmet = require('react-helmet')
const validate = require('../../../utilities/validate')
const vf = validate.funcs
const ValidationError = validate.ValidationError
const Jimp = require('jimp')
const Buffer = require('buffer/').Buffer


class UserPage extends React.Component {

  static propTypes = {
    authUser: React.PropTypes.object,
    user: React.PropTypes.object,
    saveUser: React.PropTypes.func,
    loadUser: React.PropTypes.func
  };

  static defaultProps = {
    authUser: null,
    user: null,
    saveUser: null,
    loadUser: null
  };

  state = {
    editingUser: null,
    fieldErrors: null,
    error: null,
    busy: false,
    exists: null
  };

  constructor(props) {
    super(props)
    this._loadUser = this._loadUser.bind(this)
    this._onEditorSave = this._onEditorSave.bind(this)
    this._onEditorRevert = this._onEditorRevert.bind(this)
    this._onEditorChange = this._onEditorChange.bind(this)
    this._enterEditMode = this._enterEditMode.bind(this)
    this._exitEditMode = this._exitEditMode.bind(this)
  }

  _loadUser(props = this.props) {
    this.setState({
      busy: true,
      error: null,
      fieldErrors: null
    })
    return props.loadUser()
      .catch(err => this.setState({
        error: err.message || err
      })).finally(() => this.setState({
        busy: false
      }))
  }

  _onEditorSave() {
    this.setState({
      busy: true,
      error: null,
      fieldErrors: null
    })
    const omittedProperties = [
      'id',
      'active'
    ]
    if (!this.props.authUser.admin) {
      omittedProperties.push('admin')
      omittedProperties.push('authorisedToBlog')
    }
    const user = _.omit(this.state.editingUser, omittedProperties)
    return this.props.saveUser(user)
      .catch(err => {
        if (err.messages) {
          this.setState({
            fieldErrors: err.messages
          })
        } else {
          this.setState({
            error: err.message || err
          })
        }
      })
      .then(() => {
        this.setState((currentState) => ({
          busy: false,
          editingUser: _.omit(currentState.editingUser, ['avatar'])
        }))
      })
  }

  _onEditorRevert() {
    this.setState({
      editingUser: this.props.user,
      error: null,
      fieldErrors: null
    })
  }

  _onEditorChange(user) {
    // Set busy if the image is loading, and clear the image so that it's
    // undefined in the editor.
    if (user.avatar === 'loading') {
      this.setState({
        busy: true
      })
      user.avatar = null
    }

    this.setState({
      editingUser: user
    })

    return validate(user, {
      // These two properties don't get changed or saved, but they're still expected.
      id: [],
      active: [],

      emailAddress: [
        vf.emailAddress('The email address must be, well, an email address.')
      ],
      givenName: [
        vf.notNull('The first name cannot be removed.'),
        vf.notEmpty('The first name cannot be removed.'),
        vf.string('The first name must be a string.'),
        vf.maxLength('The first name must not be longer than thirty characters.', 30)
      ],
      familyName: [
        vf.notNull('The last name cannot be removed.'),
        vf.notEmpty('The last name cannot be removed.'),
        vf.string('The last name must be a string.'),
        vf.maxLength('The last name must not be longer than thirty characters.', 30)
      ],
      password: [
        vf.minLength('The password must be at least eight characters long.', 8),
        vf.maxLength('The password must be at most thirty characters long.', 30)
      ],
      repeatPassword: [
        (val) => {
          if (val !== user.password) {
            throw new ValidationError('The passwords must match.')
          }
        }
      ],
      admin: [
        vf.boolean('The admin setting must be a boolean.')
      ],
      authorisedToBlog: [
        vf.boolean('The blog authorisation setting must be a boolean.')
      ],
      avatar: [
        val => {
          if (val) {
            // Here we'll do some validations and mutate the avatar.
            let originalBuffer
            try {
              originalBuffer = new Buffer(val.split(',')[1], 'base64')
            } catch (e) {
              throw new ValidationError('The icon must be a valid PNG, JPEG, or BMP image.')
            }
            return Jimp.read(originalBuffer)
              .then(image =>
                new Promise((resolve, reject) => {
                  image
                    .cover(200, 200)
                    .quality(60)
                    .getBuffer(Jimp.MIME_JPEG, (err, buffer) => {
                      if (err)
                        reject(err)
                      else
                        resolve(buffer)
                    })
                })
              )
              .then(buffer => {
                user.avatar = 'data:image/jpeg;base64,' + buffer.toString('base64')
                vf.file('The avatar must be a PNG, JPEG, or BMP file no larger than 200 kB.', {
                  types: [
                    'image/png',
                    'image/jpeg',
                    'image/bmp'
                  ],
                  maxSize: 204800
                })(user.avatar)
              })
              .catch(err => {
                if (err instanceof ValidationError)
                  throw err
                else
                  throw new ValidationError('The avatar must be a valid PNG, JPEG, or BMP image.')
              })
          }
        }

      ]
    })
    .catch(ValidationError, err => err.messages)
    .then(fieldErrors =>
      this.setState((previousState, currentProps) => ({
        // Set the avatar as it was mutated by the validator.
        editingUser: update(previousState.editingUser, {
          avatar: {$set: user.avatar}
        }),
        fieldErrors,
        busy: false
      }))
    )
  }

  _enterEditMode() {
    this.setState({
      error: null,
      fieldErrors: null,
      editingUser: this.props.user
    })
  }

  _exitEditMode() {
    this.setState({
      editingUser: null
    })
  }

  componentWillMount() {
    if (!this.props.user)
      return this._loadUser()
  }

  componentWillReceiveProps(nextProps) {
    const userIdChanged = nextProps.params.userId !== this.props.params.userId
    if (userIdChanged) {
      // TODO Confirm leave without saving changes if in edit mode and unsaved.
      this._exitEditMode()
      if (!nextProps.user) {
        return this._loadUser(nextProps)
      }
    }
  }

  render() {
    let result
    const {
      authUser,
      user
    } = this.props
    const {
      editingUser,
      fieldErrors,
      busy,
      error
    } = this.state
    const { _onEditorChange, _onEditorSave, _onEditorRevert } = this
    const userIsHidden = user && (authUser === null || user.id !== authUser.id) && !user.active

    // editor layout
    if (editingUser) {
      const windowTitle = ((editingUser.givenName || '') + ' ' + (editingUser.familyName || '')).trim() || 'unnamed user'
      result = (
        <div id='userPage'>
          <Helmet title={windowTitle}/>
          <div className='actions'>
            <button
              className='edit'
              disabled={busy}
              onClick={this._exitEditMode}>
              <span className='icon-pencil'/>
              &nbsp;
              stop editing
            </button>
          </div>
          <UserEditor
            user={editingUser}
            dirty={!_.isEqual(editingUser, user)}
            disabled={busy || !!fieldErrors}
            adminMode={authUser.admin}
            onChange={_onEditorChange}
            onSave={_onEditorSave}
            onRevert={_onEditorRevert}
            fieldErrors={fieldErrors}
            error={error}/>
        </div>
      )

    // busy layout
    } else if (busy) {
      result = (
        <div id='userPage' className='message'>
          <Helmet title='loading user'/>
          <BusyIndicator/>
          loading
        </div>
      )

    // error layout
    } else if (error || userIsHidden || !user) {
      result = (
        <div id='userPage' className='message'>
          <Helmet title='error'/>
          <ErrorMessage error={error || 'This user is inactive.'}/>
        </div>
      )

    // display layout
    } else {
      const windowTitle = ((user.givenName || '') + ' ' + (user.familyName || '')).trim() || 'unnamed user'
      const canEdit = authUser && (user.id === authUser.id || !!authUser.admin)
      result = (
        <div id='userPage'>
          <Helmet title={windowTitle}/>
          <div className='actions'>
            {canEdit ? (
              <button
                className='edit'
                disabled={busy}
                onClick={this._enterEditMode}>
                <span className='icon-pencil'/>
                &nbsp;
                edit
              </button>
            ) : null}
          </div>
          <UserProfile user={user}/>
        </div>
      )
    }

    return result
  }
}

const wrapped = connect(
  function mapStateToProps(state, ownProps) {
    state = state.asMutable({deep: true})
    const {
      params: {
        userId
      }
    } = ownProps
    let authUser
    if (state.auth.id && state.users.cache) {
      authUser = state.users.cache[state.auth.id]
    }
    return {
      authUser,
      user: state.users.cache[userId]
    }
  },
  function mapDispatchToProps(dispatch, ownProps) {
    const {
      params: {
        userId
      }
    } = ownProps
    return {
      saveUser: (user) => dispatch(saveUser(user, userId)),
      loadUser: () => dispatch(loadUser(userId))
    }
  }
)(UserPage)

module.exports = wrapped
