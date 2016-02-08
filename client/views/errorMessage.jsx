'use strict'
const React = require('react')

const ErrorMessage = props => {
  const { error } = props
  let errorMessage
  if (Array.isArray(error)) {
    errorMessage = error.join(' ')
  } else if (error.message) {
    errorMessage = error.message
  } else {
    errorMessage = error
  }
  if (errorMessage) {
    return (
      <p className='error'>
        {errorMessage}
      </p>
    )
  } else {
    return <noscript/> // grumble grumble stupid hack; React whines if we return null.
  }
}

module.exports = ErrorMessage
