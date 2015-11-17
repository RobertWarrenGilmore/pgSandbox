var React = require('react');
var Fluxxor = require('fluxxor');
var FluxMixin = Fluxxor.FluxMixin(React);
var TitleMixin = require('./titleMixin');

var NotFound = React.createClass({
  mixins: [
    FluxMixin, TitleMixin('page not found')
  ],
  render: function() {
    return (
      <div id='message'>
        <h1>
          no such page
        </h1>
        <p>
          That page wasn't found.
        </p>
      </div>
    );
  }
});

module.exports = NotFound;
