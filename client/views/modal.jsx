'use strict'
const React = require('react')

const Modal = (props) => (
  <div className='modalWrapper'>
    <div className='modal'>
      {props.children}
    </div>
  </div>
)

module.exports = Modal
