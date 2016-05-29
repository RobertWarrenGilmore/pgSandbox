'use strict'
const _ = require('lodash')
const React = require('react')
const ScrollCaboose = require('./scrollCaboose.jsx')
const BusyIndicator = require('./busyIndicator.jsx')
const validate = require('../../utilities/validate')
const ValidationError = validate.ValidationError

const ua = navigator.userAgent
// Are we redirecting after input or waiting until the user manually clicks "apply"?
// Borrowed from rackt/history/modules/DOMUtils.supportsHistory
const useManualApply =
  (
    (ua.indexOf('Android 2.') !== -1 || ua.indexOf('Android 4.0') !== -1) &&
    ua.indexOf('Mobile Safari') !== -1 && ua.indexOf('Chrome') === -1 && ua.indexOf('Windows Phone') === -1
  ) ||
  (ua.indexOf('CriOS') !== -1) ||
  !window.history ||
  !window.history.pushState

class GenericSearch extends React.Component {
  static propTypes = {
    // a React component that renders a set of filter controls
    filterControls: React.PropTypes.element,
    // a function that triggers a search in Flux
    performSearch: React.PropTypes.func.isRequired,
    // a function that takes a result and returns a React component representing it
    renderResult: React.PropTypes.func.isRequired,
    // a function that takes a proposed query and returns a valid query using defaults where appropriate
    correctUrlQuery: React.PropTypes.func,

    history: React.PropTypes.shape({
      replaceState: React.PropTypes.func.isRequired,
      pushState: React.PropTypes.func.isRequired
    }).isRequired,

    location: React.PropTypes.shape({
      query: React.PropTypes.object,
      pathname: React.PropTypes.string
    }).isRequired
  };
  static defaultProps = {
    filterControls: null,
    performSearch: null,
    renderResult: null,
    correctUrlQuery: query => query,
    history: null,
    location: null
  };
  state = {
    queryUpdateTimeout: null,
    workingQuery: this.props.location.query,
    endReached: false,
    scrolledToBottom: false,
    results: [],
    fieldErrors: null,
    error: null
  };
  constructor(props) {
    super(props)
    this._updateWorkingQuery = this._updateWorkingQuery.bind(this)
    this._correctUrlQuery = this._correctUrlQuery.bind(this)
    this._doSearch = this._doSearch.bind(this)
    this._loadMoreResults = this._loadMoreResults.bind(this)
    this._scrollCabooseListener = this._scrollCabooseListener.bind(this)
    this._onApply = this._onApply.bind(this)
    this._onRevert = this._onRevert.bind(this)
  }
  // Read the search parameters from the controls and use them to construct the working query.
  _updateWorkingQuery(parameters) {
    this.setState({
      workingQuery: parameters
    })
  }
  // Correct any errors in the provided query.
  _correctUrlQuery(query = {}, options = {}) {
    const {
      delayed,
      replace
    } = options
    const {
      props: {
        correctUrlQuery,
        history,
        location: {
          pathname,
          query: currentUrlQuery
        }
      },
      state: {
        queryUpdateTimeout
      }
    } = this

    const validQuery = correctUrlQuery(query)

    const navigate = history[replace
        ? 'replaceState'
        : 'pushState']

    const doRedirect = () => {
      // If the valid query differs from the current query, redirect to it.
      if (!_.isEqual(currentUrlQuery, validQuery)) {
        navigate(null, pathname, validQuery)
      }
      if (queryUpdateTimeout) {
        this.setState({
          queryUpdateTimeout: null
        })
      }
    }

    if (queryUpdateTimeout) {
      clearTimeout(queryUpdateTimeout)
    }
    if (delayed) {
      // Delay the query update to half a second after the most recent edit.
      this.setState({
        queryUpdateTimeout: setTimeout(doRedirect, 500)
      })
    } else {
      doRedirect()
    }
  }
  // Initiate a search.
  _doSearch(newSearch = true) {
    const {
      state: {
        results,
        endReached: stateEndReached
      }
    } = this
    const startingResults = newSearch ? [] : results
    const endReached = newSearch ? false : stateEndReached
    this.setState({
      busy: true,
      fieldErrors: null,
      error: null,
      results: startingResults,
      endReached
    })
    return this._loadMoreResults(startingResults)
      .catch(err => {
        if (err instanceof ValidationError)
          this.setState({
            endReached: true,
            fieldErrors: err.messages
          })
        else
          this.setState({
            endReached: true,
            error: err.message || err
          })
      })
      .then(() => this.setState({
        busy: false
      }))
  }
  // Continue a search.
  _loadMoreResults(existingResults = []) {
    const {
      state: {
        scrolledToBottom,
        endReached
      },
      props: {
        location,
        performSearch
      }
    } = this
    if (scrolledToBottom && !endReached) {
      const query = Object.assign({
        offset: existingResults.length
      }, location.query)
      return performSearch(query).then(returnedResults => {
        if (returnedResults.length) {
          const newResults = existingResults.concat(returnedResults)
          this.setState({
            results: newResults
          })
          // We keep adding this back into this promise chain until no more ids are returned.
          return this._loadMoreResults(newResults)
        } else {
          // Base case; no more results to add.
          this.setState({
            endReached: true
          })
        }
      })
    } else {
      return Promise.resolve()
    }
  }
  componentWillMount() {
    const {
      props: {
        location
      }
    } = this
    // Correct the URL query if it's invalid.
    this._correctUrlQuery(location.query, {
      replace: true,
      delayed: false
    })
  }
  componentDidMount() {
    this._doSearch()
  }
  componentWillReceiveProps(nextProps) {
    const {
      props: {
        location: currentLocation
      }
    } = this
    const {
      location: nextLocation
    } = nextProps
    const urlQueryChanged = !_.isEqual(nextLocation.query, currentLocation.query)
    if (urlQueryChanged) {
      this.setState({
        workingQuery: nextLocation.query
      })
    }
  }
  componentWillUpdate(nextProps, nextState) {
    const {
      state: {
        workingQuery: currentWorkingQuery
      }
    } = this
    const {
      workingQuery: nextWorkingQuery
    } = nextState
    const {
      location: {
        query: nextUrlQuery
      }
    } = nextProps
    if (!useManualApply) {
      const workingQueryChanged = !_.isEqual(nextWorkingQuery, currentWorkingQuery)
      const urlQueryIsBehindWorkingQuery = !_.isEqual(nextWorkingQuery, nextUrlQuery)
      if (workingQueryChanged && urlQueryIsBehindWorkingQuery) {
        this._correctUrlQuery(nextWorkingQuery, {
          replace: false,
          delayed: true
        })
      }
    }
  }
  componentDidUpdate(prevProps, prevState) {
    const {
      state: {
        scrolledToBottom,
        endReached,
        busy
      },
      props: {
        location: {
          query: currentUrlQuery
        }
      }
    } = this
    const {
      location: {
        query: prevUrlQuery
      }
    } = prevProps
    const urlQueryChanged = !_.isEqual(currentUrlQuery, prevUrlQuery)
    if (urlQueryChanged) {
      this._correctUrlQuery(currentUrlQuery, {
        replace: true,
        delayed: false
      })
      this._doSearch()
    } else if (scrolledToBottom && !endReached && !busy) {
      this._doSearch(false)
    }
  }
  _scrollCabooseListener(visible) {
    this.setState({
      scrolledToBottom: visible
    })
  }
  _onApply(event) {
    event.preventDefault()
    this._correctUrlQuery(this.state.workingQuery, {
      replace: false,
      delayed: false
    })
  }
  _onRevert(event) {
    event.preventDefault()
    this.setState({
      workingQuery: this.props.location.query
    })
  }
  render() {
    const {
      state: {
        busy,
        results,
        error,
        fieldErrors,
        endReached,
        workingQuery
      },
      props: {
        id,
        className,
        filterControls,
        renderResult,
        location: {
          query: urlQuery
        }
      }
    } = this
    return (
      <div id={id} className={`search ${className}`.trim()}>
        {React.cloneElement(filterControls, {
          filterState: workingQuery,
          showApplyButton: useManualApply,
          busy,
          error,
          fieldErrors,
          onFilterChange: this._updateWorkingQuery,
          onApply: this._onApply,
          onRevert: this._onRevert
        })}
        <div className='results'>
          {_.map(results, (result, index) =>
            React.cloneElement(renderResult(result), {
              key: index,
              query: urlQuery
            }))
          }
          {(endReached) ? (
            (!results.length) ? (
              <ScrollCaboose visibilityListener={this._scrollCabooseListener}>
                no results
              </ScrollCaboose>
            ) : null
          ) : (
            <ScrollCaboose visibilityListener={this._scrollCabooseListener}>
              <BusyIndicator/>
              loading more
            </ScrollCaboose>
          )}
        </div>
      </div>
    )
  }
}

module.exports = GenericSearch
