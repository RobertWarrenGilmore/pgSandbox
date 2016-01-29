'use strict';
var React = require('react');
var TitleMixin = require('./titleMixin');
var ajax = require('../utilities/ajax');

var Register = React.createClass({
  mixins: [TitleMixin('register')],
  getInitialState: function() {
    return {busy: false, success: false, error: null};
  },
  render: function() {
    if (this.state.success) {
      return (
        <div className='message'>
          <p>
            Congratulations! You registered. You'll recieve a confirmation email soon.
          </p>
        </div>
      );
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
      );
    }
  },
  _onSubmit: function(event) {
    event.preventDefault();
    var emailAddress = this.refs.emailAddress.value;
    var givenName = this.refs.givenName.value;
    var familyName = this.refs.familyName.value;
    this.setState({busy: true, success: false, error: null});
    var self = this;
    return ajax({
      method: 'POST',
      uri: '/api/users',
      json: true,
      body: {
        emailAddress: emailAddress,
        givenName: givenName,
        familyName: familyName
      }
    }).then(function(response) {
      if (response.statusCode === 201) {
        self.setState({busy: false, success: true, error: null});
      } else {
        self.setState({busy: false, success: false, error: response.body});
      }
    }).catch(function(error) {
      self.setState({busy: false, success: false, error: error.message});
    });
  }
});

module.exports = Register;
