var React = require('react');
var CustomHtml = require('./customHtml.jsx');
var BusyIndicator = require('./busyIndicator.jsx');
var ajax = require('../utilities/ajax');
var auth = require('../flux/auth');

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
    if (authCredentials) {
      authCredentials = {
        user: authCredentials.emailAddress,
        pass: authCredentials.password
      };
    }
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
    var contents = null;
    if (this.state.busy) {
      contents = [
        <BusyIndicator/>,
        'loading'
      ];
    } else {
      if (this.state.error) {
        contents = (
          <p className='error'>
            {this.state.error}
          </p>
        );
      } else {
        contents = (
          <CustomHtml
            content={this.state.loadedContent}
            escape={false}
            markdown={false}
            sanitiseMarkdown={false}/>
        );
      }
    }

    return (
      <div id='home'>
        {contents}
      </div>
    );
  }

});

module.exports = Home;
