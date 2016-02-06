'use strict'
const React = require('react')
const { create: createUser } = require('../flux/users/actions')
const { connect } = require('react-redux')
const Helmet = require('react-helmet')

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
            Congratulations! You registered. You'll recieve a confirmation email soon.
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
  _onSubmit(event) {
    event.preventDefault()
    this.setState({
      busy: true,
      error: null
    })
    return this.props.createUser({
      emailAddress: this.refs.emailAddress.value
    }).then(() => this.setState({
      success: true
    })).catch(err => this.setState({
      error: err.message || err
    })).finally(() => this.setState({
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
