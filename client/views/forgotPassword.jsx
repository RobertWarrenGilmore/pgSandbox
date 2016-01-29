'use strict'
var React = require('react')
var TitleMixin = require('./titleMixin')
var ajax = require('../utilities/ajax')

var ForgotPassword = React.createClass({
  mixins: [TitleMixin('forgot password')],
  getInitialState: function() {
    return {busy: false, success: false, error: null}
  },
  render: function() {
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
  },
  _onSubmit: function(event) {
    event.preventDefault()
    var emailAddress = this.refs.emailAddress.value
    this.setState({busy: true, success: false, error: null})
    var self = this
    return ajax({
      method: 'PUT',
      uri: '/api/users',
      json: true,
      body: {
        emailAddress: emailAddress,
        passwordResetKey: null
      }
    }).then(function(response) {
      if (response.statusCode === 200) {
        self.setState({busy: false, success: true, error: null})
      } else {
        self.setState({busy: false, success: false, error: response.body})
      }
    }).catch(function(error) {
      self.setState({busy: false, success: false, error: error.message})
    })
  }
})

module.exports = ForgotPassword
