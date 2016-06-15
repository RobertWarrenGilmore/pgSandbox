'use strict'
const React = require('react')
const { Link } = require('react-router')
const { connect } = require('react-redux')
const { logIn } = require('../flux/auth/actions')
const Helmet = require('react-helmet')

class LogIn extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      error: null
    }
    this._onSubmit = this._onSubmit.bind(this)
  }
  componentWillReceiveProps(nextProps) {
    if (nextProps.credentials) {
      const location = this.props.location
      if (location.state && location.state.nextLocation) {
        this.props.history.replaceState(null, location.state.nextLocation.pathname, location.state.nextLocation.query)
      } else {
        this.props.history.replaceState(null, '/')
      }
    }
  }
  render() {
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
          <input type='email' ref='emailAddress' name='emailAddress' placeholder='email address' disabled={this.state.busy} required/>
          <input type='password' ref='password' name='password' placeholder='password' disabled={this.state.busy} required/>
          {this.state.error
            ? <p className='error'>
                {this.state.error}
              </p>
            : null}
          <div className='actions'>
            <Link to='/forgotPassword'>
              Are you locked out?
            </Link>
            <button disabled={this.state.busy} className='highlighted'>log in</button>
          </div>
        </form>
      </div>
    )
  }
  _onSubmit(event) {
    event.preventDefault()
    this.props.logIn({
      emailAddress: this.refs.emailAddress.value,
      password: this.refs.password.value
    })
    .catch(err => this.setState({
      error: err.message || err
    }))
  }
}
LogIn.propTypes = {
  credentials: React.PropTypes.object,
  busy: React.PropTypes.bool,
  logIn: React.PropTypes.func
}
LogIn.defaultProps = {
  credentials: null,
  busy: false,
  logIn: null
}

const wrapped = connect(
  function mapStateToProps(state) {
    return {
      credentials: state.auth.credentials,
      busy: state.auth.busy
    }
  },
  function mapDispatchToProps(dispatch) {
    return {
      logIn: (credentials) => dispatch(logIn(credentials))
    }
  }
)(LogIn)

module.exports = wrapped
