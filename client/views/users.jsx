var React = require('react');
var Fluxxor = require('fluxxor');
var FluxMixin = Fluxxor.FluxMixin(React);
var TitleMixin = require('./titleMixin');

var Users = React.createClass({
  mixins: [
    FluxMixin, TitleMixin('user search')
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
