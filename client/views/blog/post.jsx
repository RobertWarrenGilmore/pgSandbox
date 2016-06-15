'use strict'
const React = require('react')
const { Link } = require('react-router')
const processUserHtml = require('../../utilities/processUserHtml')
const moment = require('moment-timezone')
const DateTime = require('../dateTime.jsx')

const BlogPost = props => {
  const {
    post,
    linkAuthor = true,
    showPreview = false,
    showBody = true
  } = props

  let preview = post.preview
  let previewIsFromBody = !preview
  // If no preview was provided, use the first paragraph of the body.
  if (previewIsFromBody) {
    preview = post.body.split(/(\r?\n){2,}/)[0].trim()
  }


  let byLine
  if (linkAuthor) {
    byLine = (
      <p className='byLine'>
        by&nbsp;
        <Link to={'/users/' + post.author.id}>
          {post.author.givenName} {post.author.familyName}
        </Link>
      </p>
    )
  } else {
    byLine = (
      <p className='byLine'>
        by {post.author.givenName} {post.author.familyName}
      </p>
    )
  }

  return (
    <div className='blogPost' to={'/blog/' + post.id}>

      {post.active ? null : (
        <span className='icon-eye-blocked' title='This post is not published.'/>
      )}

      <header>

        <h1 dangerouslySetInnerHTML={processUserHtml(post.title, {
          inline: true
        })}/>

        {byLine}

        <p className='postedTime'>
          <DateTime
            date={post.postedTime}
            timeZone={post.timeZone}
            />
        </p>

      </header>

      {(showPreview) ? (
        <div className='preview'>
          <div dangerouslySetInnerHTML={processUserHtml(preview)}/>
          {(!previewIsFromBody || (preview.length < post.body.length)) ? (
              <p>
                Read more...
              </p>
          ) : null}
        </div>
      ) : null}

      {(showBody) ? (
        <div className='body' dangerouslySetInnerHTML={processUserHtml(post.body)}/>
      ) : null}

    </div>
  )
}

module.exports = BlogPost
