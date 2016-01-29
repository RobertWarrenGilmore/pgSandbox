'use strict';
var React = require('react');

var BusyIndicator = React.createClass({

  render: function() {
    return (
      <div className='busyIndicator'>
        <span className='icon-spinner2'/>
      </div>
    );
  }

});

module.exports = BusyIndicator;
