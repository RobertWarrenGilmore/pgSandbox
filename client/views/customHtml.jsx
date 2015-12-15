var React = require('react');
var PropTypes = React.PropTypes;
var marked = require('marked');
var escapeHtml = require('escape-html');

var CustomHtml = React.createClass({

  propTypes: {
    // some text to be rendered
    content: PropTypes.string,
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
      escape: true,
      markdown: false,
      sanitiseMarkdown: true
    };
  },

  render: function() {
    var content = this.props.content;
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
        <div className='customHtml' dangerouslySetInnerHTML={content}/>
      );
    } else {
      return (
        <div className='customHtml'/>
      );
    }
  }
});

module.exports = CustomHtml;
