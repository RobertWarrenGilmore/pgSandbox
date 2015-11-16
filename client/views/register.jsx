var React = require('react');
var Fluxxor = require('fluxxor');
var FluxMixin = Fluxxor.FluxMixin(React);
var StoreWatchMixin = Fluxxor.StoreWatchMixin;
var TitleMixin = require('./titleMixin');

var Register = React.createClass({
  mixins: [
    FluxMixin, StoreWatchMixin('registration'), TitleMixin('register')
  ],
  render: function() {
    if (this.state.result.success) {
      return (
        <div id='message'>
          <p>
            Congratulations! You registered. You'll recieve a confirmation email soon.
          </p>
        </div>
      );
    } else {
      return (
        <div id='register'>
          <form onSubmit={this._onSubmit}>
            <input type='email' ref='emailAddress' name='emailAddress' placeholder='email address' disabled={this.state.blocked} required/>
            <input type='text' ref='givenName' name='givenName' placeholder='first name (optional)' disabled={this.state.blocked}/>
            <input type='text' ref='familyName' name='familyName' placeholder='last name (optional)' disabled={this.state.blocked}/>
            {this.state.result.error
              ? <p className='error'>
                  {this.state.result.error}
                </p>
              : null}
            <div>
              <button disabled={this.state.blocked} className='highlighted'>register</button>
            </div>
          </form>
        </div>
      );
    }
  },
  getStateFromFlux: function() {
    var store = this.getFlux()
      .store('registration');
    return {
      blocked: store.isInProgress(),
      result: store.getResult()
    };
  },
  _onSubmit: function(event) {
    event.preventDefault();
    var emailAddress = this.refs.emailAddress.value;
    var givenName = this.refs.givenName.value;
    var familyName = this.refs.familyName.value;
    this.getFlux()
      .actions
      .registration
      .register({
        emailAddress: emailAddress,
        givenName: givenName,
        familyName: familyName
      });
  }
});

module.exports = Register;
