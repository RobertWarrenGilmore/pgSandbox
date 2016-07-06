'use strict'
const React = require('react')
const Modal = require('../modal.jsx')
const BusyIndicator = require('../busyIndicator.jsx')
const appInfo = require('../../../appInfo.json')
const update = require('react-addons-update')
const DateTimePicker = require('../dateTimePicker.jsx')
const ErrorMessage = require('../errorMessage.jsx')

class BlogEditor extends React.Component {
  static defaultProps = {
    post: null,
    error: null,
    exists: true,
    disabled: false,
    onChange: () => {},
    onDelete: () => {},
    onSave: () => {},
    onRevert: () => {},
    authors: null,
    appTimeZone: null
  }
  state = {
    confirmingDelete: false
  };
  constructor(props) {
    super(props)
    this._onChangeField = this._onChangeField.bind(this)
    this._onConfirmDelete = this._onConfirmDelete.bind(this)
    this._onCancelDelete = this._onCancelDelete.bind(this)
    this._onDelete = this._onDelete.bind(this)
  }
  _onChangeField(fieldName) {
    return value => this.props.onChange(update(this.props.post, {
      [fieldName]: {$set: value}
    }))
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
    const {
      props: {
        post,
        disabled,
        authors,
        error,
        busy,
        exists,
        timeZone,
        onSave,
        onRevert
      },
      state: {
        confirmingDelete
      },
      _onDelete,
      _onCancelDelete,
      _onConfirmDelete,
      _onChangeField
    } = this
    const previewFromBody = post.body.split(/(\r?\n){2,}/)[0].trim()
    return (
      <div className='editor'>
        {confirmingDelete ? (
          <Modal>
            <p>
              Are you sure that you want to delete the post?
            </p>
            <div className='actions'>
              <button
                className='highlighted'
                disabled={disabled}
                onClick={_onDelete}>
                <span className='icon-bin'/>
                &nbsp;
                delete
              </button>
              <button
                disabled={disabled}
                onClick={_onCancelDelete}>
                <span className='icon-cancel-circle'/>
                &nbsp;
                cancel
              </button>
            </div>
          </Modal>
        ) : null}
        <label>
          url
          <div className='urlLine'>
            {appInfo.host}
            /blog/
            <input
              type='text'
              className='id'
              value={post.id}
              disabled={disabled}
              onChange={({target: value}) => _onChangeField('id')(value)}
              />
          </div>
        </label>
        <label title='An unpublished post is visible only to admins and its author. A published post is visible to the public.'>
          <input
            type='checkbox'
            checked={post.active}
            disabled={disabled}
            onChange={({target: checked}) => _onChangeField('active')(checked)}
            />
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
              value={post.title}
              disabled={disabled}
              onChange={({target: value}) => _onChangeField('title')(value)}
              />
          </h1>
        </label>
        {authors ? (
          <label>
            author
            <select
              value={post.author.id}
              disabled={disabled}
              onChange={({target: value}) => _onChangeField('author')({id: value})}
              >
              {authors.map((author) => (
                <option value={author.id} key={'author_option_' + author.id}>
                    {((author.givenName || '') + ' ' + (author.familyName || '')).trim()}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          date and time
          <DateTimePicker
            value={post.postedTime}
            timeZone={timeZone}
            disabled={disabled}
            precision='minute'
            onChange={(value) => {
              _onChangeField('timeZone')(timeZone)
              _onChangeField('postedTime')(value)
            }}
            />
        </label>
        <label>
          preview
          <textarea
            className='preview'
            placeholder={'The preview is shown instead of the body when the post is in a list of posts. It defaults to the first paragraph of the body:\n\n'
              + previewFromBody}
            value={post.preview}
            disabled={disabled}
            onChange={({target: value}) => _onChangeField('preview')(value)}
            />
        </label>
        <label>
          body
          <textarea
            className='body'
            ref='body'
            value={post.body}
            disabled={disabled}
            onChange={({target: value}) => _onChangeField('body')(value)}
            />
        </label>
        {error
          ? (
            <ErrorMessage error={error}/>
          ) : null}
        {busy
          ? (
            <div>
              <BusyIndicator/>
              saving
            </div>
          ) : null}
        <div className='actions'>
          <button
            id='save'
            disabled={disabled}
            onClick={onSave}
            className='highlighted'
            >
            <span className='icon-floppy-disk'/>
            &nbsp;
            save
          </button>
          {
            exists ? [
              <button
                id='revert'
                key='revert'
                disabled={disabled}
                onClick={onRevert}
                >
                <span className='icon-undo2'/>
                &nbsp;
                revert
              </button>,
              <button
                id='delete'
                key='delete'
                disabled={disabled}
                onClick={_onConfirmDelete}
                >
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

module.exports = BlogEditor
