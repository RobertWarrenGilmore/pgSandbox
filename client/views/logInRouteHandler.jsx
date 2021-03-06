'use strict'
const React = require('react')
const { Link, withRouter } = require('react-router')
const { connect } = require('react-redux')
const { logIn: logInAction } = require('../flux/auth/actions')
const Helmet = require('react-helmet')
const ErrorMessage = require('./errorMessage.jsx')

class LogIn extends React.Component {
  static propTypes = {
    busy: React.PropTypes.bool,
    logIn: React.PropTypes.func,
    router: React.PropTypes.shape({
      replace: React.PropTypes.func.isRequired
    }).isRequired
  };
  static defaultProps = {
    busy: false,
    logIn: null
  };
  state = {
    error: null,
    emailAddress: '',
    password: ''
  };
  constructor(props) {
    super(props)
    this._onChangeEmailAddress = this._onChangeEmailAddress.bind(this)
    this._onChangePassword = this._onChangePassword.bind(this)
    this._onSubmit = this._onSubmit.bind(this)
  }
  render() {
    const {
      props: {
        busy
      },
      state: {
        error,
        emailAddress,
        password
      }
    } = this
    const location = this.props.location
    const nextLocation = location.state ? location.state.nextLocation : null
    return (
      <div id='logIn'>
        <Helmet title='log in'/>
        <h1>
          log in
        </h1>
        {nextLocation ? (
          <p>
            You must log in before you can go to {nextLocation.pathname}.
          </p>
        ) : null}
        <form onSubmit={this._onSubmit}>
          <input
            type='email'
            value={emailAddress}
            onChange={this._onChangeEmailAddress}
            placeholder='email address'
            disabled={busy}
            required
            />
          <input
            type='password'
            value={password}
            onChange={this._onChangePassword}
            placeholder='password'
            disabled={busy}
            required
            />
          {error ?
            <ErrorMessage error={error}/>
          : null}
          <div className='actions'>
            <Link to='/forgotPassword'>
              Are you locked out?
            </Link>
            <button
              disabled={busy}
              className='highlighted'
              >
              log in
            </button>
          </div>
        </form>
      </div>
    )
  }
  _onChangeEmailAddress({target: {value}}) {
    this.setState({
      emailAddress: value
    })
  }
  _onChangePassword({target: {value}}) {
    this.setState({
      password: value
    })
  }
  _onSubmit(event) {
    event.preventDefault()
    const {
      props: {
        logIn,
        router: {
          replace: navigate
        }
      },
      state: {
        emailAddress,
        password
      }
    } = this
    return logIn({
      emailAddress,
      password
    })
    .then(() => {
      const location = this.props.location
      if (location.state && location.state.nextLocation) {
        navigate(location.state.nextLocation)
      } else {
        navigate('/')
      }
    })
    .catch(err => this.setState({
      error: err.message || err
    }))
  }
}

let wrapped = connect(
  function mapStateToProps(state) {
    return {
      busy: state.auth.busy
    }
  },
  function mapDispatchToProps(dispatch) {
    return {
      logIn: (credentials) => dispatch(logInAction(credentials))
    }
  }
)(LogIn)

wrapped = withRouter(wrapped)

module.exports = wrapped
