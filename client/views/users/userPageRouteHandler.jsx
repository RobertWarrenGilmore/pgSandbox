'use strict'
const React = require('react')
const BusyIndicator = require('../busyIndicator.jsx')
const ErrorMessage = require('../errorMessage.jsx')
const UserEditor = require('./editor.jsx')
const UserProfile = require('./profile.jsx')
const { connect } = require('react-redux')
const { save: saveUser, load: loadUser } = require('../../flux/users/actions')
const Helmet = require('react-helmet')

class UserPage extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      editingUser: null,
      fieldErrors: null,
      error: null,
      busy: false,
      exists: null
    }
    this._loadUser = this._loadUser.bind(this)
    this._onEditorSave = this._onEditorSave.bind(this)
    this._onEditorRevert = this._onEditorRevert.bind(this)
    this._onEditorChange = this._onEditorChange.bind(this)
    this._enterEditMode = this._enterEditMode.bind(this)
    this._exitEditMode = this._exitEditMode.bind(this)
  }

  _loadUser(userId) {
    this.setState({
      busy: true,
      error: null,
      fieldErrors: null
    })
    return this.props.loadUser(userId)
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
    const user = {
      emailAddress: this.state.editingUser.emailAddress,
      givenName: this.state.editingUser.givenName,
      familyName: this.state.editingUser.familyName,
      password: this.state.editingUser.password,
      authorisedToBlog: this.state.editingUser.authorisedToBlog,
      admin: this.state.editingUser.admin
    }
    return this.props.saveUser(user, this.props.params.userId)
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
      }).finally(() => this.setState({
        busy: false
      }))
  }

  _onEditorRevert() {
    this.setState({
      editingUser: this.props.users[this.props.params.userId],
      error: null,
      fieldErrors: null
    })
  }

  _enterEditMode() {
    this.setState({
      error: null,
      fieldErrors: null,
      editingUser: this.props.users[this.props.params.userId]
    })
  }

  _exitEditMode() {
    this.setState({
      editingUser: null
    })
  }

  _onEditorChange(user) {
    this.setState({
      editingUser: user
    })
  }

  componentWillMount() {
    if (!this.props.users[this.props.params.userId]) {
      return this._loadUser(this.props.params.userId)
    }
  }

  componentWillReceiveProps(nextProps) {
    const userIdChanged = nextProps.params.userId !== this.props.params.userId
    if (userIdChanged) {
      // TODO Confirm leave without saving changes if in edit mode and unsaved.
      this._exitEditMode()
      if (!nextProps.users[nextProps.params.userId]) {
        return this._loadUser(nextProps.params.userId)
      }
    }
  }

  render() {
    let result
    const user = this.props.users[this.props.params.userId]
    const { authUser } = this.props
    const { editingUser, busy, error } = this.state
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
            existingUser={user}
            editingUser={editingUser}
            disabled={busy}
            adminMode={authUser.admin}
            onChange={_onEditorChange}
            onSave={_onEditorSave}
            onRevert={_onEditorRevert}
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
UserPage.propTypes = {
  authUser: React.PropTypes.object,
  users: React.PropTypes.object,
  saveUser: React.PropTypes.func,
  loadUser: React.PropTypes.func
}
UserPage.defaultProps = {
  authUser: null,
  users: null,
  saveUser: null,
  loadUser: null
}

const wrapped = connect(
  function mapStateToProps(state) {
    state = state.asMutable({deep: true})
    let authUser
    if (state.auth.id && state.users) {
      authUser = state.users[state.auth.id]
    }
    return {
      authUser,
      users: state.users
    }
  },
  function mapDispatchToProps(dispatch) {
    return {
      saveUser: (user, id) => dispatch(saveUser(user, id)),
      loadUser: id => dispatch(loadUser(id))
    }
  }
)(UserPage)

module.exports = wrapped
