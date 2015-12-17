var React = require('react');
var PropTypes = React.PropTypes;
var marked = require('marked');
var escapeHtml = require('escape-html');
var sanitiseHtml = require('sanitize-html');

var CustomHtml = React.createClass({

  propTypes: {
    // some text to be rendered
    content: PropTypes.string,
    // whether to convert markdown to HTML
    markdown: PropTypes.bool,
    // whether to sanitise HTML using a white list suitable for prose
    sanitise: PropTypes.bool,
    // uses a span instead of a div; also qualifies whether to sanitise HTML using a much less forgiving white list, suitable for one-liners like titles
    inline: PropTypes.bool

    // Note that user-supplied text should never be rendered with neither escape nor sanitise.
  },

  getDefaultProps: function() {
    return {
      content: null,
      markdown: true,
      sanitise: true,
      inlineSanitise: false
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
          breaks: false,
          smartyPants: true
        });
      }
      if (this.props.sanitise) {
        // Notably absent are the script, style, and iframe tags.
        content = sanitiseHtml(content, {
          allowedTags: this.props.inline ?
            ['b', 'i', 'strong', 'em', 'del', 'code', 'sup', 'sub'] :
            [
              'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
              'li', 'b', 'i', 'strong', 'em', 'del', 'code', 'hr', 'br',
              'div', 'img', 'table', 'thead', 'caption', 'tbody', 'tr', 'th',
              'td', 'pre', 'dd', 'dl', 'dt', 'sup', 'sub'
            ],
          allowedAttributes: {
            a: ['href', 'title'],
            img: ['src', 'title']
          }
        });
      }
      content = {
        __html: content
      };
      if (this.props.inline) {
        return (
          <span className='customHtml' dangerouslySetInnerHTML={content}/>
        );
      } else {
        return (
          <div className='customHtml' dangerouslySetInnerHTML={content}/>
        );
      }

    } else {
      return null;
    }
  }
});

module.exports = CustomHtml;
