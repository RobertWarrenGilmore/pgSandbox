'use strict'
const React = require('react')

// a non-mutating ordering function
const orderList = (draggingIndex, draggedOverIndex, list) => {
  const newList = list.slice()
  if(draggingIndex < draggedOverIndex)
    draggedOverIndex--
  newList.splice(draggedOverIndex, 0, newList.splice(draggingIndex, 1)[0])
  return newList
}

class DragOrder extends React.Component {

  static propTypes = {

    /**
     * This callback gives the parent a chance to react to the beginning of the
     * drag operation. It receives the dragged index as an argument.
     */
    onDragStart: React.PropTypes.func,

    /**
     * This callback gives the parent a chance to react to a new proposed drop
     * position. It receives the dragged index, the proposed drop position, and
     * an ordering function as arguments.
     */
    onDragEnter: React.PropTypes.func,

    /**
     * This callback gives the parent a chance to react to the end of the drag
     * operation. It receives the dragged index, the drop position, and an
     * ordering function as arguments. It's recommended that the parent react by
     * ordering the children if the drag was valid.
     */
    onDragEnd: React.PropTypes.func

  };

  static defaultProps = {
    onDragStart: draggingIndex => {},
    onDragEnter: (draggingIndex, draggedOverIndex, orderListFunc) => {},
    onDragEnd: (draggingIndex, draggedOverIndex, orderListFunc) => {}
  };

  state = {

    /**
     * The index of the list item being dragged. Null if not currently dragging.
     */
    draggingIndex: null,

    /**
     * The index of the list item over which we've last dragged. Null if we
     * haven't dragged over any list item.
     */
    draggedOverIndex: null

  };

  constructor(props) {
    super(props)
    this._onDragStart = this._onDragStart.bind(this)
    this._onDragEnter = this._onDragEnter.bind(this)
    this._onDragEnd = this._onDragEnd.bind(this)
  }

  _onDragStart(index) {
    return event => {
      event.stopPropagation()
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/html', event.target) // Firefox
      this.props.onDragStart(index)
      this.setState({
        draggingIndex: index
      })
    }
  }

  _onDragEnter(index) {
    return event => {
      event.stopPropagation()

      if (index === this.state.draggingIndex)
        return

      let draggedOverIndex = Math.min(index + 1, React.Children.count(this.props.children))

      // Shift upwards on upwards drag.
      if (index < this.state.draggedOverIndex)
        draggedOverIndex -= 1

      this.props.onDragEnter(
        this.state.draggingIndex,
        draggedOverIndex,
        list => orderList(this.state.draggingIndex, draggedOverIndex, list)
      )
      this.setState({
        draggedOverIndex,
        actualDraggedOverIndex: index
      })
    }
  }

  _onDragEnd(event) {
    event.stopPropagation()
    this.props.onDragEnd(
      this.state.draggingIndex,
      this.state.draggedOverIndex,
      list => orderList(this.state.draggingIndex, this.state.draggedOverIndex, list)
    )
    this.setState({
      draggingIndex: null,
      draggedOverIndex: null,
      actualDraggedOverIndex: null
    })
  }

  render() {
    const {
      state: {
        draggingIndex,
        draggedOverIndex
      },
      props: {
        id,
        className,
        children
      },
      _onDragStart: onDragStart,
      _onDragEnter: onDragEnter,
      _onDragEnd: onDragEnd
    } = this

    // let children = React.Children.toArray(this.props.children)
    let items = React.Children.map(children, (child, index) => {
      // Wrap each child in a list item.
      return (
        <li
          onDragStart={onDragStart(index)}
          onDragEnter={onDragEnter(index)}
          onDragEnd={onDragEnd}
          key={index}
        >
          {child}
          <div
            className='dragHandle'
            draggable={true}
          />
        </li>
      )
    })

    if (draggingIndex !== null && draggedOverIndex !== null) {
      // Move the dragged element to the dragging position.
      items[draggingIndex] = React.cloneElement(items[draggingIndex], {
        className: 'dragging'
      })
      items = orderList(draggingIndex, draggedOverIndex, items)
    }

    return (
      <ol id={id} className={`dragOrder ${className}`.trim()}>
        {items}
      </ol>
    )
  }
}

module.exports = DragOrder
