var _ = require('lodash');
var React = require('react');
var ReactRouter = require('react-router');
var Link = ReactRouter.Link;
var CustomHtml = require('./customHtml.jsx');
var BusyIndicator = require('./busyIndicator.jsx');
var TitleMixin = require('./titleMixin');
var appScroll = require('../utilities/appScroll');
var ajax = require('../utilities/ajax');
var auth = require('../flux/auth');

var BlogSearch = React.createClass({
  mixins: [TitleMixin('blog')],
  getInitialState: function() {
    return {
      busy: false,
      error: null,
      results: [],
      endReached: false
    };
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
    this._doSearch();
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
          <li className='caboose' ref='caboose'>
            no posts
          </li>
        );
      }
    } else {
      caboose = (
        <li className='caboose' ref='caboose'>
          <BusyIndicator/>
          loading more
        </li>
      );
    }
    return (
      <div id='blogSearch'>
        <ol>
          {_.map(this.state.results, function(post) {
            return <Entry post={post} key={post.id}/>;
          })}
          {caboose}
        </ol>
      </div>
    );
  }
});

var Entry = React.createClass({

  render: function() {
    var post = this.props.post;
    return (
      <li className='post'>
        <Link to={'/blog/' + post.id}>
          <header>
            <h1>
              <CustomHtml content={post.title} markdown={true}/>
            </h1>
            <h2 className='byLine'>
              by {post.author.givenName} {post.author.familyName}
            </h2>
            <time className='postedTime' dateTime={post.postedTime}>
              {post.postedTime.substring(0,10)}
            </time>
          </header>
          <div className='preview'>
            <CustomHtml content={post.body} markdown={true}/>
          </div>
        </Link>
      </li>
    );
  }

});

module.exports = BlogSearch;