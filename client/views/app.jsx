var React = require('react');
var Fluxxor = require('fluxxor');
var FluxMixin = Fluxxor.FluxMixin(React);

var App = React.createClass({
  mixins: [FluxMixin],
  componentWillMount: function() {
    this.getFlux()
      .actions
      .auth
      .resumeAuth();
  },
  render: function() {
    return <div>{this.props.children}</div>;
  }
});

module.exports = App;
