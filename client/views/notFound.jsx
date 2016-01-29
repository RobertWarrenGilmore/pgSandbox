'use strict'
import React from 'react'
import setWindowTitle from '../utilities/setWindowTitle'

class NotFound extends React.Component {
  constructor(props) {
    super(props)
  }
  componentDidMount() {
    setWindowTitle('page not found')
  }
  componentWillUnmount() {
    setWindowTitle()
  }
  render() {
    return (
      <div className='message'>
        <h1>
          no such page
        </h1>
        <p>
          That page wasn't found.
        </p>
      </div>
    )
  }
}

export default NotFound
