'use strict'
const _ = require('lodash')
const React = require('react')
const appScroll = require('../utilities/appScroll')

class ScrollCaboose extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      visible: false
    }
    this._onScroll = this._onScroll.bind(this)
    this._checkVisibility = this._checkVisibility.bind(this)
  }
  componentDidMount() {
    appScroll.addListener(this._onScroll)
    this._checkVisibility()
  }
  componentWillUnmount() {
    appScroll.removeListener(this._onScroll)
  }
  componentDidUpdate(prevProps, prevState) {
    if (!_.isEqual(prevProps, this.props)) {
      this._checkVisibility()
    }
    if (prevState.visible !== this.state.visible) {
      this.props.visibilityListener(this.state.visible)
    }
  }
  _onScroll() {
    this._checkVisibility()
  }
  _checkVisibility() {
    const element = this.refs.caboose
    if (element) {
      const verticallyVisible =
        element.getBoundingClientRect().top <= window.innerHeight &&
        element.getBoundingClientRect().bottom >= 0
      const horizontallyVisible =
        element.getBoundingClientRect().left <= 0 &&
        element.getBoundingClientRect().right <= window.innerWidth
      const bothVisible = verticallyVisible && horizontallyVisible
      const chosenVisible = {
        [ScrollCaboose.DIRECTION_VERTICAL]: verticallyVisible,
        [ScrollCaboose.DIRECTION_HORIZONTAL]: horizontallyVisible,
        [ScrollCaboose.DIRECTION_BOTH]: bothVisible
      }[this.props.direction]
      this.setState({
        visible: chosenVisible
      })
    } else {
      return false
    }
  }
  render() {
    return (
      <div className='scrollCaboose' ref='caboose'>
        {this.props.children}
      </div>
    )
  }
}
ScrollCaboose.DIRECTION_BOTH = 'DIRECTION_BOTH'
ScrollCaboose.DIRECTION_VERTICAL = 'DIRECTION_VERTICAL'
ScrollCaboose.DIRECTION_HORIZONTAL = 'DIRECTION_HORIZONTAL'
ScrollCaboose.propTypes = {
  visibilityListener: React.PropTypes.func,
  direction: React.PropTypes.oneOf([
    ScrollCaboose.DIRECTION_BOTH,
    ScrollCaboose.DIRECTION_VERTICAL,
    ScrollCaboose.DIRECTION_HORIZONTAL
  ])
}
ScrollCaboose.defaultProps = {
  visibilityListener: (visibility) => {
    console.log('became ' + (visibility ? 'visible' : 'invisible'))
  },
  direction: ScrollCaboose.DIRECTION_VERTICAL
}
module.exports = ScrollCaboose
