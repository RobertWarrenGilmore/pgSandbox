var React = require('react');
var TitleMixin = require('./titleMixin');

var Users = React.createClass({
  mixins: [TitleMixin('user search')],
  render: function() {
    return <div>Let's search for some users.</div>;
  }
});

module.exports = Users;
