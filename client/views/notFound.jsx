var React = require('react');
var TitleMixin = require('./titleMixin');

var NotFound = React.createClass({
  mixins: [TitleMixin('page not found')],
  render: function() {
    return <div>That page wasn't found.</div>;
  }
});

module.exports = NotFound;
