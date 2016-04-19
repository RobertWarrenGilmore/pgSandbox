'use strict'
const React = require('react')
const classnames = require('classnames')

const FileInput = props => {
  const {
    children,
    onChange,
    accept,
    multiple,
    disabled,
    highlighted,
    ...restProps
  } = props

  return (
    <label {...restProps}>
      {children}
      <div className={classnames({
        button: true,
        disabled: disabled,
        highlighted: highlighted
      })}>
        <span className='icon-upload'/>
        &nbsp;
        choose a file
      </div>
      <input
        type='file'
        onChange={onChange}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        style={{
          display: 'none'
        }}
        />
    </label>
  )
}

module.exports = FileInput
