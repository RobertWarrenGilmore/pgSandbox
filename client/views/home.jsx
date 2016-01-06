var React = require('react');
var BusyIndicator = require('./busyIndicator.jsx');
var ajax = require('../utilities/ajax');
var auth = require('../flux/auth');
var processUserHtml = require('../utilities/processUserHtml');

var Home = React.createClass({

  getInitialState: function() {
    return {
      loadedContent: null,
      busy: false,
      error: null
    };
  },

  componentWillMount: function() {
    var authCredentials = auth.getCredentials();
    this.setState({
      busy: true,
      error: null
    });
    var self = this;
    return ajax({
      method: 'GET',
      uri: '/api/infoPages/home',
      auth: authCredentials
    }).then(function (response) {
      if (response.statusCode === 200) {
        self.setState({
          loadedContent: response.body,
          busy: false,
          error: null
        });
      } else {
        self.setState({
          busy: false,
          error: response.body
        });
      }
      return null;
    }).catch(function(error) {
      self.setState({
        busy: false,
        error: error.message
      });
    });
  },

  render: function() {
    var result = null;
    if (this.state.busy) {
      result = (
        <div id='home' className='message'>
          <BusyIndicator/>
          'loading'
        </div>
      );
    } else {
      if (this.state.error) {
        result = (
          <div id='home' className='message'>
            <p className='error'>
              {this.state.error}
            </p>
          </div>
        );
      } else {
        result = (
          <div id='home' dangerouslySetInnerHTML={processUserHtml(this.state.loadedContent, {
            sanitise: false
          })}/>
        );
      }
    }

    return result;
  }

});

module.exports = Home;
