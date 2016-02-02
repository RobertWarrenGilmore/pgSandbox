'use strict'
const _ = require('lodash')
const React = require('react')
const BusyIndicator = require('./busyIndicator.jsx')
const { Link } = require('react-router')
const sanitiseHtml = require('sanitize-html')
const Modal = require('./modal.jsx')
const appInfo = require('../../appInfo.json')
const processUserHtml = require('../utilities/processUserHtml')
const { connect } = require('react-redux')
const blogActions = require('../flux/blog/actions')
const usersActions = require('../flux/users/actions')
const Helmet = require('react-helmet')

class BlogPost extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      busy: false,
      editingPost: null,
      blogUserIds: null, // a list of all users that can be set as authors of a post
      error: null,
      confirmingDelete: false
    }
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
  }

  _loadBlogUsers() {
    this.setState({
      busy: true,
      error: null
    })
    this.props.searchUsers({authorisedToBlog: true})
      .then(ids => this.setState({
        blogUserIds: ids
      })).catch(err => this.setState({
        error: err.message || err
      })).finally(() => this.setState({
        busy: false
      }))
  }

  _loadPost(postId) {
    this.setState({
      busy: true,
      error: null
    })
    this.props.loadPost(this.props.params.postId)
      .catch(err => this.setState({
        error: err.message || err
      })).finally(() => this.setState({
        busy: false
      }))
  }

  _savePost() {
    this.setState({
      busy: true,
      error: null
    })
    let post = {
      id: this.state.editingPost.id,
      title: this.state.editingPost.title,
      author: {
        id: this.state.editingPost.author.id
      },
      preview: this.state.editingPost.preview,
      body: this.state.editingPost.body,
      postedTime: this.state.editingPost.postedTime,
      active: this.state.editingPost.active
    }
    this.props.savePost(post, this.props.params.postId)
      .then(() => {
        this.setState({
          editingPost: this.props.posts[post.id]
        })
        if (post.id !== this.props.params.postId) {
          this.props.history.replaceState({
            editing: true
          }, '/blog/' + this.state.editingPost.id)
        }
      }).catch(err => this.setState({
        error: err.message || err
      })).finally(() => this.setState({
        busy: false
      }))
  }

  _revertPost() {
    this.setState({
      editingPost: this.props.posts[this.props.params.postId],
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
    this.setState({
      busy: true,
      error: null
    })
    this.props.deletePost(this.props.params.postId)
      .then(() => this.setState({
        editingPost: null
      })).catch(err => this.setState({
        error: err.message || err
      })).finally(() => this.setState({
        busy: false,
        confirmingDelete: false
      }))
  }

  _enterEditMode() {
    let editingPost = this.props.posts[this.props.params.postId] || {
      id: this.props.params.postId,
      title: '',
      postedTime: new Date().toISOString(),
      preview: null,
      body: '',
      author: {
        id: this.props.authUser.id,
        givenName: this.props.authUser.givenName,
        familyName: this.props.authUser.familyName
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
    if (this.state.blogUserIds) {
      author = this.props.users[_.find(this.state.blogUserIds, (id) => {
        return this.refs.author.value == id
      })]
    }
    this.setState({
      editingPost: {
        id: this.refs.id.value,
        title: this.refs.title.value,
        preview: this.refs.preview.value ? this.refs.preview.value : null,
        body: this.refs.body.value || '',
        active: this.refs.active.checked,
        postedTime: this.refs.postedTime.value,
        author
      }
    })
  }

  componentWillMount() {
    return Promise.resolve()
      .then(() => {
        if (!this.props.posts[this.props.params.postId]) {
          return this._loadPost(this.props.params.postId)
        }
      })
      .then(() => {
        if (this.props.authUser && this.props.authUser.admin) {
          return this._loadBlogUsers()
        }
      })
      // Enter edit mode if we arrived on this page with a truthy .editing in the location state.
      .then(() => {
        if (this.props.location.state && this.props.location.state.editing) {
          this._enterEditMode()
        }
      })
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
      if (!this.props.posts[nextProps.params.postId]) {
        this._loadPost(nextProps.params.postId)
      }
    }
  }

  render() {
    let result = null
    const existingPost = this.props.posts[this.props.params.postId]
    const postIsHidden = existingPost && (this.props.authUser === null || existingPost.author.id !== this.props.authUser.id) && !existingPost.active
    const authorisedToBlog = this.props.authUser && this.props.authUser.authorisedToBlog
    const isAdmin = this.props.authUser && this.props.authUser.admin
    let title
    if (existingPost) {
      let parsedTitle = processUserHtml(existingPost.title, {
        inline: true
      }).__html
      let fullySanitisedTitle = sanitiseHtml(
        parsedTitle,
        {allowedTags: []}
      )
      title = fullySanitisedTitle
    }

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
              disabled={this.state.busy}
              onClick={this._deletePost}>
              <span className='icon-bin'/>
              &nbsp;
              delete
            </button>
            <button
              disabled={this.state.busy}
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
          <Helmet title={title}/>
          {this.state.confirmingDelete ? deletionModal : null}
          <div className='actions'>
            <button
              className='edit'
              disabled={this.state.busy}
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
                  disabled={this.state.busy}
                  onChange={this._updateEditingPost}/>
              </div>
            </label>
            <label title='An unpublished post is visible only to admins and its author. A published post is visible to the public.'>
              <input
                type='checkbox'
                ref='active'
                checked={post.active}
                disabled={this.state.busy}
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
                  disabled={this.state.busy}
                  onChange={this._updateEditingPost}/>
              </h1>
            </label>
            {this.state.blogUserIds ? (
              <label>
                author
                <select
                  ref='author'
                  value={post.author.id}
                  disabled={this.state.busy}
                  onChange={this._updateEditingPost}>
                  {this.state.blogUserIds.map((id) => (
                    <option value={id}>
                      {this.props.users[id].givenName} {this.props.users[id].familyName}
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
                disabled={this.state.busy}
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
                disabled={this.state.busy}
                onChange={this._updateEditingPost}/>
            </label>
            <label>
              body
              <textarea
                className='body'
                ref='body'
                value={post.body}
                disabled={this.state.busy}
                onChange={this._updateEditingPost}/>
            </label>
            {this.state.error
              ? (
                <p className='error'>
                  {this.state.error}
                </p>
              ) : null}
            {this.state.busy
              ? (
                <div>
                  <BusyIndicator/>
                  saving
                </div>
              ) : null}
            <div className='actions'>
              <button
                id='save'
                disabled={this.state.busy}
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
                    disabled={this.state.busy}
                    onClick={this._revertPost}>
                    <span className='icon-undo2'/>
                    &nbsp;
                    revert
                  </button>,
                  <button
                    id='delete'
                    disabled={this.state.busy}
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
    } else if (this.state.busy) {
      result = (
        <div id='blogPost' className='message'>
          <Helmet title='blog'/>
          <BusyIndicator/>
          loading
        </div>
      )

    // error layout
    } else if (this.state.error || (postIsHidden && !isAdmin) || !existingPost) {
      let editButton = null
      if ((authorisedToBlog || isAdmin) && this.state.exists === false) {
        editButton = (
          <button
            className='edit'
            disabled={this.state.busy}
            onClick={this._enterEditMode}>
            <span className='icon-plus'/>
            &nbsp;
            create a post here
          </button>
        )
      }
      result = (
        <div id='blogPost' className='message'>
          <Helmet title='blog'/>
          {editButton ||
            <p className='error'>
              {this.state.error || 'This post is not published.'}
            </p>
          }
        </div>
      )

    // post layout
    } else {
      const post = existingPost
      let editButton = null
      const postIsOwn = this.props.authUser && post.author.id === this.props.authUser.id
      if ((authorisedToBlog && postIsOwn) || isAdmin) {
        editButton = (
          <button
            className='edit'
            disabled={this.state.busy}
            onClick={this._enterEditMode}>
            <span className='icon-pencil'/>
            &nbsp;
            edit
          </button>
        )
      }
      result = (
        <div id='blogPost' className='blogPost'>
          <Helmet title={title}/>
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
BlogPost.propTypes = {
  authUser: React.PropTypes.object,
  posts: React.PropTypes.object,
  users: React.PropTypes.object
}
BlogPost.defaultProps = {
  authUser: null,
  posts: null,
  users: null
}

const wrapped = connect(
  function mapStateToProps(state) {
    let authUser
    if (state.auth.id && state.users) {
      authUser = state.users[state.auth.id]
    }
    return {
      authUser,
      posts: state.blog.posts,
      users: state.users
    }
  },
  function mapDispatchToProps(dispatch) {
    return {
      savePost: (post, previousId) => dispatch(blogActions.savePost(post, previousId)),
      loadPost: (id) => dispatch(blogActions.loadPost(id)),
      deletePost: (id) => dispatch(blogActions.deletePost(id)),
      searchUsers: (query) => dispatch(usersActions.searchUsers(query))
    }
  }
)(BlogPost)

module.exports = wrapped
