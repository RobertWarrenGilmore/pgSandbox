'use strict'
const React = require('react')
const BusyIndicator = require('../busyIndicator.jsx')

class InfoPageEditor extends React.Component {
  constructor(props) {
    super(props)
    this._onChange = this._onChange.bind(this)
  }
  _onChange() {
    this.props.onChange({
      title: this.refs.title.value || '',
      body: this.refs.body.value || ''
    })
  }
  render() {
    const page = this.props.page
    return (
      <div className='editor'>
        <label>
          title
          <h1>
            <input
              type='text'
              ref='title'
              value={page.title}
              disabled={this.props.busy}
              onChange={this._onChange}/>
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
            value={page.body}
            disabled={this.props.busy}
            onChange={this._onChange}/>
        </label>
        {this.props.error
          ? (
            <p className='error'>
              {this.props.error}
            </p>
          ) : null}
        {this.props.busy
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
          <button
            id='revert'
            key='revert'
            disabled={this.props.disabled}
            onClick={this.props.onRevert}>
            <span className='icon-undo2'/>
            &nbsp;
            revert
          </button>
        </div>
      </div>
    )
  }
}
InfoPageEditor.defaultProps = {
  page: null,
  disabled: false,
  onChange: () => {},
  onSave: () => {},
  onRevert: () => {}
}

module.exports = InfoPageEditor
