'use strict'
const React = require('react')
const setWindowTitle = require('../utilities/setWindowTitle')

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

module.exports = NotFound
