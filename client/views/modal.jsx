var React = require('react');
var PropTypes = React.PropTypes;

var Modal = React.createClass({

  render: function() {
    return (
      <div className='modalWrapper'>
        <div className='modal'>
          {this.props.children}
        </div>
      </div>
    );
  }

});

module.exports = Modal;
