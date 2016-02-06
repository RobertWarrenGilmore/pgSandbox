'use strict'
const React = require('react')
const BusyIndicator = require('../busyIndicator.jsx')
const Editor = require('./editor.jsx')
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
      editingPage: null,
      error: null
    }
    this._loadPage = this._loadPage.bind(this)
    this._onEditorSave = this._onEditorSave.bind(this)
    this._onEditorRevert = this._onEditorRevert.bind(this)
    this._onEditorChange = this._onEditorChange.bind(this)
    this._enterEditMode = this._enterEditMode.bind(this)
    this._exitEditMode = this._exitEditMode.bind(this)
  }

  _loadPage(pageId) {
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

  _onEditorSave() {
    this.setState({
      busy: true,
      error: null
    })
    return this.props.savePage(this.state.editingPage, getPageId(this.props))
      .then(() => this.setState({
        editingPost: getPage(this.props)
      })).catch(err => this.setState({
        error: err.message || err
      })).finally(() => this.setState({
        busy: false
      }))
  }

  _onEditorRevert() {
    this.setState({
      editingPage: getPage(this.props),
      error: null
    })
  }

  _onEditorChange(page) {
    this.setState({
      editingPage: page
    })
  }

  _enterEditMode() {
    this.setState({
      error: null,
      editingPage: getPage(this.props) || {
        title: '',
        body: ''
      }
    })
  }

  _exitEditMode() {
    this.setState({
      editingPage: null
    })
  }

  componentWillMount() {
    if (!getPage(this.props)) {
      return this._loadPage(getPageId(this.props))
    }
  }

  componentWillReceiveProps(nextProps) {
    const pageIdChanged = getPageId(nextProps) !== getPageId(this.props)
    if (pageIdChanged) {
      // TODO Confirm leave without saving changes if in edit mode and unsaved.
      this._exitEditMode()
      this._loadPage(getPageId(nextProps))
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
    if (this.state.editingPage) {
      const page = this.state.editingPage
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
          <Editor
            page={page}
            error={this.state.error}
            disabled={this.state.busy}
            onChange={this._onEditorChange}
            onSave={this._onEditorSave}
            onRevert={this._onEditorRevert}/>
          <div id='demo' className='infoPage' dangerouslySetInnerHTML={processUserHtml(page.body, {
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

    // page layout
    } else {
      result = (
        <div id='infoPage'>
          {titleElement}
          {isAdmin ? (
            <div className='actions'>
              <button
                className='edit'
                disabled={this.state.busy}
                onClick={this._enterEditMode}>
                <span className='icon-pencil'/>
                &nbsp;
                edit
              </button>
            </div>
          ) : null}
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
  pages: React.PropTypes.object,
  loadPage: React.PropTypes.func,
  savePage: React.PropTypes.func
}
InfoPage.defaultProps = {
  authUser: null,
  pages: null,
  loadPost: null,
  savePost: null
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
