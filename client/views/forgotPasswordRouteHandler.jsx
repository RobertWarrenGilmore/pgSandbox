'use strict'
const React = require('react')
const { saveUser } = require('../flux/users/actions')
const { connect } = require('react-redux')
const Helmet = require('react-helmet')

class ForgotPassword extends React.Component{
  constructor(props) {
    super(props)
    this.state = {
      busy: false,
      success: false,
      error: null
    }
    this._onSubmit = this._onSubmit.bind(this)
  }
  render() {
    if (this.state.success) {
      return (
        <div className='message'>
          <p>
            Success! You'll recieve a password reset email soon.
          </p>
        </div>
      )
    } else {
      return (
        <div id='forgotPassword'>
          <Helmet title='forgot password'/>
          <h1>
            forgotten password recovery
          </h1>
          <p>
            If you're locked out of your account, enter your email address to reset your password.
          </p>
          <form onSubmit={this._onSubmit}>
            <input type='email' ref='emailAddress' name='emailAddress' placeholder='email address' disabled={this.state.busy} required/>
            {this.state.error
              ? <p className='error'>
                  {this.state.error}
                </p>
              : null}
            <div>
              <button disabled={this.state.busy} className='highlighted'>send the email</button>
            </div>
          </form>
        </div>
      )
    }
  }
  _onSubmit(event) {
    event.preventDefault()
    let emailAddress = this.refs.emailAddress.value
    this.setState({
      busy: true,
      error: null
    })
    return this.props.saveUser({
      emailAddress,
      passwordResetKey: null
    }).then(() => this.setState({
      success: true
    })).catch(err => this.setState({
      error: err.message || err
    })).finally(() => this.setState({
      busy: false
    }))
  }
}
ForgotPassword.propTypes = {
  saveUser: React.PropTypes.func
}
ForgotPassword.defaultProps = {
  saveUser: () => {}
}

const wrapped = connect(
  function mapStateToProps(state) {
    return {}
  },
  function mapDispatchToProps(dispatch) {
    return {
      saveUser: ({ emailAddress, passwordResetKey }) =>
        dispatch(saveUser({ emailAddress, passwordResetKey }))
    }
  }
)(ForgotPassword)

module.exports = wrapped
