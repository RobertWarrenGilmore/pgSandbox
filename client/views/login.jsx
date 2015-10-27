var React = require('react');

var Login = React.createClass({
  render: function() {
    return (
      <div id='login'>
        <form onSubmit={this._onSubmit}>
          <input type='email' name='emailAddress' placeholder='email address'/>
          <input type='password' name='password' placeholder='password'/>
          <button>log in</button>
        </form>
      </div>
    );
  },
  _onSubmit: function(event) {
    event.preventDefault();
  }
});

module.exports = Login;
