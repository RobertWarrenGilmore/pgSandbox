var React = require('react');
var TitleMixin = require('./titleMixin');

var User = React.createClass({
  mixins: [
    TitleMixin('user')
  ],
  render: function() {
    return (
      <div className='message'>
        <p>
          Let's look at a user.
        </p>
      </div>
    );
  }
});

module.exports = User;
