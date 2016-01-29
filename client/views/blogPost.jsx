'use strict'
const _ = require('lodash')
const React = require('react')
const BusyIndicator = require('./busyIndicator.jsx')
const {Link} = require('react-router')
const setWindowTitle = require('../utilities/setWindowTitle')
const ajax = require('../utilities/ajax')
const sanitiseHtml = require('sanitize-html')
const auth = require('../flux/auth')
const Modal = require('./modal.jsx')
const Promise = require('bluebird')
const appInfo = require('../../appInfo.json')
const processUserHtml = require('../utilities/processUserHtml')

class BlogPost extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      runningRequest: null,
      editingPost: null,
      post: null,
      exists: null, // Boolean true means the post exists false means no such post null means we don't whether the post exists, for instance before the request has finished or if there was an error
      blogUsers: null, // a list of all users that can be set as authors of a post
      error: null,
      confirmingDelete: false,
      authUser: null
    }
    this._loadAuthUser = this._loadAuthUser.bind(this)
    this._loadBlogUsers = this._loadBlogUsers.bind(this)
    this._loadPost = this._loadPost.bind(this)
    this._savePost = this._savePost.bind(this)
    this._revertPost = this._revertPost.bind(this)
    this._askDeletePost = this._askDeletePost.bind(this)
    this._stopDeletePost = this._stopDeletePost.bind(this)
    this._deletePost = this._deletePost.bind(this)
    this._enterEditMode = this._enterEditMode.bind(this)
    this._exitEditMode = this._exitEditMode.bind(this)
    this._updateEditingPost = this._updateEditingPost.bind(this)
    this._cancelRequest = this._cancelRequest.bind(this)
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

  _loadBlogUsers() {
    this._cancelRequest()
    let r = ajax({
      method: 'GET',
      uri: '/api/users',
      json: true,
      auth: auth.getCredentials()
    })
    this.setState({
      runningRequest: r,
      error: null
    })
    return r.then((response) => {
      if (response.statusCode === 200) {
        let blogUsers = response.body.map((user) =>
          _.pick(user, [
            'id',
            'givenName',
            'familyName'
          ])
        )
        this.setState({
          blogUsers: blogUsers
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
    }).finally(() => {
      this.setState({
        runningRequest: null
      })
    })
  }

  /*
   * Load the post indicated by the URL parameter.
   * This method is meant to be run every time the URL changes and every time we
   *   leave edit mode.
   */
  _loadPost(postId) {
    this._cancelRequest()
    let r = ajax({
      method: 'GET',
      uri: '/api/blog/' + postId,
      json: true,
      auth: auth.getCredentials()
    })
    this.setState({
      runningRequest: r, // Hold on to the Ajax promise in case we need to cancel it later.
      error: null,
      exists: null
    })
    setWindowTitle('blog')
    return r.then((response) => {
      if (response.statusCode === 200) {
        this.setState({
          runningRequest: null,
          post: response.body,
          exists: true
        })
        let parsedTitle = processUserHtml(response.body.title, {
          inline: true
        }).__html
        let fullySanitisedTitle = sanitiseHtml(
          parsedTitle,
          {allowedTags: []}
        )
        setWindowTitle(fullySanitisedTitle)
      } else {
        if (response.statusCode === 404) {
          this.setState({
            exists: false
          })
        }
        this.setState({
          runningRequest: null,
          error: response.body.message || response.body
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

  /*
   * Save the post being edited. If the post exists already, this means PUT
   *   otherwise POST.
   */
  _savePost() {
    this._cancelRequest()
    let post = {
      id: this.state.exists ? this.state.editingPost.id : undefined,
      title: this.state.editingPost.title,
      author: this.state.editingPost.author ? {
        id: this.state.editingPost.author.id
      } : undefined,
      preview: this.state.editingPost.preview,
      body: this.state.editingPost.body,
      postedTime: this.state.editingPost.postedTime,
      active: this.state.editingPost.active
    }
    let r = ajax ({
      method: this.state.exists ? 'PUT' : 'POST',
      uri: '/api/blog/' + (this.state.exists ? this.props.params.postId : this.state.editingPost.id),
      body: post,
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
          editingPost: response.body,
          post: response.body,
          exists: true
        })
        let parsedTitle = processUserHtml(response.body.title, {
          inline: true
        }).__html
        let fullySanitisedTitle = sanitiseHtml(
          parsedTitle,
          {allowedTags: []}
        )
        setWindowTitle(fullySanitisedTitle)
        if (this.state.editingPost.id !== this.props.params.postId) {
          this.props.history.replaceState({
            editing: true
          }, '/blog/' + this.state.editingPost.id)
        }
      } else {
        this.setState({
          runningRequest: null,
          error: response.body.message || response.body
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

  _revertPost() {
    this.setState({
      editingPost: this.state.post,
      error: null
    })
  }

  _askDeletePost() {
    this.setState({
      confirmingDelete: true
    })
  }

  _stopDeletePost() {
    this.setState({
      confirmingDelete: false
    })
  }

  _deletePost() {
    this._cancelRequest()
    let r = ajax ({
      method: 'DELETE',
      uri: '/api/blog/' + this.props.params.postId,
      auth: auth.getCredentials()
    })
    this.setState({
      runningRequest: r,
      error: null
    })
    return r.then((response) => {
      if (response.statusCode === 200) {
        this.setState({
          runningRequest: null,
          editingPost: null,
          confirmingDelete: false,
          post: null,
          exists: false
        })
        setWindowTitle('blog')
      } else {
        this.setState({
          runningRequest: null,
          confirmingDelete: false,
          error: response.body
        })
      }
      return null
    }).catch((error) => {
      this.setState({
        runningRequest: null,
        confirmingDelete: false,
        error: error.message
      })
      setWindowTitle('blog')
    })
  }

  _enterEditMode() {
    let editingPost = this.state.post || {
      id: this.props.params.postId,
      title: '',
      postedTime: new Date().toISOString(),
      preview: null,
      body: '',
      author: {
        id: this.state.authUser.id,
        givenName: this.state.authUser.givenName,
        familyName: this.state.authUser.familyName
      },
      active: false
    }
    this.setState({
      error: null,
      editingPost: editingPost
    })
  }

  _exitEditMode() {
    this.setState({
      editingPost: null
    })
  }

  _updateEditingPost() {
    let author = this.state.editingPost.author
    if (this.state.blogUsers) {
      author = _.find(this.state.blogUsers, (user) => {
        return this.refs.author.value == user.id
      })
    }
    this.setState({
      editingPost: {
        id: this.refs.id.value,
        title: this.refs.title.value,
        preview: this.refs.preview.value ? this.refs.preview.value : null,
        body: this.refs.body.value || '',
        active: this.refs.active.checked,
        postedTime: this.refs.postedTime.value,
        author: author
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
      if (this.state.authUser && this.state.authUser.admin) {
        return this._loadBlogUsers()
      }
    }).then(() => {
      return this._loadPost(this.props.params.postId)
    })
    // Enter edit mode if we arrived on this page with a truthy .editing in the location state.
    .then(() => {
      if (this.props.location.state && this.props.location.state.editing) {
        this._enterEditMode()
      }
    })
  }

  componentDidMount() {
    setWindowTitle('blog')
  }

  componentWillReceiveProps(nextProps) {
    let postIdChanged = nextProps.params.postId !== this.props.params.postId
    if (postIdChanged) {
      // TODO Confirm leave without saving changes if in edit mode and unsaved.
      // Exit edit mode if the new location state doesn't include a truthy .editing.
      if (!nextProps.location.state || !nextProps.location.state.editing) {
        this._exitEditMode()
      // Otherwise, redirect to this page without that location state so that a refresh won't return us to the editor.
      } else {
        this.props.history.replaceState(null, nextProps.location.pathname)
      }
      this._loadPost(nextProps.params.postId)
    }
  }

  componentWillUnmount() {
    this._cancelRequest()
    setWindowTitle()
  }

  render() {
    let result = null
    const postIsHidden = this.state.post && (this.state.authUser === null || this.state.post.author.id !== this.state.authUser.id) && !this.state.post.active
    const authorisedToBlog = this.state.authUser && this.state.authUser.authorisedToBlog
    const isAdmin = this.state.authUser && this.state.authUser.admin

    // editor layout
    if (this.state.editingPost) {
      const post = this.state.editingPost
      let preview = post.preview
      // If no preview was provided, use the first paragraph of the body.
      if (!preview) {
        preview = post.body.split(/(\r?\n){2,}/)[0].trim()
      }
      let deletionModal = (
        <Modal>
          <p>
            Are you sure that you want to delete the post?
          </p>
          <div className='actions'>
            <button
              className='highlighted'
              disabled={!!this.state.runningRequest}
              onClick={this._deletePost}>
              <span className='icon-bin'/>
              &nbsp;
              delete
            </button>
            <button
              disabled={!!this.state.runningRequest}
              onClick={this._stopDeletePost}>
              <span className='icon-cancel-circle'/>
              &nbsp;
              cancel
            </button>
          </div>
        </Modal>
      )
      result = (
        <div id='blogPost'>
          {this.state.confirmingDelete ? deletionModal : null}
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
              url
              <div className='urlLine'>
                {appInfo.host}
                /blog/
                <input
                  type='text'
                  className='id'
                  ref='id'
                  value={post.id}
                  disabled={!!this.state.runningRequest}
                  onChange={this._updateEditingPost}/>
              </div>
            </label>
            <label title='An unpublished post is visible only to admins and its author. A published post is visible to the public.'>
              <input
                type='checkbox'
                ref='active'
                checked={post.active}
                disabled={!!this.state.runningRequest}
                onChange={this._updateEditingPost}/>
              published
            </label>
            <p className='info'>
              Format text fields using <a href='https://gist.github.com/jonschlinkert/5854601'>Markdown</a>.<br/><em>_italic_ *italic*</em><br/><strong>__bold__ **bold**</strong><br/>[This text will become a link.](http://example.com)
            </p>
            <label>
              title
              <h1>
                <input
                  type='text'
                  ref='title'
                  value={post.title}
                  disabled={!!this.state.runningRequest}
                  onChange={this._updateEditingPost}/>
              </h1>
            </label>
            {this.state.blogUsers ? (
              <label>
                author
                <select
                  ref='author'
                  value={post.author.id}
                  disabled={!!this.state.runningRequest}
                  onChange={this._updateEditingPost}>
                  {this.state.blogUsers.map((user) => (
                    <option value={user.id}>
                      {user.givenName} {user.familyName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label>
              date (yyyy-mm-dd)
              <input
                type='text'
                ref='postedTime'
                value={post.postedTime.substring(0,10)}
                disabled={!!this.state.runningRequest}
                onChange={this._updateEditingPost}/>
            </label>
            <label>
              preview
              <textarea
                className='preview'
                ref='preview'
                placeholder={'The preview is shown instead of the body when the post is in a list of posts. It defaults to the first paragraph of the body:\n\n'
                  + preview}
                value={post.preview}
                disabled={!!this.state.runningRequest}
                onChange={this._updateEditingPost}/>
            </label>
            <label>
              body
              <textarea
                className='body'
                ref='body'
                value={post.body}
                disabled={!!this.state.runningRequest}
                onChange={this._updateEditingPost}/>
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
                onClick={this._savePost}
                className='highlighted'>
                <span className='icon-floppy-disk'/>
                &nbsp;
                save
              </button>
              {
                this.state.exists ? [
                  <button
                    id='revert'
                    disabled={!!this.state.runningRequest}
                    onClick={this._revertPost}>
                    <span className='icon-undo2'/>
                    &nbsp;
                    revert
                  </button>,
                  <button
                    id='delete'
                    disabled={!!this.state.runningRequest}
                    onClick={this._askDeletePost}>
                    <span className='icon-bin'/>
                    &nbsp;
                    delete
                  </button>
                ] : null
              }
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
            <div className='preview'>
              <div dangerouslySetInnerHTML={processUserHtml(preview)}/>
              {(preview.length < post.body.trim().length)
                ? (
                  <p>
                    Read more...
                  </p>
              ) : null}
            </div>
            <div className='body' dangerouslySetInnerHTML={processUserHtml(post.body)}/>
          </div>
        </div>
      )

    // busy layout
    } else if (this.state.runningRequest) {
      result = (
        <div id='blogPost' className='message'>
          <BusyIndicator/>
          loading
        </div>
      )

    // error layout
    } else if (this.state.error || (postIsHidden && !isAdmin) || !this.state.exists) {
      let editButton = null
      if ((authorisedToBlog || isAdmin) && this.state.exists === false) {
        editButton = (
          <button
            className='edit'
            disabled={!!this.state.runningRequest}
            onClick={this._enterEditMode}>
            <span className='icon-plus'/>
            &nbsp;
            create a post here
          </button>
        )
      }
      result = (
        <div id='blogPost' className='message'>
          {editButton ||
            <p className='error'>
              {this.state.error || 'This post is not published.'}
            </p>
          }
        </div>
      )

    // post layout
    } else {
      const post = this.state.post
      let editButton = null
      const postIsOwn = this.state.authUser && post.author.id === this.state.authUser.id
      if ((authorisedToBlog && postIsOwn) || isAdmin) {
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
        <div id='blogPost' className='blogPost'>
          <div className='actions'>
            {editButton}
          </div>
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
      )
    }
    return result
  }

}

module.exports = BlogPost
