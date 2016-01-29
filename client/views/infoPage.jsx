'use strict';
var React = require('react');
var BusyIndicator = require('./busyIndicator.jsx');
var ajax = require('../utilities/ajax');
var auth = require('../flux/auth');
var processUserHtml = require('../utilities/processUserHtml');
var TitleMixin = require('./titleMixin');
var sanitiseHtml = require('sanitize-html');

var InfoPage = React.createClass({

  mixins: [TitleMixin()],

  getInitialState: function() {
    return {
      runningRequest: false,
      content: null,
      editingContent: null,
      error: null,
      authUser: null
    };
  },

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

  _loadContent: function (pageId) {
    this._cancelRequest();
    if (pageId === '/') {
      pageId = '/home';
    }
    var r = ajax({
      method: 'GET',
      uri: '/api/infoPages' + pageId,
      json: true,
      auth: auth.getCredentials()
    });
    this.setState({
      runningRequest: r, // Hold on to the Ajax promise in case we need to cancel it later.
      error: null
    });
    this.setTitle();
    var self = this;
    return r.then(function (response) {
      if (response.statusCode === 200) {
        self.setState({
          runningRequest: null,
          content: response.body
        });
        self.setTitle(sanitiseHtml(response.body.title, {allowedTags: []}));
      } else {
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

  _saveContent: function() {
    this._cancelRequest();
    var pageId = this.props.location.pathname;
    if (pageId === '/') {
      pageId = '/home';
    }
    var page = this.state.editingContent;
    var r = ajax ({
      method: 'PUT',
      uri: '/api/infoPages' + pageId,
      body: page,
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
          editingContent: response.body,
          content: response.body
        });
        self.setTitle(sanitiseHtml(response.body.title, {allowedTags: []}));
      } else {
        self.setState({
          runningRequest: null,
          error: response.body
        });
      }
      return null;
    }).catch(function(error) {
      self.setState({
        runningRequest: null,
        error: error.message
      });
    });
  },

  _revertContent: function () {
    this.setState({
      editingContent: this.state.content,
      error: null
    });
  },

  _enterEditMode: function () {
    this.setState({
      error: null,
      editingContent: this.state.content || {
        title: '',
        body: ''
      }
    });
  },

  _exitEditMode: function () {
    this.setState({
      editingContent: null
    });
  },

  _updateEditingContent: function () {
    this.setState({
      editingContent: {
        title: this.refs.title.value,
        body: this.refs.body.value
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
      return self._loadContent(self.props.location.pathname);
    });
  },

  componentWillReceiveProps: function(nextProps) {
    var pageIdChanged = nextProps.params.location.pathname !== this.props.location.pathname;
    if (pageIdChanged) {
      // TODO Confirm leave without saving changes if in edit mode and unsaved.
      this._exitEditMode();
      this._loadContent(nextProps.params.location.pathname);
    }
  },

  componentWillUnmount: function() {
    this._cancelRequest();
  },

  render: function() {
    var result = null;
    var isAdmin = this.state.authUser && this.state.authUser.admin;

    // editor layout
    if (this.state.editingContent) {
      var content = this.state.editingContent;
      result = (
        <div id='infoPage'>
          <div className='actions'>
            <button
              className='edit'
              disabled={!!this.state.runningRequest}
              onClick={this._exitEditMode}>
              <span className='icon-pencil'/>
              &nbsp;
              stop editing
            </button>
          </div>
          <div id='editor'>
            <label>
              title
              <h1>
                <input
                  type='text'
                  ref='title'
                  value={content.title}
                  disabled={!!this.state.runningRequest}
                  onChange={this._updateEditingContent}/>
              </h1>
            </label>
            <p className='info'>
              Format using <a href='https://gist.github.com/jonschlinkert/5854601'>Markdown</a>.<br/><em>_italic_ *italic*</em><br/><strong>__bold__ **bold**</strong><br/>[This text will become a link.](http://example.com)
            </p>
            <label>
              body
              <textarea
                className='body'
                ref='body'
                value={content.body}
                disabled={!!this.state.runningRequest}
                onChange={this._updateEditingContent}/>
            </label>
            {this.state.error
              ? (
                <p className='error'>
                  {this.state.error}
                </p>
              ) : null}
            {this.state.runningRequest
              ? (
                <div>
                  <BusyIndicator/>
                  saving
                </div>
              ) : null}
            <div className='actions'>
              <button
                id='save'
                disabled={!!this.state.runningRequest}
                onClick={this._saveContent}
                className='highlighted'>
                <span className='icon-floppy-disk'/>
                &nbsp;
                save
              </button>
              <button
                id='revert'
                disabled={!!this.state.runningRequest}
                onClick={this._revertContent}>
                <span className='icon-undo2'/>
                &nbsp;
                revert
              </button>
            </div>
          </div>
          <div id='demo' className='infoPage' dangerouslySetInnerHTML={processUserHtml(content.body, {
            sanitise: false
          })}/>
        </div>
      );

    // busy layout
    } else if (this.state.runningRequest) {
      result = (
        <div id='infoPage' className='message'>
          <BusyIndicator/>
          loading
        </div>
      );

    // error layout
    } else if (this.state.error) {
      result = (
        <div id='infoPage' className='message'>
          <p className='error'>
            {this.state.error}
          </p>
        </div>
      );

    // content layout
    } else {
      var content = this.state.content || {
        title: '',
        body: ''
      };
      var editButton = null;
      if (isAdmin) {
        editButton = (
          <button
            className='edit'
            disabled={!!this.state.runningRequest}
            onClick={this._enterEditMode}>
            <span className='icon-pencil'/>
            &nbsp;
            edit
          </button>
        );
      }
      result = (
        <div id='infoPage'>
          <div className='actions'>
            {editButton}
          </div>
          <div dangerouslySetInnerHTML={processUserHtml(content.body, {
            sanitise: false
          })}/>
        </div>
      );
    }

    return result;
  }

});

module.exports = InfoPage;
