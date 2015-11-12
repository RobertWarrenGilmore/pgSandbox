var React = require('react');
var TitleMixin = require('./titleMixin');

var User = React.createClass({
  mixins: [TitleMixin('user')],
  render: function() {
    return <div>Let's look at a user</div>;
  }
});

module.exports = User;
