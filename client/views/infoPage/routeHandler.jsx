'use strict'
const React = require('react')
const BusyIndicator = require('../busyIndicator.jsx')
const processUserHtml = require('../../utilities/processUserHtml')
const sanitiseHtml = require('sanitize-html')
const appInfo = require('../../../appInfo.json')
const Helmet = require('react-helmet')
const { connect } = require('react-redux')
const infoPageActions = require('../../flux/infoPages/actions')

const getPageId = (props) => {
  let pageId = props.location.pathname.slice(1)
  if (pageId === '') {
    pageId = 'home'
  }
  return pageId
}

const getPage = (props) => props.pages[getPageId(props)]

class InfoPage extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      busy: false,
      editingContent: null,
      error: null
    }
    this._loadContent = this._loadContent.bind(this)
    this._saveContent = this._saveContent.bind(this)
    this._revertContent = this._revertContent.bind(this)
    this._enterEditMode = this._enterEditMode.bind(this)
    this._exitEditMode = this._exitEditMode.bind(this)
    this._updateEditingContent = this._updateEditingContent.bind(this)
  }

  _loadContent(pageId) {
    this.setState({
      busy: true,
      error: null
    })
    return this.props.loadPage(getPageId(this.props))
      .catch(err => this.setState({
        error: err.message || err
      })).finally(() => this.setState({
        busy: false
      }))
  }

  _saveContent() {
    this.setState({
      busy: true,
      error: null
    })
    return this.props.savePage(this.state.editingContent, getPageId(this.props))
      .then(() => this.setState({
        editingPost: getPage(this.props)
      })).catch(err => this.setState({
        error: err.message || err
      })).finally(() => this.setState({
        busy: false
      }))
  }

  _revertContent() {
    this.setState({
      editingContent: getPage(this.props),
      error: null
    })
  }

  _enterEditMode() {
    this.setState({
      error: null,
      editingContent: getPage(this.props) || {
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

  componentWillMount() {
    if (!getPage(this.props)) {
      return this._loadContent(getPageId(this.props))
    }
  }

  componentWillReceiveProps(nextProps) {
    const pageIdChanged = getPageId(nextProps) !== getPageId(this.props)
    if (pageIdChanged) {
      // TODO Confirm leave without saving changes if in edit mode and unsaved.
      this._exitEditMode()
      this._loadContent(getPageId(nextProps))
    }
  }

  render() {
    let result = null
    const isAdmin = this.props.authUser && this.props.authUser.admin
    const existingPage = getPage(this.props) || {
      title: '',
      body: ''
    }
    let parsedTitle = processUserHtml(existingPage.title, {
      inline: true
    }).__html
    let fullySanitisedTitle = sanitiseHtml(
      parsedTitle,
      {allowedTags: []}
    )
    const titleElement = fullySanitisedTitle.length ? (
      <Helmet title={fullySanitisedTitle}/>
    ) : (
      <Helmet
        title=''
        titleTemplate={appInfo.name}/>
    )

    // editor layout
    if (this.state.editingContent) {
      const content = this.state.editingContent
      result = (
        <div id='infoPage'>
          {titleElement}
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
              title
              <h1>
                <input
                  type='text'
                  ref='title'
                  value={content.title}
                  disabled={this.state.busy}
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
                disabled={this.state.busy}
                onChange={this._updateEditingContent}/>
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
                onClick={this._saveContent}
                className='highlighted'>
                <span className='icon-floppy-disk'/>
                &nbsp;
                save
              </button>
              <button
                id='revert'
                disabled={this.state.busy}
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
    } else if (this.state.busy) {
      result = (
        <div id='infoPage' className='message'>
          <Helmet title='loading'/>
          <BusyIndicator/>
          loading
        </div>
      )

    // error layout
    } else if (this.state.error) {
      result = (
        <div id='infoPage' className='message'>
          <Helmet title='error'/>
          <p className='error'>
            {this.state.error}
          </p>
        </div>
      )

    // content layout
    } else {
      let editButton = null
      if (isAdmin) {
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
        <div id='infoPage'>
          {titleElement}
          <div className='actions'>
            {editButton}
          </div>
          <div dangerouslySetInnerHTML={processUserHtml(existingPage.body, {
            sanitise: false
          })}/>
        </div>
      )
    }

    return result
  }

}
InfoPage.propTypes = {
  authUser: React.PropTypes.object,
  pages: React.PropTypes.object
}
InfoPage.defaultProps = {
  authUser: null,
  pages: null
}

const wrapped = connect(
  function mapStateToProps(state) {
    let authUser
    if (state.auth.id && state.users) {
      authUser = state.users[state.auth.id]
    }
    return {
      authUser,
      pages: state.infoPages.pages
    }
  },
  function mapDispatchToProps(dispatch) {
    return {
      loadPage: (id) => dispatch(infoPageActions.loadPage(id)),
      savePage: (page, id) => dispatch(infoPageActions.savePage(page, id))
    }
  }
)(InfoPage)

module.exports = wrapped
