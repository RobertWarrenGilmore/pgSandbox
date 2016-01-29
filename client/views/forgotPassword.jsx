'use strict'
import React from 'react'
import setWindowTitle from '../utilities/setWindowTitle'
import ajax from '../utilities/ajax'

class ForgotPassword extends React.Component{
  constructor(props) {
    super(props)
    this.state = {
      runningRequest: null,
      success: false,
      error: null
    }
    this._onSubmit = this._onSubmit.bind(this)
  }
  componentDidMount() {
    setWindowTitle('forgot password')
  }
  componentWillUnmount() {
    setWindowTitle()
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
    let r = ajax({
      method: 'PUT',
      uri: '/api/users',
      json: true,
      body: {
        emailAddress: emailAddress,
        passwordResetKey: null
      }
    })
    this.setState({
      runningRequest: r,
      success: false,
      error: null
    })
    return r.then((response) => {
      if (response.statusCode === 200) {
        this.setState({
          success: true,
          error: null
        })
      } else {
        this.setState({
          success: false,
          error: response.body
        })
      }
    }).catch((error) => {
      this.setState({
        success: false,
        error: error.message
      })
    }).finally(() => {
      this.setState({
        runningRequest: null
      })
    })
  }
}

export default ForgotPassword
