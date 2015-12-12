var React = require('react');
var PropTypes = React.PropTypes;
var BusyIndicator = require('./busyIndicator.jsx');
var ajax = require('../utilities/ajax');
var auth = require('../flux/auth');
var marked = require('marked');
var escapeHtml = require('escape-html');

var Prose = React.createClass({

  propTypes: {
    // some text to be rendered; If this is absent, then resource will be used.
    content: PropTypes.string,
    // information regarding a resource to be fetched via the API, from which to get the text
    resource: PropTypes.shape({
      // The URL of the resource will be /api/(type)/(id).
      type: PropTypes.string.isRequired,
      id: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number
      ]).isRequired,
      field: PropTypes.string
    }),
    // whether to escape HTML in the text
    escape: PropTypes.bool,
    // whether to convert the text from markdown to HTML
    markdown: PropTypes.bool,
    // whether to sanitise HTML from the text; Ignored if markdown is false.
    sanitiseMarkdown: PropTypes.bool

    // Note that user-supplied text should never be rendered with neither escape nor sanitiseMarkdown.
  },

  getDefaultProps: function() {
    return {
      content: null,
      resource: null,
      escape: true,
      markdown: false,
      sanitiseMarkdown: true
    };
  },

  getInitialState: function() {
    return {
      runningRequest: null,
      loadedContent: null,
      busy: false,
      error: null
    };
  },

  _loadResource: function () {
    if (this.state.runningRequest) {
      this.state.runningRequest.cancel();
    }
    var authCredentials = auth.getCredentials();
    if (authCredentials) {
      authCredentials = {
        user: authCredentials.emailAddress,
        pass: authCredentials.password
      };
    }
    var resourceInfo = this.props.resource;
    var self = this;
    var r = ajax({
      method: 'GET',
      uri: '/api/' + resourceInfo.type + '/' + resourceInfo.id,
      auth: authCredentials
    });
    this.setState({runningRequest: r, busy: true, error: null});
    var self = this;
    return r.then(function (response) {
      if (response.statusCode === 200) {
        var resource = response.body;
        var content = (resourceInfo.field) ? resource[resourceInfo.field] : resource;
        self.setState({
          loadedContent: content,
          busy: false
        });
        return null;
      } else {
        self.setState({busy: false, error: response.body, runningRequest: null});
      }
    }).catch(function(error) {
      self.setState({busy: false, error: error.message, runningRequest: null});
    });
  },

  componentWillMount: function() {
    if (!this.props.content) {
      this._loadResource();
    }
  },

  render: function() {
    if (this.state.busy) {
      return (
        <div className='prose'>
          <BusyIndicator/>
          loading
        </div>
      );
    }

    var content = this.props.content || this.state.loadedContent;
    if (content) {
      if (this.props.escape) {
        content = escapeHtml(content);
      }
      if (this.props.markdown) {
        content = marked(content, {
          sanitize: this.props.sanitiseMarkdown,
          smartyPants: true
        });
      }
      content = {
        __html: content
      };
      return (
        <div className='prose' dangerouslySetInnerHTML={content}/>
      );
    } else {
      return (
        <div className='prose'/>
      );
    }
  }

});

module.exports = Prose;
