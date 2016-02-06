'use strict'
const React = require('react')
const { saveUser } = require('../flux/users/actions')
const { connect } = require('react-redux')
const Helmet = require('react-helmet')

class SetPassword extends React.Component{
  constructor(props) {
    super(props)
    this.state = {
      busy: false,
      success: false,
      error: null
    }
    this._onSubmit = this._onSubmit.bind(this)
  }
  componentWillUpdate(nextProps, nextState) {
    if (nextState.success) {
      this.props.history.pushState(null, '/login')
    }
  }
  render() {
    const passwordResetKey = this.props.location.query.key
    const userId = this.props.params.userId
    if (!userId || !passwordResetKey) {
      return (
        <div className='message'>
          <p>
            The URL was malformed.
          </p>
        </div>
      )
    } else {
      return (
        <div id='setPassword'>
          <Helmet title='set password'/>
          <h1>
            set password
          </h1>
          <p>
            Set a new password.
          </p>
          <form onSubmit={this._onSubmit}>
            <input
              type='password'
              ref='password'
              name='password'
              placeholder='new password'
              disabled={this.state.busy}
              required/>
            <input
              type='password'
              ref='verifyPassword'
              name='verifyPassword'
              placeholder='verify new password'
              disabled={this.state.busy}
              required/>
            {this.state.error
              ? <p className='error'>
                  {this.state.error}
                </p>
              : null}
            <div>
              <button
                disabled={this.state.busy}
                className='highlighted'>
                set password
              </button>
            </div>
          </form>
        </div>
      )
    }
  }
  _onSubmit(event) {
    event.preventDefault()
    const id = this.props.params.userId
    const passwordResetKey = this.props.location.query.key
    const password = this.refs.password.value
    const verifyPassword = this.refs.verifyPassword.value
    if (password !== verifyPassword) {
      this.setState({
        error: 'The passwords must match.'
      })
    } else {
      this.setState({
        busy: true,
        error: null
      })
      return this.props.saveUser({
        id,
        password,
        passwordResetKey
      }).then(() => this.setState({
        success: true
      })).catch(err => this.setState({
        error: err.message || err
      })).finally(() => this.setState({
        busy: false
      }))
    }
  }
}
SetPassword.propTypes = {
  saveUser: React.PropTypes.func
}
SetPassword.defaultProps = {
  saveUser: () => {}
}

const wrapped = connect(
  function mapStateToProps(state) {
    return {}
  },
  function mapDispatchToProps(dispatch) {
    return {
      saveUser: ({ id, password, passwordResetKey }) =>
        dispatch(saveUser({ id, password, passwordResetKey }))
    }
  }
)(SetPassword)

module.exports = wrapped
