'use strict'
import marked from 'marked'
import sanitiseHtml from 'sanitize-html'

export default function (content, options) {
  options = options || {}
  const markdown = (options.markdown === undefined) ? true : !!options.markdown
  const sanitise = (options.sanitise === undefined) ? true : !!options.sanitise
  const inline = (options.inline === undefined) ? false : !!options.inline

  let result = '' + content
  if (markdown) {
    result = marked(result, {
      breaks: false,
      smartyPants: true
    })
  }
  if (sanitise) {
    // Notably absent are the script, style, and iframe tags.
    result = sanitiseHtml(result, {
      allowedTags: inline ?
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
    })
  }
  result = {
    __html: result
  }
  return result
}
