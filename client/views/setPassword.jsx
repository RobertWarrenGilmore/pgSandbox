'use strict'
import React from 'react'
import ajax from '../utilities/ajax'
import setWindowTitle from '../utilities/setWindowTitle'

class SetPassword extends React.Component{
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
    setWindowTitle('set password')
  }
  componentWillUnmount() {
    setWindowTitle()
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
              disabled={!!this.state.runningRequest}
              required/>
            <input
              type='password'
              ref='verifyPassword'
              name='verifyPassword'
              placeholder='verify new password'
              disabled={!!this.state.runningRequest}
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
    const userId = this.props.params.userId
    const passwordResetKey = this.props.location.query.key
    const password = this.refs.password.value
    const verifyPassword = this.refs.verifyPassword.value
    if (password !== verifyPassword) {
      this.setState({
        error: 'The passwords must match.'
      })
    } else {
      let r = ajax({
        method: 'PUT',
        uri: '/api/users/' + userId,
        json: true,
        body: {
          password: password,
          passwordResetKey: passwordResetKey
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
}

export default SetPassword
