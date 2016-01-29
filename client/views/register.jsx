'use strict'
import React from 'react'
import ajax from '../utilities/ajax'
import setWindowTitle from '../utilities/setWindowTitle'
import {bind} from 'decko'

class Register extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      runningRequest: null,
      success: false,
      error: null
    }
  }
  componentDidMount() {
    setWindowTitle('register')
  }
  componentWillUnmount() {
    setWindowTitle()
  }
  render() {
    if (this.state.success) {
      return (
        <div className='message'>
          <p>
            Congratulations! You registered. You'll recieve a confirmation email soon.
          </p>
        </div>
      )
    } else {
      return (
        <div id='register'>
          <h1>
            register
          </h1>
          <p>
            Create an account.
          </p>
          <form onSubmit={this._onSubmit}>
            <input type='email' ref='emailAddress' name='emailAddress' placeholder='email address' disabled={this.state.busy} required/>
            <input type='text' ref='givenName' name='givenName' placeholder='first name (optional)' disabled={this.state.busy}/>
            <input type='text' ref='familyName' name='familyName' placeholder='last name (optional)' disabled={this.state.busy}/>
            {this.state.error
              ? <p className='error'>
                  {this.state.error}
                </p>
              : null}
            <div className='actions'>
              <button disabled={this.state.busy} className='highlighted'>register</button>
            </div>
          </form>
        </div>
      )
    }
  }
  @bind
  _onSubmit(event) {
    event.preventDefault()
    var emailAddress = this.refs.emailAddress.value
    var givenName = this.refs.givenName.value
    var familyName = this.refs.familyName.value
    let r = ajax({
      method: 'POST',
      uri: '/api/users',
      json: true,
      body: {
        emailAddress: emailAddress,
        givenName: givenName,
        familyName: familyName
      }
    })
    this.setState({
      runningRequest: r,
      success: false,
      error: null
    })
    return r.then((response) => {
      if (response.statusCode === 201) {
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

export default Register
