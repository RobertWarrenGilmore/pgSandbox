var _ = require('lodash');
var React = require('react');
var ReactRouter = require('react-router');
var Link = ReactRouter.Link;
var BusyIndicator = require('./busyIndicator.jsx');
var TitleMixin = require('./titleMixin');
var appScroll = require('../utilities/appScroll');
var ajax = require('../utilities/ajax');
var auth = require('../flux/auth');
var processUserHtml = require('../utilities/processUserHtml');


var BlogSearch = React.createClass({
  mixins: [TitleMixin('blog')],
  getInitialState: function() {
    return {
      busy: false,
      error: null,
      results: [],
      endReached: false,
      authUser: null
    };
  },

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
  _loadAuthUser: function () {
    var credentials = auth.getCredentials();
    if (credentials) {
      var r = ajax({
        method: 'GET',
        uri: '/api/users/' + credentials.id,
        json: true,
        auth: credentials
      });
      this.setState({
        runningRequest: r // Hold on to the Ajax promise in case we need to cancel it later.
      });
      var self = this;
      return r.then(function (response) {
        if (response.statusCode === 200) {
          self.setState({
            authUser: response.body
          });
        } else {
          self.setState({
            error: response.body
          });
        }
      }).catch(function (error) {
        self.setState({
          error: error.message
        });
      });
    } else {
      return Promise.resolve();
    }
  },

  // Redirect the URL to the provided query.
  _correctUrlQuery: function(query, options) {
    var replace = options && !!options.replace;
    var validQuery = {};
    // Only these parameters can be filtered on.
    var validFilter = ['tag', 'postedTime'];
    for (var i in validFilter) {
      var parameter = validFilter[i];
      if (query[parameter]) {
        validQuery[parameter] = query[parameter];
      }
    }
    var navigate = this.props.history[replace
        ? 'replaceState'
        : 'pushState'];
    var self = this;
    var doRedirect = function() {
      if (!_.isEqual(query, validQuery)) {
        navigate(null, self.props.location.pathname, validQuery);
      }
      if (self.state.queryUpdateTimeout) {
        self.setState({queryUpdateTimeout: null});
      }
    };
    if (this.state.queryUpdateTimeout) {
      clearTimeout(this.state.queryUpdateTimeout);
    }
    // If the valid query differs from the supplied query, redirect to it.
    doRedirect();
  },
  // Initiate a search from the URL query.
  _doSearch: function(offset) {
    if (this.state.runningRequest) {
      this.state.runningRequest.cancel();
    }
    var authCredentials = auth.getCredentials();
    var query = _.cloneDeep(this.props.location.query);
    if (offset) {
      query.offset = offset;
    }
    var r = ajax({
      method: 'GET',
      uri: '/api/blog',
      auth: authCredentials,
      json: true,
      qs: query
    });
    this.setState({runningRequest: r, busy: true, error: null});
    var self = this;
    r.then(function(response) {
      if (response.statusCode === 200) {
        var results = [];
        if (offset) {
          Array.prototype.push.apply(results, self.state.results);
        }
        Array.prototype.push.apply(results, response.body);
        self.setState({
          busy: false,
          error: null,
          results: results,
          runningRequest: null,
          endReached: !response.body.length
        }, self._loadMoreResults);
        return null;
      } else {
        self.setState({busy: false, error: response.body, runningRequest: null});
      }
    }).catch(function(error) {
      self.setState({busy: false, error: error.message, runningRequest: null});
    });
  },
  _loadMoreResults: function() {
    if (this._isInNextPageZone() && !this.state.busy && !this.state.endReached) {
      this._doSearch(this.state.results.length);
    }
  },
  componentWillMount: function() {
    // Correct the URL query if it's invalid.
    this._correctUrlQuery(this.props.location.query, {
      replace: true
    });
    var self = this;
    this._loadAuthUser().then(function () {
      self._doSearch();
    });
  },
  componentDidUpdate: function(prevProps, prevState) {
    var urlQueryChanged = !_.isEqual(this.props.location.query, prevProps.location.query);
    if (urlQueryChanged) {
      this._correctUrlQuery(this.props.location.query, {
        replace: true
      });
      this._doSearch();
    }
  },
  componentDidMount: function() {
    appScroll.addListener(this._onScroll);
  },
  componentWillUnmount: function() {
    appScroll.removeListener(this._onScroll);
  },
  _isInNextPageZone: function() {
    var element = this.refs.caboose;
    if (element) {
      return element.getBoundingClientRect().top <= window.innerHeight;
    } else {
      return false;
    }
  },
  _onScroll: function(event) {
    return this._loadMoreResults();
  },
  render: function() {
    var caboose = null;
    if (this.state.endReached) {
      if (!this.state.results.length) {
        caboose = (
          <div className='caboose' ref='caboose'>
            no posts
          </div>
        );
      }
    } else {
      caboose = (
        <div className='caboose' ref='caboose'>
          <BusyIndicator/>
          loading more
        </div>
      );
    }
    var self = this;
    var posts = _.filter(this.state.results, function (post) {
      var hidden = (self.state.authUser === null || (post.author.id !== self.state.authUser.id && !self.state.authUser.admin)) && (!post.active);
      return !hidden;
    });
    var authorisedToBlog = this.state.authUser && this.state.authUser.authorisedToBlog;
    var isAdmin = this.state.authUser && this.state.authUser.admin;

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
          {_.map(posts, function(post) {
            return <Entry post={post} key={post.id}/>;
          })}
          {caboose}
        </div>
      </div>
    );
  }
});

var Entry = React.createClass({

  render: function() {
    var post = this.props.post;
    var preview = post.preview;
    // If no preview was provided, use the first paragraph of the body.
    if (!preview) {
      preview = post.body.split(/(\r?\n){2,}/)[0].trim();
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
    );
  }

});

module.exports = BlogSearch;
