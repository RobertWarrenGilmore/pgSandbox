'use strict'
const React = require('react')
const classnames = require('classnames')

const UserProfile = props => {
  const { user, brief = false } = props
  return (
    <div className={classnames({
      userProfile: true,
      brief
    })}>
      <header>
        <h1 className='name'>
          {user.givenName} {user.familyName}
        </h1>
      </header>
      {(user.emailAddress) ? (
        <p className='emailAddress'>
          {user.emailAddress}
        </p>
      ): null}
    </div>
  )
}

module.exports = UserProfile
