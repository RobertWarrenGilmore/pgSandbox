'use strict'
const _ = require('lodash')
const React = require('react')
const { resetPassword: resetPasswordAction } = require('../flux/users/actions')
const { connect } = require('react-redux')
const Helmet = require('react-helmet')
const ErrorMessage = require('./errorMessage.jsx')
const validate = require('../../utilities/validate')
const { funcs: vf, ValidationError } = validate

class ForgotPassword extends React.Component{
  static propTypes = {
    resetPassword: React.PropTypes.func
  };
  static defaultProps = {
    resetPassword: () => {}
  };
  state = {
    emailAddress: '',
    busy: false,
    success: false,
    fieldErrors: null,
    error: null
  };
  constructor(props) {
    super(props)
    this._validate = this._validate.bind(this)
    this._onChangeEmailAddress = this._onChangeEmailAddress.bind(this)
    this._onSubmit = this._onSubmit.bind(this)
  }
  render() {
    const {
      state: {
        emailAddress,
        busy,
        success,
        fieldErrors,
        error
      },
      _onChangeEmailAddress,
      _onSubmit
    } = this
    if (success) {
      return (
        <div className='message'>
          <p>
            Success! You'll recieve a password reset email soon.
          </p>
        </div>
      )
    } else {
      const fieldErrorMessage = fieldName =>
        <ErrorMessage error={_.at(fieldErrors, fieldName)[0] || []}/>
      return (
        <div id='forgotPassword'>
          <Helmet title='forgot password'/>
          <h1>
            forgotten password recovery
          </h1>
          <p>
            If you're locked out of your account, enter your email address to reset your password.
          </p>
          <form onSubmit={_onSubmit}>
            <input
              type='email'
              value={emailAddress}
              onChange={_onChangeEmailAddress}
              placeholder='email address'
              disabled={busy}
              required
              />
            {fieldErrorMessage('emailAddress')}
            {error ?
              <ErrorMessage error={error}/>
            : null}
            <div>
              <button
                disabled={busy || !!fieldErrors}
                className='highlighted'
                >
                send the email
              </button>
            </div>
          </form>
        </div>
      )
    }
  }
  _validate(values) {
    return validate(values, {
      emailAddress: [
        vf.emailAddress('The email address must be, well, an email address.')
      ]
    })
    .catch(err => {
      if (err instanceof ValidationError) {
        this.setState({
          fieldErrors: err.messages
        })
      } else {
        throw err
      }
    })
  }
  _onChangeEmailAddress({target: {value}}) {
    this.setState({
      emailAddress: value,
      fieldErrors: null
    })
    this._validate({
      emailAddress: value
    })
  }
  _onSubmit(event) {
    event.preventDefault()
    const {
      props: {
        resetPassword
      },
      state: {
        emailAddress
      }
    } = this
    this.setState({
      busy: true,
      error: null
    })
    return resetPassword(emailAddress)
    .then(() => this.setState({
      success: true
    }))
    .catch(err => {
      if (err instanceof ValidationError) {
        this.setState({
          fieldErrors: err.messages
        })
      } else {
        this.setState({
          error: err.message || err
        })
      }
    })
    .then(() => this.setState({
      busy: false
    }))
  }
}

const wrapped = connect(
  function mapStateToProps(state) {
    return {}
  },
  function mapDispatchToProps(dispatch) {
    return {
      resetPassword: emailAddress => dispatch(resetPasswordAction(emailAddress))
    }
  }
)(ForgotPassword)

module.exports = wrapped
