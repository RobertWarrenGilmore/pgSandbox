var React = require('react');
var BusyIndicator = require('./busyIndicator.jsx');
var ReactRouter = require('react-router');
var Link = ReactRouter.Link;
var TitleMixin = require('./titleMixin');
var ajax = require('../utilities/ajax');
var sanitiseHtml = require('sanitize-html');
var auth = require('../flux/auth');
var Promise = require('bluebird');
var appInfo = require('../../appInfo.json');
var processUserHtml = require('../utilities/processUserHtml');

var BlogPost = React.createClass({

  mixins: [TitleMixin('blog')],

  getInitialState: function() {
    return {
      runningRequest: null,
      editingPost: null,
      post: null,
      exists: null, // Boolean; true means the post exists; false means no such post; null means we don't whether the post exists, for instance before the request has finished or if there was an error
      error: null,
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
        return null;
      }).catch(function (error) {
        self.setState({
          error: error.message
        });
      });
    } else {
      return Promise.resolve();
    }
  },

  /*
   * Load the post indicated by the URL parameter.
   * This method is meant to be run every time the URL changes and every time we
   *   leave edit mode.
   */
  _loadPost: function () {
    this._cancelRequest();
    var r = ajax({
      method: 'GET',
      uri: '/api/blog/' + this.props.params.postId,
      json: true,
      auth: auth.getCredentials()
    });
    this.setState({
      runningRequest: r, // Hold on to the Ajax promise in case we need to cancel it later.
      error: null,
      exists: null
    });
    this.setTitle('blog');
    var self = this;
    return r.then(function (response) {
      if (response.statusCode === 200) {
        self.setState({
          runningRequest: null,
          post: response.body,
          exists: true
        });
        if (response.body.title) {
          self.setTitle(sanitiseHtml(response.body.title, {allowedTags: []}));
        }
      } else {
        if (response.statusCode === 404) {
          self.setState({
            exists: false
          });
        }
        self.setState({
          runningRequest: null,
          error: response.body
        });
      }
      return null;
    }).catch(function (error) {
      self.setState({
        runningRequest: null,
        error: error.message
      });
    });
  },

  /*
   * Save the post being edited. If the post exists already, this means PUT;
   *   otherwise POST.
   */
  _savePost: function() {
    this._cancelRequest();
    var post = {
      id: this.state.editingPost.id,
      title: this.state.editingPost.title,
      author: {
        id: this.state.editingPost.author.id
      },
      preview: this.state.editingPost.preview,
      body: this.state.editingPost.body,
      postedTime: this.state.editingPost.postedTime,
      active: this.state.editingPost.active
    };
    var r = ajax ({
      method: this.state.exists ? 'PUT' : 'POST',
      uri: '/api/blog/' + this.props.params.postId,
      body: post,
      json: true,
      auth: auth.getCredentials()
    });
    this.setState({
      runningRequest: r,
      error: null
    });
    var self = this;
    return r.then(function (response) {
      if (response.statusCode === 200 || response.statusCode === 201) {
        self.setState({
          runningRequest: null,
          editingPost: response.body,
          post: response.body,
          exists: true
        });
        self.setTitle(sanitiseHtml(response.body.title, {allowedTags: []}));
        if (post.id !== self.props.params.postId) {
          self.props.history.replaceState({
            editing: true
          }, '/blog/' + post.id);
        }
      } else {
        self.setState({
          runningRequest: null,
          error: response.body
        });
        self.setTitle('blog');
      }
      return null;
    }).catch(function(error) {
      self.setState({
        runningRequest: null,
        error: error.message
      });
      self.setTitle('blog');
    });
  },

  _revertPost: function () {
    this.setState({
      editingPost: this.state.post
    });
  },

  _enterEditMode: function () {
    var editingPost = this.state.post || {
      id: this.props.params.postId,
      title: '',
      postedTime: new Date(),
      preview: null,
      body: '',
      author: {
        id: this.state.authUser.id
      },
      active: false
    };
    this.setState({
      error: null,
      editingPost: editingPost
    });
  },

  _exitEditMode: function () {
    this.setState({
      editingPost: null
    });
  },

  _updateEditingPost: function () {
    this.setState({
      editingPost: {
        id: this.refs.id.value,
        title: this.refs.title.value,
        preview: this.refs.preview.value ? this.refs.preview.value : null,
        body: this.refs.body.value,
        active: this.refs.active.checked,
        postedTime: this.state.post.postedTime, // TODO No editing postedTime (yet!).
        author: this.state.post.author // TODO No editing author (yet!).
      }
    });
  },

  _cancelRequest: function () {
    // Cancel any Ajax that's currently running.
    if (this.state.runningRequest) {
      this.state.runningRequest.cancel();
    }
  },

  componentWillMount: function() {
    var self = this;
    this._loadAuthUser().then(function () {
      self._loadPost();
    });
    if (this.props.location.state && this.props.location.state.editing) {
      this._enterEditMode();
    }
  },

  componentWillReceiveProps: function(nextProps) {
    var postIdChanged = nextProps.params.postId !== this.props.params.postId;
    if (postIdChanged) {
      // TODO Confirm leave without saving changes if in edit mode and unsaved.
      if (!nextProps.location.state || !nextProps.location.state.editing) {
        this._exitEditMode();
      }
      this._loadPost();
    }
  },

  componentWillUnmount: function() {
    this._cancelRequest();
  },

  render: function() {
    var result = null;
    var postIsHidden = this.state.post && (this.state.authUser === null || this.state.post.author.id !== this.state.authUser.id) && !this.state.post.active;
    var authorisedToBlog = this.state.authUser && this.state.authUser.authorisedToBlog;

    // editor layout
    if (this.state.editingPost) {
      var post = this.state.editingPost;
      result = (
        <div id='blogPost'>
          <button
            className='edit'
            disabled={!!this.state.runningRequest}
            onClick={this._exitEditMode}>
            stop editing
          </button>
          <div id='editor'>
            <label>
              url
              <div className='urlLine'>
                {appInfo.host}
                /blog/
                <input
                  type='text'
                  ref='id'
                  value={post.id}
                  onChange={this._updateEditingPost}/>
              </div>
            </label>
            <label title='An unpublished post is visible only to you. A published post is visible to the world.'>
              <input
                type='checkbox'
                ref='active'
                checked={post.active}
                onChange={this._updateEditingPost}/>
              published
            </label>
            <header>
              <h1>
                <input
                  type='text'
                  ref='title'
                  value={post.title}
                  onChange={this._updateEditingPost}/>
              </h1>
            </header>
            <label>
              preview
              <textarea
                className='preview'
                ref='preview'
                placeholder={post.body.split(/(\r?\n){2,}/)[0].trim()}
                value={post.preview}
                onChange={this._updateEditingPost}/>
            </label>
            <label>
              body
              <textarea
                className='body'
                ref='body'
                value={post.body}
                onChange={this._updateEditingPost}/>
            </label>
            <div className='actions'>
              <button
                id='save'
                disabled={!!this.state.runningRequest}
                onClick={this._savePost}
                className='highlighted'>
                save
              </button>
              <button
                id='revert'
                disabled={!!this.state.runningRequest}
                onClick={this._revertPost}>
                revert
              </button>
            </div>
          </div>
          <div id='demo' className='blogPost'>
            <header>
              <h1 dangerouslySetInnerHTML={processUserHtml(post.title, {
                inline: true
              })}/>
              <p className='byLine'>
                by&nbsp;
                <Link to={'/users/' + post.author.id}>
                  {post.author.givenName} {post.author.familyName}
                </Link>
              </p>
              <p className='postedTime'>
                <time dateTime={post.postedTime}>
                  {post.postedTime.substring(0,10)}
                </time>
              </p>
            </header>
            <div className='body' dangerouslySetInnerHTML={processUserHtml(post.body)}/>
          </div>
        </div>
      );

    // busy layout
    } else if (this.state.runningRequest) {
      result = (
        <div id='blogPost' className='message'>
          <BusyIndicator/>
          'loading'
        </div>
      );

    // error layout
    } else if (this.state.error || postIsHidden || !this.state.exists) {
      var editButton = null;
      if (authorisedToBlog && this.state.exists === false) {
        editButton = (
          <button
            className='edit'
            disabled={!!this.state.runningRequest}
            onClick={this._enterEditMode}>
            create a post here
          </button>
        );
      }
      result = (
        <div id='blogPost' className='message'>
          {editButton ||
            <p className='error'>
              {this.state.error || 'This post is not published.'}
            </p>
          }
        </div>
      );

    // post layout
    } else {
      var post = this.state.post;
      var editButton = null;
      var postIsOwn = this.state.authUser && post.author.id === this.state.authUser.id;
      if (authorisedToBlog && (postIsOwn || this.state.exists === false)) {
        editButton = (
          <button
            className='edit'
            disabled={!!this.state.runningRequest}
            onClick={this._enterEditMode}>
            edit
          </button>
        );
      }
      result = (
        <div id='blogPost' className='blogPost'>
          <header>
            {editButton}
            <h1 dangerouslySetInnerHTML={processUserHtml(post.title, {
              inline: true
            })}/>
            <p className='byLine'>
              by&nbsp;
              <Link to={'/users/' + post.author.id}>
                {post.author.givenName} {post.author.familyName}
              </Link>
            </p>
            <p className='postedTime'>
              <time dateTime={post.postedTime}>
                {post.postedTime.substring(0,10)}
              </time>
            </p>
          </header>
          <div className='body' dangerouslySetInnerHTML={processUserHtml(post.body)}/>
        </div>
      );
    }
    return result;
  }

});

module.exports = BlogPost;
