'use strict'
const _ = require('lodash')
const React = require('react')
const { withRouter } = require('react-router')
const { setPassword: setPasswordAction } = require('../flux/users/actions')
const { logIn: logInAction } = require('../flux/auth/actions')
const { connect } = require('react-redux')
const Helmet = require('react-helmet')
const ErrorMessage = require('./errorMessage.jsx')
const validate = require('../../utilities/validate')
const { funcs: vf, ValidationError } = validate

class SetPassword extends React.Component{
  static propTypes = {
    setPassword: React.PropTypes.func,
    logIn: React.PropTypes.func,
    router: React.PropTypes.shape({
      replace: React.PropTypes.func.isRequired
    }).isRequired
  };
  static defaultProps = {
    setPassword: () => {},
    logIn: () => {}
  };
  state = {
    busy: false,
    success: false,
    fieldErrors: null,
    error: null,
    password: '',
    verifyPassword: ''
  };
  constructor(props) {
    super(props)
    this._validate = this._validate.bind(this)
    this._onChangePassword = this._onChangePassword.bind(this)
    this._onChangeVerifyPassword = this._onChangeVerifyPassword.bind(this)
    this._onSubmit = this._onSubmit.bind(this)
  }
  render() {
    const {
      props: {
        location: {
          query: {
            key: passwordResetKey,
            emailAddress
          }
        }
      },
      state: {
        busy,
        fieldErrors,
        error,
        password,
        verifyPassword
      },
      _onChangePassword,
      _onChangeVerifyPassword
    } = this
    if (!emailAddress || !passwordResetKey) {
      return (
        <div className='message'>
          <p>
            The URL was malformed.
          </p>
        </div>
      )
    } else {
      const fieldErrorMessage = fieldName =>
        <ErrorMessage error={_.at(fieldErrors, fieldName)[0] || []}/>
      return (
        <div id='setPassword'>
          <Helmet title='set password'/>
          <h1>
            set password
          </h1>
          <p>
            Set a new password for {emailAddress}.
          </p>
          <form onSubmit={this._onSubmit}>
            <input
              type='password'
              value={password}
              onChange={_onChangePassword}
              placeholder='new password'
              disabled={busy}
              required
              />
            {fieldErrorMessage('password')}
            <input
              type='password'
              value={verifyPassword}
              onChange={_onChangeVerifyPassword}
              placeholder='verify new password'
              disabled={busy}
              required
              />
            {fieldErrorMessage('verifyPassword')}
            {error ?
              <ErrorMessage error={error}/>
            : null}
            <div>
              <button
                disabled={busy || !!fieldErrors}
                className='highlighted'
                >
                set password
              </button>
            </div>
          </form>
        </div>
      )
    }
  }
  _validate(values) {
    return validate(values, {
      password: [
        vf.minLength('The password must not be shorter than eight characters.', 8),
        vf.maxLength('The password must not be longer than thirty characters.', 30)
      ],
      verifyPassword: [
        val => {
          if (val !== values.password)
            throw new ValidationError('The passwords must match.')
        }
      ]
    })
    .catch(ValidationError, err => {
      this.setState({
        fieldErrors: err.messages
      })
    })
  }
  _onChangePassword({target: {value}}) {
    this.setState({
      password: value,
      fieldErrors: null
    })
    this._validate({
      password: value,
      verifyPassword: this.state.verifyPassword
    })
  }
  _onChangeVerifyPassword({target: {value}}) {
    this.setState({
      verifyPassword: value,
      fieldErrors: null
    })
    this._validate({
      verifyPassword: value,
      password: this.state.password
    })
  }
  _onSubmit(event) {
    event.preventDefault()
    const {
      props: {
        location: {
          query: {
            key: passwordResetKey,
            emailAddress
          }
        },
        router: {
          replace: navigate
        },
        setPassword,
        logIn
      },
      state: {
        password
      }
    } = this
    this.setState({
      busy: true,
      error: null
    })
    return setPassword({
      emailAddress,
      password,
      passwordResetKey
    })
    .then(

      // Setting the password succeeded. Let's log in now.
      () =>
        logIn({
          emailAddress,
          password
        })
        .catch(() => {})
        .then(() =>
          navigate('/')
        )
      ,

      // Setting the password failed.
      err => {
        if (err instanceof ValidationError) {
          this.setState({
            fieldErrors: err.messages
          })
        } else {
          this.setState({
            error: err.message || err
          })
        }
        this.setState({
          busy: false
        })
      }
    )
  }
}

let wrapped = connect(
  function mapStateToProps(state) {
    return {}
  },
  function mapDispatchToProps(dispatch) {
    return {
      setPassword: ({
        emailAddress,
        password,
        passwordResetKey
      }) => dispatch(setPasswordAction({
        emailAddress,
        password,
        passwordResetKey
      })),
      logIn: ({
        emailAddress,
        password
      }) => dispatch(logInAction({
        emailAddress,
        password
      }))
    }
  }
)(SetPassword)

wrapped = withRouter(wrapped)

module.exports = wrapped
