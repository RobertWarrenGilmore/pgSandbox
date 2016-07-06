'use strict'
const React = require('react')
const { create: createUser } = require('../flux/users/actions')
const { connect } = require('react-redux')
const Helmet = require('react-helmet')
const ErrorMessage = require('./errorMessage.jsx')

class Register extends React.Component {
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
            {`Congratulations! You registered. You'll recieve a confirmation email soon.`}
          </p>
        </div>
      )
    } else {
      return (
        <div id='register'>
          <Helmet title='register'/>
          <h1>
            register
          </h1>
          <p>
            Create an account.
          </p>
          <form onSubmit={this._onSubmit}>
            <input type='email' ref='emailAddress' name='emailAddress' placeholder='email address' disabled={this.state.busy} required/>
            <input type='text' ref='givenName' name='givenName' placeholder='first name' disabled={this.state.busy} required/>
            <input type='text' ref='familyName' name='familyName' placeholder='last name' disabled={this.state.busy} required/>
            {this.state.error
              ? <ErrorMessage error={this.state.error}/>
              : null}
            <div className='actions'>
              <button disabled={this.state.busy} className='highlighted'>register</button>
            </div>
          </form>
        </div>
      )
    }
  }
  _onSubmit(event) {
    event.preventDefault()
    this.setState({
      busy: true,
      error: null
    })
    return this.props.createUser({
      emailAddress: this.refs.emailAddress.value,
      givenName: this.refs.givenName.value,
      familyName: this.refs.familyName.value
    })
    .then(() => this.setState({
      success: true
    }))
    .catch(err => this.setState({
      error: err.message || err
    }))
    .then(() => this.setState({
      busy: false
    }))
  }
}
Register.propTypes = {
  createUser: React.PropTypes.func
}
Register.defaultProps = {
  createUser: () => {}
}

const wrapped = connect(
  function mapStateToProps(state) {
    return {}
  },
  function mapDispatchToProps(dispatch) {
    return {
      createUser: user => dispatch(createUser(user))
    }
  }
)(Register)

module.exports = wrapped
