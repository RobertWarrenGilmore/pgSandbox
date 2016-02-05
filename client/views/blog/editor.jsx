'use strict'
const React = require('react')
const Modal = require('../modal.jsx')
const BusyIndicator = require('../busyIndicator.jsx')
const appInfo = require('../../../appInfo.json')

class BlogEditor extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      confirmingDelete: false
    }
    this._onChange = this._onChange.bind(this)
    this._onConfirmDelete = this._onConfirmDelete.bind(this)
    this._onCancelDelete = this._onCancelDelete.bind(this)
    this._onDelete = this._onDelete.bind(this)
  }
  _onChange() {
    this.props.onChange({
      id: this.refs.id.value,
      title: this.refs.title.value,
      preview: this.refs.preview.value ? this.refs.preview.value : null,
      body: this.refs.body.value || '',
      active: this.refs.active.checked,
      postedTime: this.refs.postedTime.value,
      author: this.props.post.authors[this.refs.author.value]
    })
  }
  _onConfirmDelete() {
    this.setState({
      confirmingDelete: true
    })
  }
  _onCancelDelete() {
    this.setState({
      confirmingDelete: false
    })
  }
  _onDelete() {
    this.setState({
      confirmingDelete: false
    })
    this.props.onDelete()
  }
  render() {
    const post = this.props.post
    const previewFromBody = post.body.split(/(\r?\n){2,}/)[0].trim()
    const deletionModal = (
      <Modal>
        <p>
          Are you sure that you want to delete the post?
        </p>
        <div className='actions'>
          <button
            className='highlighted'
            disabled={this.props.disabled}
            onClick={this._onDelete}>
            <span className='icon-bin'/>
            &nbsp;
            delete
          </button>
          <button
            disabled={this.props.disabled}
            onClick={this._onCancelDelete}>
            <span className='icon-cancel-circle'/>
            &nbsp;
            cancel
          </button>
        </div>
      </Modal>
    )
    return (
      <div className='editor'>
        {this.state.confirmingDelete ? deletionModal : null}
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
              disabled={this.props.disabled}
              onChange={this._onChange}/>
          </div>
        </label>
        <label title='An unpublished post is visible only to admins and its author. A published post is visible to the public.'>
          <input
            type='checkbox'
            ref='active'
            checked={post.active}
            disabled={this.props.disabled}
            onChange={this._onChange}/>
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
              disabled={this.props.disabled}
              onChange={this._onChange}/>
          </h1>
        </label>
        {this.props.authors ? (
          <label>
            author
            <select
              ref='author'
              value={post.author.id}
              disabled={this.props.disabled}
              onChange={this._onChange}>
              {this.props.authors.map((author) => (
                <option value={author.id} key={'author_option_' + author.id}>
                    {((author.givenName || '') + ' ' + (author.familyName || '')).trim()}
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
            disabled={this.props.disabled}
            onChange={this._onChange}/>
        </label>
        <label>
          preview
          <textarea
            className='preview'
            ref='preview'
            placeholder={'The preview is shown instead of the body when the post is in a list of posts. It defaults to the first paragraph of the body:\n\n'
              + previewFromBody}
            value={post.preview}
            disabled={this.props.disabled}
            onChange={this._onChange}/>
        </label>
        <label>
          body
          <textarea
            className='body'
            ref='body'
            value={post.body}
            disabled={this.props.disabled}
            onChange={this._onChange}/>
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
            disabled={this.props.disabled}
            onClick={this.props.onSave}
            className='highlighted'>
            <span className='icon-floppy-disk'/>
            &nbsp;
            save
          </button>
          {
            this.props.exists ? [
              <button
                id='revert'
                key='revert'
                disabled={this.props.disabled}
                onClick={this.props.onRevert}>
                <span className='icon-undo2'/>
                &nbsp;
                revert
              </button>,
              <button
                id='delete'
                key='delete'
                disabled={this.props.disabled}
                onClick={this._onConfirmDelete}>
                <span className='icon-bin'/>
                &nbsp;
                delete
              </button>
            ] : null
          }
        </div>
      </div>
    )
  }
}
BlogEditor.defaultProps = {
  post: null,
  exists: true,
  disabled: false,
  onChange: () => {},
  onDelete: () => {},
  onSave: () => {},
  onRevert: () => {},
  authors: null
}

module.exports = BlogEditor
