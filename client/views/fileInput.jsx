'use strict'
const React = require('react')
const classnames = require('classnames')
const BusyIndicator = require('./busyIndicator.jsx')

class FileInput extends React.Component {
  static proptTypes = {
    onChoose: React.PropTypes.func, // Fires when the input chooses a new set of files.
    onLoad: React.PropTypes.func, // Fires when all of the chosen files have loaded and are available as data URLs.
    accept: React.PropTypes.string,
    multiple: React.PropTypes.bool,
    disabled: React.PropTypes.bool,
    highlighted: React.PropTypes.bool
  };

  static defaultProps = {
    onChoose: null,
    onLoad: null,
    accept: null,
    multiple: false,
    disabled: false,
    highlighted: false
  };

  state = {
    busy: false
  };

  constructor(props) {
    super(props)
    this._onChange = this._onChange.bind(this)
  }

  _onChange({target: {files}}) {
    const {
      onChoose,
      onLoad
    } = this.props
    if (files.length) {
      this.setState({
        busy: true
      })
      const filePromises = Array.from(files).map(file =>
        new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = ({target: {result: dataUrl}}) => resolve(dataUrl)
          reader.onerror = ({target: {result: error}}) => reject(error)
          reader.readAsDataURL(file)
        })
      )
      onChoose(filePromises)
      Promise.all(filePromises).then(dataUrls => {
        onLoad(dataUrls)
        this.setState({
          busy: false
        })
      })
    }
  }

  render() {
    const {
      props: {
        children,
        accept,
        multiple,
        disabled,
        highlighted,
        ...restProps
      },
      state: {
        busy
      },
      _onChange
    } = this
    return (
      <label {...restProps}>
        {busy ? (
          <div>
            <BusyIndicator/>
            loading
          </div>
        ): null}
        {children || (
          <div className={classnames({
            button: true,
            disabled: disabled || busy,
            highlighted
          })}>
            <span className='icon-upload'/>
            &nbsp;
            choose a file
          </div>
        )}
        <input
          type='file'
          onChange={_onChange}
          accept={accept}
          multiple={multiple}
          disabled={disabled || busy}
          style={{
            display: 'none'
          }}
          />
      </label>
    )
  }
}

module.exports = FileInput
