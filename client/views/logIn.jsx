'use strict'
import React from 'react'
import {Link} from 'react-router'
import setWindowTitle from '../utilities/setWindowTitle'
import auth from '../flux/auth'
import {bind} from 'decko'

class LogIn extends React.Component {
  constructor() {
    this.state = {
      credentials: auth.getCredentials(),
      busy: auth.isBusy(),
      error: null
    }
  }
  @bind
  _authListener() {
    this.setState({
      credentials: auth.getCredentials(),
      busy: auth.isBusy(),
      error: auth.getError()
    })
  }
  componentWillMount() {
    auth.clearError()
  }
  componentDidMount() {
    auth.listen(this._authListener)
    setWindowTitle('log in')
  }
  componentWillUnmount() {
    auth.unlisten(this._authListener)
    setWindowTitle()
  }
  componentWillUpdate(nextProps, nextState) {
    if (nextState.credentials) {
      var location = this.props.location
      if (location.state && location.state.nextLocation) {
        this.props.history.replaceState(null, location.state.nextLocation.pathname, location.state.nextLocation.query)
      } else {
        this.props.history.replaceState(null, '/')
      }
    }
  }
  render() {
    var location = this.props.location
    var nextLocation = location.state ? location.state.nextLocation : null
    return (
      <div id='logIn'>
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
  @bind
  _onSubmit(event) {
    event.preventDefault()
    var emailAddress = this.refs.emailAddress.value
    var password = this.refs.password.value
    auth.logIn({
      emailAddress: emailAddress,
      password: password
    })
  }
}

export default LogIn
