var React = require('react');
var TitleMixin = require('./titleMixin');

var Users = React.createClass({
  mixins: [
    TitleMixin('user search')
  ],
  render: function() {
    return (
      <div id='message'>
        <p>
          Let's search for some users.
        </p>
      </div>
    );
  }
});

module.exports = Users;
