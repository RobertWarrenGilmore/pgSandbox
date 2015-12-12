var React = require('react');
var Prose = require('./prose.jsx');

var Home = React.createClass({

  render: function() {
    return (
      <div id='home'>
        <Prose resource={{
          type: 'infoPages',
          id: 'home'
        }} escape={false} markdown={true}/>
      </div>
    );
  }

});

module.exports = Home;
