'use strict'
import _ from 'lodash'
import React from 'react'
import {Link} from 'react-router'
import BusyIndicator from './busyIndicator.jsx'
import setWindowTitle from '../utilities/setWindowTitle'
import appScroll from '../utilities/appScroll'
import ajax from '../utilities/ajax'
import auth from '../flux/auth'
import processUserHtml from '../utilities/processUserHtml'
import {bind} from 'decko'

class BlogSearch extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      error: null,
      results: [],
      endReached: false,
      authUser: null
    }
  }

  /*
   * Load the full details of the authenticated user and store them in
   *   this.state.authUser. (We need to know a few things about the
   *   authenticated user in order to render the blog post.)
   * If the user is not authenticated, do nothing.
   * This method is meant to be run only once, when the component mounts. We
   *   assume that the user will not change while we're on this page. If
   *   something important does change about the user, the API will give us
   *   appropriate errors when we try to edit the post.
   */
   @bind
  _loadAuthUser() {
    const credentials = auth.getCredentials()
    if (credentials) {
      let r = ajax({
        method: 'GET',
        uri: '/api/users/' + credentials.id,
        json: true,
        auth: credentials
      })
      this.setState({
        runningRequest: r // Hold on to the Ajax promise in case we need to cancel it later.
      })
      return r.then((response) => {
        if (response.statusCode === 200) {
          this.setState({
            authUser: response.body
          })
        } else {
          this.setState({
            error: response.body
          })
        }
      }).catch((error) => {
        this.setState({
          error: error.message
        })
      })
    } else {
      return Promise.resolve()
    }
  }

  // Redirect the URL to the provided query.
  @bind
  _correctUrlQuery(query, options) {
    const replace = options && !!options.replace
    let validQuery = {}
    // Only these parameters can be filtered on.
    const validFilter = ['tag', 'postedTime']
    for (let i in validFilter) {
      let parameter = validFilter[i]
      if (query[parameter]) {
        validQuery[parameter] = query[parameter]
      }
    }
    let navigate = this.props.history[replace
        ? 'replaceState'
        : 'pushState']
    // If the valid query differs from the supplied query, redirect to it.
    if (!_.isEqual(query, validQuery)) {
      navigate(null, this.props.location.pathname, validQuery)
    }
  }
  // Initiate a search from the URL query.
  @bind
  _doSearch(offset) {
    if (this.state.runningRequest) {
      this.state.runningRequest.cancel()
    }
    const authCredentials = auth.getCredentials()
    let query = _.cloneDeep(this.props.location.query)
    if (offset) {
      query.offset = offset
    }
    let r = ajax({
      method: 'GET',
      uri: '/api/blog',
      auth: authCredentials,
      json: true,
      qs: query
    })
    this.setState({runningRequest: r, error: null})
    r.then((response) => {
      if (response.statusCode === 200) {
        let results = []
        if (offset) {
          Array.prototype.push.apply(results, this.state.results)
        }
        Array.prototype.push.apply(results, response.body)
        this.setState({
          error: null,
          results: results,
          runningRequest: null,
          endReached: !response.body.length
        }, this._loadMoreResults)
        return null
      } else {
        this.setState({error: response.body, runningRequest: null})
      }
    }).catch((error) => {
      this.setState({error: error.message, runningRequest: null})
    })
  }
  @bind
  _loadMoreResults() {
    if (this._isInNextPageZone() && !this.state.runningRequest && !this.state.endReached) {
      this._doSearch(this.state.results.length)
    }
  }
  componentWillMount() {
    // Correct the URL query if it's invalid.
    this._correctUrlQuery(this.props.location.query, {
      replace: true
    })
    this._loadAuthUser().then(() => {
      this._doSearch()
    })
  }
  componentDidUpdate(prevProps, prevState) {
    const urlQueryChanged = !_.isEqual(this.props.location.query, prevProps.location.query)
    if (urlQueryChanged) {
      this._correctUrlQuery(this.props.location.query, {
        replace: true
      })
      this._doSearch()
    }
  }
  componentDidMount() {
    appScroll.addListener(this._onScroll)
    setWindowTitle('blog')
  }
  componentWillUnmount() {
    appScroll.removeListener(this._onScroll)
    setWindowTitle()
  }
  @bind
  _isInNextPageZone() {
    let element = this.refs.caboose
    if (element) {
      return element.getBoundingClientRect().top <= window.innerHeight
    } else {
      return false
    }
  }
  @bind
  _onScroll(event) {
    return this._loadMoreResults()
  }
  render() {
    let caboose = null
    if (this.state.endReached) {
      if (!this.state.results.length) {
        caboose = (
          <div className='caboose' ref='caboose'>
            no posts
          </div>
        )
      }
    } else {
      caboose = (
        <div className='caboose' ref='caboose'>
          <BusyIndicator/>
          loading more
        </div>
      )
    }
    let posts = _.filter(this.state.results, (post) => {
      const hidden = (this.state.authUser === null || (post.author.id !== this.state.authUser.id && !this.state.authUser.admin)) && (!post.active)
      return !hidden
    })
    const authorisedToBlog = this.state.authUser && this.state.authUser.authorisedToBlog
    const isAdmin = this.state.authUser && this.state.authUser.admin

    return (
      <div id='blogSearch'>
        {(authorisedToBlog || isAdmin) ? (
          <div className='actions'>
            <Link
              to='/blog/new'
              state={{
                editing: true
              }}
              className='button highlighted'>
              <span className='icon-plus'/>
              &nbsp;
              create a new blog post
            </Link>
          </div>
        ) : null}
        <div id='blogPostList'>
          {posts.map((post) =>
            <Entry post={post} key={post.id}/>
          )}
          {caboose}
        </div>
      </div>
    )
  }
}

const Entry = (props) => {
  const post = props.post
  let preview = post.preview
  // If no preview was provided, use the first paragraph of the body.
  if (!preview) {
    preview = post.body.split(/(\r?\n){2,}/)[0].trim()
  }
  return (
    <Link className='blogPost' to={'/blog/' + post.id}>
      {post.active ? null : (
        <span className='icon-eye-blocked' title='This post is not published.'/>
      )}
      <header>
        <h1 dangerouslySetInnerHTML={processUserHtml(post.title, {
          inline: true
        })}/>
        <p className='byLine'>
          by {post.author.givenName} {post.author.familyName}
        </p>
        <p className='postedTime'>
          <time dateTime={post.postedTime}>
            {post.postedTime.substring(0, 10)}
          </time>
        </p>
      </header>
      <div className='preview'>
        <div dangerouslySetInnerHTML={processUserHtml(preview)}/>
        {(preview.length < post.body.trim().length)
          ? (
            <p>
              Read more...
            </p>
        ) : null}
      </div>
    </Link>
  )
}

export default BlogSearch
