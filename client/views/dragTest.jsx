'use strict'
const React = require('react')
const DragOrder = require('./dragOrder.jsx')

class DragTest extends React.Component {
  state = {
    list: ['en', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio', 'elva', 'tolv']
  };
  constructor(props) {
    super(props)
    this._onDragStart = this._onDragStart.bind(this)
    this._onDragEnter = this._onDragEnter.bind(this)
    this._onDragEnd = this._onDragEnd.bind(this)
  }
  _onDragStart(draggingIndex) {
    console.log(`Started dragging ${draggingIndex} (${this.state.list[draggingIndex]}).`)
  }
  _onDragEnter(draggingIndex, draggedOverIndex, orderList) {
    console.log(`Dragged ${draggingIndex} (${this.state.list[draggingIndex]}) over ${draggedOverIndex} (${this.state.list[draggedOverIndex]}).`)
  }
  _onDragEnd(draggingIndex, draggedOverIndex, orderList) {
    console.log(`Dropped ${draggingIndex} (${this.state.list[draggingIndex]}) on ${draggedOverIndex} (${this.state.list[draggedOverIndex]}).`)
    // Change order of list accordingly.
    this.setState({
      list: orderList(this.state.list)
    })
  }
  render() {
    const {
      state: {
        list
      },
      _onDragStart: onDragStart,
      _onDragEnter: onDragEnter,
      _onDragEnd: onDragEnd
    } = this
    return (
      <DragOrder
        id='dragTest'
        className='anArbitraryClass'
        onDragStart={onDragStart}
        onDragEnter={onDragEnter}
        onDragEnd={onDragEnd}
      >
        {list.map((item, index) =>
          <div key={index}>
            {item}
          </div>
        )}
      </DragOrder>
    )
  }
}

module.exports = DragTest
