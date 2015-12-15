var React = require('react');
var CustomHtml = require('./customHtml.jsx');
var BusyIndicator = require('./busyIndicator.jsx');
var ReactRouter = require('react-router');
var Link = ReactRouter.Link;
var TitleMixin = require('./titleMixin');
var ajax = require('../utilities/ajax');
var auth = require('../flux/auth');

var BlogPost = React.createClass({

  mixins: [TitleMixin('blog')],

  getInitialState: function() {
    return {
      runningRequest: null,
      loadedPost: null,
      busy: false,
      error: null
    };
  },

  _loadPost: function () {
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
    var r = ajax({
      method: 'GET',
      uri: '/api/blog/' + this.props.params.postId,
      auth: authCredentials,
      json: true
    });
    this.setState({runningRequest: r, busy: true, error: null});
    var self = this;
    return r.then(function (response) {
      if (response.statusCode === 200) {
        response.body.postedTime = new Date(response.body.postedTime);
        self.setState({
          loadedContent: response.body,
          busy: false
        });
        self.setTitle(response.body.title);
        return null;
      } else {
        self.setState({busy: false, error: response.body, runningRequest: null});
        self.setTitle('blog');
      }
    }).catch(function(error) {
      self.setState({busy: false, error: error.message, runningRequest: null});
      self.setTitle('blog');
    });
  },

  componentWillMount: function() {
    this._loadPost();
  },

  componentWillReceiveProps: function(nextProps) {
    var postIdChanged = nextProps.params.postId !== this.props.params.postId;
    if (postIdChanged) {
      this._loadPost();
    }
  },

  render: function() {
    var result = null;
    if (this.state.busy) {
      result = (
        <div id='blogPost' className='message'>
          <BusyIndicator/>
          'loading'
        </div>
      );
    } else {
      if (this.state.error) {
        result = (
          <div id='blogPost' className='message'>
            <p className='error'>
              {this.state.error}
            </p>
          </div>
        );
      } else {
        var post = this.state.loadedContent;
        result = (
          <div id='blogPost'>
            <header>
              <h1>
                <CustomHtml content={post.title} markdown={true}/>
              </h1>
              <h2 className='byLine'>
                by
                <Link to={'/users/' + post.author.id}>
                  {post.author.givenName} {post.author.familyName}
                </Link>
              </h2>
              <time className='postedTime' dateTime={post.postedTime.toISOString()}>
                {post.postedTime.toISOString().substring(0,10)}
              </time>
            </header>
            <CustomHtml content={post.body} markdown={true}/>
          </div>
        );
      }
    }

    return result;
  }

});

module.exports = BlogPost;
