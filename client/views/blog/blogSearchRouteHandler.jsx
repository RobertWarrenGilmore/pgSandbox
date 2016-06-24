'use strict'
const _ = require('lodash')
const React = require('react')
const { Link, withRouter } = require('react-router')
const BusyIndicator = require('../busyIndicator.jsx')
const Post = require('./post.jsx')
const appScroll = require('../../utilities/appScroll')
const { connect } = require('react-redux')
const blogActions = require('../../flux/blog/actions')
const Helmet = require('react-helmet')

class BlogSearch extends React.Component {
  static propTypes = {
    authUser: React.PropTypes.object,
    posts: React.PropTypes.object,
    searchPosts: React.PropTypes.func,
    router: React.PropTypes.shape({
      replace: React.PropTypes.func.isRequired,
      push: React.PropTypes.func.isRequired
    }).isRequired
  };
  static defaultProps = {
    authUser: null,
    posts: null,
    searchPosts: null
  };
  state = {
    busy: false,
    error: null,
    results: [],
    endReached: false
  };
  constructor(props) {
    super(props)
    this._correctUrlQuery = this._correctUrlQuery.bind(this)
    this._doSearch = this._doSearch.bind(this)
    this._loadMoreResults = this._loadMoreResults.bind(this)
    this._isInNextPageZone = this._isInNextPageZone.bind(this)
    this._onScroll = this._onScroll.bind(this)
  }

  // Redirect the URL to the provided query.
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
    let navigate = this.props.router[replace
        ? 'replace'
        : 'push']
    // If the valid query differs from the supplied query, redirect to it.
    if (!_.isEqual(query, validQuery)) {
      navigate({
        pathname: this.props.location.pathname,
        query: validQuery
      })
    }
  }
  // Initiate a search from the URL query.
  _doSearch(offset) {
    this.setState({
      busy: true,
      error: null
    })
    let query = _.cloneDeep(this.props.location.query)
    if (offset) {
      query.offset = offset
    }
    return this.props.searchPosts(query)
      .then(ids => {
        let results = (offset ? this.state.results : []).concat(ids)
        this.setState({
          results,
          endReached: !ids.length
        }, this._loadMoreResults)
      })
      .catch(err => this.setState({
        error: err.message || err
      }))
      .then(() => this.setState({
        busy: false
      }))
  }
  _loadMoreResults() {
    if (this._isInNextPageZone() && !this.state.runningRequest && !this.state.endReached) {
      return this._doSearch(this.state.results.length)
    }
  }
  componentWillMount() {
    // Correct the URL query if it's invalid.
    this._correctUrlQuery(this.props.location.query, {
      replace: true
    })
    return this._doSearch()
  }
  componentDidUpdate(prevProps, prevState) {
    const urlQueryChanged = !_.isEqual(this.props.location.query, prevProps.location.query)
    if (urlQueryChanged) {
      this._correctUrlQuery(this.props.location.query, {
        replace: true
      })
      return this._doSearch()
    }
  }
  componentDidMount() {
    appScroll.addListener(this._onScroll)
  }
  componentWillUnmount() {
    appScroll.removeListener(this._onScroll)
  }
  _isInNextPageZone() {
    let element = this.refs.caboose
    if (element) {
      return element.getBoundingClientRect().top <= window.innerHeight
    } else {
      return false
    }
  }
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
    let posts = this.state.results.map(id => this.props.posts[id])
    posts = _.filter(posts, (post) => {
      const hidden = (this.props.authUser === null || (post.author.id !== this.props.authUser.id && !this.props.authUser.admin)) && (!post.active)
      return !hidden
    })
    const authorisedToBlog = this.props.authUser && this.props.authUser.authorisedToBlog
    const isAdmin = this.props.authUser && this.props.authUser.admin

    return (
      <div id='blogSearch'>
        <Helmet title='blog'/>
        {(authorisedToBlog || isAdmin) ? (
          <div className='actions'>
            <Link
              to={{
                pathname: '/blog/new',
                state: {
                  editing: true
                }
              }}
              className='button highlighted'
              >
              <span className='icon-plus'/>
              &nbsp;
              create a new blog post
            </Link>
          </div>
        ) : null}
        <div id='blogPostList'>
          {posts.map((post) =>
            <Link key={post.id} to={'/blog/' + post.id}>
              <Post post={post} linkAuthor={false} showPreview={true} showBody={false}/>
            </Link>
          )}
          {caboose}
        </div>
      </div>
    )
  }
}

let wrapped = connect(
  function mapStateToProps(state) {
    let authUser
    if (state.auth.id && state.users.cache) {
      authUser = state.users.cache[state.auth.id]
    }
    return {
      authUser,
      posts: state.blog.posts
    }
  },
  function mapDispatchToProps(dispatch) {
    return {
      searchPosts: (query) => dispatch(blogActions.searchPosts(query))
    }
  }
)(BlogSearch)

wrapped = withRouter(wrapped)

module.exports = wrapped
