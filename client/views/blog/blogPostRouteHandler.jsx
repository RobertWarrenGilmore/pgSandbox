'use strict'
const React = require('react')
const BusyIndicator = require('../busyIndicator.jsx')
const Post = require('./post.jsx')
const Editor = require('./editor.jsx')
const sanitiseHtml = require('sanitize-html')
const processUserHtml = require('../../utilities/processUserHtml')
const { connect } = require('react-redux')
const blogActions = require('../../flux/blog/actions')
const Helmet = require('react-helmet')

class BlogPost extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      busy: false,
      editingPost: null,
      authorIds: null, // a list of all users that can be set as authors of a post
      error: null
    }
    this._loadPost = this._loadPost.bind(this)
    this._onEditorSave = this._onEditorSave.bind(this)
    this._onEditorRevert = this._onEditorRevert.bind(this)
    this._onEditorDelete = this._onEditorDelete.bind(this)
    this._onEditorChange = this._onEditorChange.bind(this)
    this._enterEditMode = this._enterEditMode.bind(this)
    this._exitEditMode = this._exitEditMode.bind(this)
  }

  _loadPost(postId) {
    this.setState({
      busy: true,
      error: null
    })
    return this.props.loadPost(this.props.params.postId)
      .catch(err => this.setState({
        error: err.message || err
      })).finally(() => this.setState({
        busy: false
      }))
  }

  _onEditorSave() {
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
    let existingId = this.props.params.postId
    if (existingId === 'new') {
      existingId = undefined
    }
    return this.props.savePost(post, existingId)
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

  _onEditorRevert() {
    this.setState({
      editingPost: this.props.posts[this.props.params.postId],
      error: null
    })
  }

  _onEditorDelete() {
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
    if (this.props.authUser && this.props.authUser.admin && !this.props.authors.length) {
      this.setState({
        busy: true
      })
      return this.props.loadAuthors()
        .catch(err => this.setState({
          error: err.message || err
        })).then(() => this.setState({
          busy: false
        }))
    }
  }

  _exitEditMode() {
    this.setState({
      editingPost: null
    })
  }

  _onEditorChange(editingPost) {
    this.setState({
      editingPost
    })
  }

  componentWillMount() {
    return Promise.resolve()
      .then(() => {
        if (!this.props.posts[this.props.params.postId]) {
          return this._loadPost(this.props.params.postId)
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
      if (!nextProps.posts[nextProps.params.postId]) {
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
    let windowTitle
    if (existingPost) {
      let parsedTitle = processUserHtml(existingPost.title, {
        inline: true
      }).__html
      let fullySanitisedTitle = sanitiseHtml(
        parsedTitle,
        {allowedTags: []}
      )
      windowTitle = fullySanitisedTitle
    }

    // editor layout
    if (this.state.editingPost) {
      result = (
        <div id='blogPost'>
          <Helmet title={windowTitle}/>
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
          <Editor
            post={this.state.editingPost}
            error={this.state.error}
            exists={!!existingPost}
            disabled={this.state.busy}
            onChange={this._onEditorChange}
            onDelete={this._onEditorDelete}
            onSave={this._onEditorSave}
            onRevert={this._onEditorRevert}
            authors={this.props.authors}/>
          <Post post={this.state.editingPost} showPreview={true}/>
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
      if ((authorisedToBlog || isAdmin) && !existingPost) {
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
        <div id='blogPost'>
          <Helmet title={windowTitle}/>
          <div className='actions'>
            {editButton}
          </div>
          <Post post={post}/>
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
    state = state.asMutable({deep: true})
    let authUser
    if (state.auth.id && state.users) {
      authUser = state.users[state.auth.id]
    }
    let authors = state.blog.authorIds.map(id => state.users[id])
    return {
      authUser,
      posts: state.blog.posts,
      users: state.users,
      authors
    }
  },
  function mapDispatchToProps(dispatch) {
    return {
      savePost: (post, previousId) => dispatch(blogActions.savePost(post, previousId)),
      loadPost: (id) => dispatch(blogActions.loadPost(id)),
      deletePost: (id) => dispatch(blogActions.deletePost(id)),
      loadAuthors: () => dispatch(blogActions.loadAuthors())
    }
  }
)(BlogPost)

module.exports = wrapped
