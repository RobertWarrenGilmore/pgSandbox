var React = require('react');
var Fluxxor = require('fluxxor');
var FluxMixin = Fluxxor.FluxMixin(React);
var TitleMixin = require('./titleMixin');

var User = React.createClass({
  mixins: [
    FluxMixin, TitleMixin('user')
  ],
  render: function() {
    return (
      <div id='message'>
        <p>
          Let's look at a user.
        </p>
      </div>
    );
  }
});

module.exports = User;
