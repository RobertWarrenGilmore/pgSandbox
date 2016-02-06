'use strict'
const React = require('react')
const Helmet = require('react-helmet')

const NotFound = (props) => (
  <div className='message'>
    <Helmet title='not found'/>
    <h1>
      no such page
    </h1>
    <p>
      That page wasn't found.
    </p>
  </div>
)

module.exports = NotFound
