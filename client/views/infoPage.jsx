'use strict'
const React = require('react')
const BusyIndicator = require('./busyIndicator.jsx')
const ajax = require('../utilities/ajax')
const auth = require('../flux/auth')
const processUserHtml = require('../utilities/processUserHtml')
const setWindowTitle = require('../utilities/setWindowTitle')
const sanitiseHtml = require('sanitize-html')

class InfoPage extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      runningRequest: false,
      content: null,
      editingContent: null,
      error: null,
      authUser: null
    }
    this._loadAuthUser = this._loadAuthUser.bind(this)
    this._loadContent = this._loadContent.bind(this)
    this._saveContent = this._saveContent.bind(this)
    this._revertContent = this._revertContent.bind(this)
    this._enterEditMode = this._enterEditMode.bind(this)
    this._exitEditMode = this._exitEditMode.bind(this)
    this._updateEditingContent = this._updateEditingContent.bind(this)
    this._cancelRequest = this._cancelRequest.bind(this)
  }

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
        return null
      }).catch((error) => {
        this.setState({
          error: error.message
        })
      })
    } else {
      return Promise.resolve()
    }
  }

  _loadContent(pageId) {
    this._cancelRequest()
    if (pageId === '/') {
      pageId = '/home'
    }
    let r = ajax({
      method: 'GET',
      uri: '/api/infoPages' + pageId,
      json: true,
      auth: auth.getCredentials()
    })
    this.setState({
      runningRequest: r, // Hold on to the Ajax promise in case we need to cancel it later.
      error: null
    })
    setWindowTitle()
    return r.then((response) => {
      if (response.statusCode === 200) {
        this.setState({
          runningRequest: null,
          content: response.body
        })
        setWindowTitle(sanitiseHtml(response.body.title, {allowedTags: []}))
      } else {
        this.setState({
          runningRequest: null,
          error: response.body
        })
      }
      return null
    }).catch((error) => {
      this.setState({
        runningRequest: null,
        error: error.message
      })
    })
  }

  _saveContent() {
    this._cancelRequest()
    let pageId = this.props.location.pathname
    if (pageId === '/') {
      pageId = '/home'
    }
    let page = this.state.editingContent
    let r = ajax ({
      method: 'PUT',
      uri: '/api/infoPages' + pageId,
      body: page,
      json: true,
      auth: auth.getCredentials()
    })
    this.setState({
      runningRequest: r,
      error: null
    })
    return r.then((response) => {
      if (response.statusCode === 200 || response.statusCode === 201) {
        this.setState({
          runningRequest: null,
          editingContent: response.body,
          content: response.body
        })
        setWindowTitle(sanitiseHtml(response.body.title, {allowedTags: []}))
      } else {
        this.setState({
          runningRequest: null,
          error: response.body
        })
      }
      return null
    }).catch((error) => {
      this.setState({
        runningRequest: null,
        error: error.message
      })
    })
  }

  _revertContent() {
    this.setState({
      editingContent: this.state.content,
      error: null
    })
  }

  _enterEditMode() {
    this.setState({
      error: null,
      editingContent: this.state.content || {
        title: '',
        body: ''
      }
    })
  }

  _exitEditMode() {
    this.setState({
      editingContent: null
    })
  }

  _updateEditingContent() {
    this.setState({
      editingContent: {
        title: this.refs.title.value,
        body: this.refs.body.value
      }
    })
  }

  _cancelRequest() {
    // Cancel any Ajax that's currently running.
    if (this.state.runningRequest) {
      this.state.runningRequest.cancel()
    }
  }

  componentWillMount() {
    this._loadAuthUser().then(() => {
      return this._loadContent(this.props.location.pathname)
    })
  }

  componentWillReceiveProps(nextProps) {
    const pageIdChanged = nextProps.params.location.pathname !== this.props.location.pathname
    if (pageIdChanged) {
      // TODO Confirm leave without saving changes if in edit mode and unsaved.
      this._exitEditMode()
      this._loadContent(nextProps.params.location.pathname)
    }
  }

  componentWillUnmount() {
    this._cancelRequest()
  }

  render() {
    let result = null
    const isAdmin = this.state.authUser && this.state.authUser.admin

    // editor layout
    if (this.state.editingContent) {
      const content = this.state.editingContent
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
      )

    // busy layout
    } else if (this.state.runningRequest) {
      result = (
        <div id='infoPage' className='message'>
          <BusyIndicator/>
          loading
        </div>
      )

    // error layout
    } else if (this.state.error) {
      result = (
        <div id='infoPage' className='message'>
          <p className='error'>
            {this.state.error}
          </p>
        </div>
      )

    // content layout
    } else {
      const content = this.state.content || {
        title: '',
        body: ''
      }
      let editButton = null
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
        )
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
      )
    }

    return result
  }

}

module.exports = InfoPage
