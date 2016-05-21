'use strict'
const React = require('react')
const classnames = require('classnames')
const { connect } = require('react-redux')

const Avatar = props => {
  const {
    id,
    updatedTime, // from flux
    data,
    small = false
  } = props

  let src = data
  if (data === null) {
    src = `${window.location.origin}/assets/images/defaultAvatar.jpg`
  } else if (data !== undefined) {
    src = data
  } else {
    src = `${window.location.origin}/api/users/${id}/avatar.jpg`
    if (updatedTime !== undefined)
      src += `?updatedTime=${updatedTime}`
  }

  return (
    <img
      className={classnames({
        avatar: true,
        small
      })}
      src={src}
      />
  )
}

const wrapped = connect(
  function mapStateToProps(state, ownProps) {
    state = state.asMutable({deep: true})
    const {
      id
    } = ownProps
    return {
      updatedTime: state.users.avatarUpdatedTimes[id]
    }
  }
)(Avatar)

module.exports = wrapped
